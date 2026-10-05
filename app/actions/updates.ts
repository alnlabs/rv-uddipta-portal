"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { publishActivity } from "@/lib/activity";
import { savePostPhoto } from "@/lib/postPhoto";
import { postKind } from "@/lib/postKinds";
import { canManageAdmin, ensureProfile, isCommunityRole } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type UpdateState = { ok: boolean; message: string };

async function memberContext() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const profile = await ensureProfile(user, supabase);
  if (!isCommunityRole(profile.role)) {
    throw new Error("You can do this after your flat is approved.");
  }
  const admin = createAdminClient();
  let flatNumber: string | null = null;
  if (profile.flatId) {
    const { data: flat } = await admin
      .from("flats")
      .select("flat_number")
      .eq("id", profile.flatId)
      .maybeSingle();
    flatNumber = flat?.flat_number ?? null;
  }
  const name = profile.displayName || user.email || "A member";
  return { user, profile, admin, flatNumber, name };
}

export async function postUpdate(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  try {
    const { user, profile, admin, flatNumber, name } = await memberContext();
    const kind = postKind(String(formData.get("kind") || "update"));
    if (!kind) return { ok: false, message: "Choose a type." };
    if (kind.audience === "admin") return sendNote(_prev, formData);

    const body = String(formData.get("body") || "").trim();
    if (body.length < 2) return { ok: false, message: "Write a few words first." };

    const choices =
      kind.value === "poll" ? pollChoices(formData) : { ok: true as const, labels: [] as string[] };
    if (!choices.ok) return { ok: false, message: choices.message };

    let startsOn: string | null = null;
    if (kind.value === "event") {
      startsOn = String(formData.get("startsOn") || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) {
        return { ok: false, message: "Choose the date." };
      }
    }

    const photo = formData.get("photo");
    const hasPhoto = photo instanceof File && photo.size > 0;
    if (hasPhoto && kind.value !== "sale" && kind.value !== "lost" && kind.value !== "event") {
      return { ok: false, message: "A photo fits a sale, a lost item, or an event." };
    }

    const { data: created, error } = await admin
      .from("member_posts")
      .insert({
        author_user_id: user.id,
        flat_id: profile.flatId,
        flat_number: flatNumber,
        author_name: name,
        kind: kind.value,
        body,
        starts_on: startsOn,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, message: "Could not post. Try again." };

    if (hasPhoto && photo instanceof File) {
      try {
        const imageUrl = await savePostPhoto(created.id, photo);
        const { error: photoError } = await admin
          .from("member_posts")
          .update({ image_url: imageUrl })
          .eq("id", created.id);
        if (photoError) throw new Error(photoError.message);
      } catch (error) {
        await admin.from("member_posts").delete().eq("id", created.id);
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Could not save the photo.",
        };
      }
    }

    if (kind.value === "poll") {
      const { error: optionError } = await admin.from("member_poll_options").insert(
        choices.labels.map((label, position) => ({
          post_id: created.id,
          label,
          position,
        })),
      );
      if (optionError) {
        await admin.from("member_posts").delete().eq("id", created.id);
        return { ok: false, message: "Could not post the poll. Try again." };
      }
    }

    const who = flatNumber ? `${name} · ${flatNumber}` : name;
    await publishActivity({
      actorUserId: user.id,
      flatId: profile.flatId,
      kind: "member_post",
      title: `${kind.label} · ${who}`,
      body,
      visibility: "community",
      href: "/feed",
      notify: "community",
    });

    revalidatePath("/feed");
    revalidatePath("/notifications");
    return { ok: true, message: kind.done };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not post.",
    };
  }
}

function pollChoices(formData: FormData): { ok: true; labels: string[] } | { ok: false; message: string } {
  const labels = formData
    .getAll("option")
    .map((value) => String(value).trim())
    .filter((label) => label.length > 0);
  if (labels.length < 2) return { ok: false, message: "Add at least two choices." };
  if (labels.length > 6) return { ok: false, message: "A poll can have up to six choices." };
  if (labels.some((label) => label.length > 80)) {
    return { ok: false, message: "Keep each choice under 80 characters." };
  }
  const seen = new Set(labels.map((label) => label.toLowerCase()));
  if (seen.size !== labels.length) return { ok: false, message: "Each choice needs to be different." };
  return { ok: true, labels };
}

export async function voteOnPoll(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  try {
    const { user, admin } = await memberContext();
    const postId = Number(formData.get("postId"));
    const optionId = Number(formData.get("optionId"));
    if (!postId || !optionId) return { ok: false, message: "That choice is missing." };

    const { data: option } = await admin
      .from("member_poll_options")
      .select("id, post_id")
      .eq("id", optionId)
      .maybeSingle();
    if (!option || option.post_id !== postId) return { ok: false, message: "That choice is gone." };

    const { data: post } = await admin
      .from("member_posts")
      .select("kind, closed_at")
      .eq("id", postId)
      .maybeSingle();
    if (post?.kind !== "poll") return { ok: false, message: "That is not a poll." };
    if (post.closed_at) return { ok: false, message: "Voting is closed." };

    const { error } = await admin.from("member_poll_votes").upsert(
      {
        post_id: postId,
        option_id: optionId,
        user_id: user.id,
      },
      { onConflict: "post_id,user_id" },
    );
    if (error) return { ok: false, message: "Could not save your vote. Try again." };

    revalidatePath("/feed");
    return { ok: true, message: "Vote saved." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save your vote.",
    };
  }
}

export async function reactToPost(formData: FormData) {
  const { user, admin } = await memberContext();
  const postId = Number(formData.get("postId"));
  const kind = String(formData.get("kind") || "");
  if (!postId || (kind !== "helpful" && kind !== "thanks")) return;

  const { data: existing } = await admin
    .from("member_post_reactions")
    .select("kind")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.kind === kind) {
    await admin.from("member_post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
  } else if (existing) {
    await admin
      .from("member_post_reactions")
      .update({ kind })
      .eq("post_id", postId)
      .eq("user_id", user.id);
  } else {
    await admin.from("member_post_reactions").insert({
      post_id: postId,
      user_id: user.id,
      kind,
    });
  }
  revalidatePath("/feed");
}

export async function rsvpEvent(formData: FormData) {
  const { user, admin } = await memberContext();
  const postId = Number(formData.get("postId"));
  if (!postId) return;
  const { data: post } = await admin
    .from("member_posts")
    .select("kind")
    .eq("id", postId)
    .maybeSingle();
  if (post?.kind !== "event") return;

  const { data: existing } = await admin
    .from("member_event_rsvps")
    .select("user_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await admin.from("member_event_rsvps").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await admin.from("member_event_rsvps").insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath("/feed");
}

export async function closePoll(formData: FormData) {
  const { user, profile, admin } = await memberContext();
  const postId = Number(formData.get("postId"));
  if (!postId) return;
  const { data: post } = await admin
    .from("member_posts")
    .select("author_user_id, kind, closed_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.kind !== "poll" || post.closed_at) return;
  const allowed = post.author_user_id === user.id || canManageAdmin(profile.role, user);
  if (!allowed) return;
  await admin.from("member_posts").update({ closed_at: new Date().toISOString() }).eq("id", postId);
  revalidatePath("/feed");
}

export async function markSold(formData: FormData) {
  const { user, profile, admin } = await memberContext();
  const postId = Number(formData.get("postId"));
  if (!postId) return;
  const { data: post } = await admin
    .from("member_posts")
    .select("author_user_id, kind, sold_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.kind !== "sale" || post.sold_at) return;
  const allowed = post.author_user_id === user.id || canManageAdmin(profile.role, user);
  if (!allowed) return;
  await admin.from("member_posts").update({ sold_at: new Date().toISOString() }).eq("id", postId);
  revalidatePath("/feed");
}

export async function replyToPost(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  try {
    const { user, admin, flatNumber, name } = await memberContext();
    const postId = Number(formData.get("postId"));
    const body = String(formData.get("body") || "").trim();
    if (!postId) return { ok: false, message: "That post is missing." };
    if (body.length < 1) return { ok: false, message: "Write a reply first." };

    const { data: post } = await admin
      .from("member_posts")
      .select("id, author_user_id")
      .eq("id", postId)
      .maybeSingle();
    if (!post) return { ok: false, message: "That post is gone." };

    const { error } = await admin.from("member_replies").insert({
      post_id: postId,
      author_user_id: user.id,
      author_name: name,
      flat_number: flatNumber,
      body,
    });
    if (error) return { ok: false, message: "Could not reply. Try again." };

    if (post.author_user_id && post.author_user_id !== user.id) {
      await admin.from("notifications").insert({
        user_id: post.author_user_id,
        kind: "reply",
        title: `${name} replied`,
        body,
        href: "/feed",
      });
    }

    revalidatePath("/feed");
    revalidatePath("/notifications");
    return { ok: true, message: "Reply sent." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reply.",
    };
  }
}

export async function deletePost(formData: FormData) {
  const { user, profile, admin } = await memberContext();
  const postId = Number(formData.get("postId"));
  if (!postId) return;
  const { data: post } = await admin
    .from("member_posts")
    .select("author_user_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return;
  const adminUser = canManageAdmin(profile.role, user);
  if (post.author_user_id !== user.id && !adminUser) return;
  await admin.from("member_posts").delete().eq("id", postId);
  revalidatePath("/feed");
}

export async function deleteReply(formData: FormData) {
  const { user, profile, admin } = await memberContext();
  const replyId = Number(formData.get("replyId"));
  if (!replyId) return;
  const { data: reply } = await admin
    .from("member_replies")
    .select("author_user_id")
    .eq("id", replyId)
    .maybeSingle();
  if (!reply) return;
  const adminUser = canManageAdmin(profile.role, user);
  if (reply.author_user_id !== user.id && !adminUser) return;
  await admin.from("member_replies").delete().eq("id", replyId);
  revalidatePath("/feed");
}

export async function sendNote(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  try {
    const { user, profile, admin, flatNumber, name } = await memberContext();
    const kind = String(formData.get("kind") || "");
    const body = String(formData.get("body") || "").trim();
    if (kind !== "request" && kind !== "feedback") {
      return { ok: false, message: "Choose a request or feedback." };
    }
    if (body.length < 2) return { ok: false, message: "Write a few words first." };

    const { error } = await admin.from("member_notes").insert({
      author_user_id: user.id,
      flat_id: profile.flatId,
      flat_number: flatNumber,
      author_name: name,
      kind,
      body,
    });
    if (error) return { ok: false, message: "Could not send that. Try again." };

    const { data: admins } = await admin
      .from("profiles")
      .select("user_id")
      .eq("role", "admin");
    const title = kind === "request" ? "New request" : "New feedback";
    const rows = (admins ?? [])
      .filter((row) => row.user_id !== user.id)
      .map((row) => ({
        user_id: row.user_id as string,
        kind,
        title: flatNumber ? `${title} · ${flatNumber}` : title,
        body,
        href: "/account/requests",
      }));
    if (rows.length) await admin.from("notifications").insert(rows);

    revalidatePath("/account/requests");
    revalidatePath("/notifications");
    return {
      ok: true,
      message: kind === "request" ? "Request sent to the admin." : "Feedback sent to the admin.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not send that.",
    };
  }
}

export async function replyToNote(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) throw new Error("Not allowed");

  const noteId = Number(formData.get("noteId"));
  const reply = String(formData.get("reply") || "").trim();
  if (!noteId || reply.length < 1) throw new Error("Write a reply first.");

  const admin = createAdminClient();
  const { data: note } = await admin
    .from("member_notes")
    .select("author_user_id, kind, flat_number")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) throw new Error("That note is gone.");

  const { error } = await admin
    .from("member_notes")
    .update({ admin_reply: reply, status: "done" })
    .eq("id", noteId);
  if (error) throw new Error(error.message);

  if (note.author_user_id) {
    await admin.from("notifications").insert({
      user_id: note.author_user_id,
      kind: "note_reply",
      title: note.kind === "request" ? "Reply to your request" : "Reply to your feedback",
      body: reply,
      href: "/messages",
    });
  }

  revalidatePath("/account/requests");
  revalidatePath("/notifications");
}

export async function markNoteRead(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) throw new Error("Not allowed");

  const noteId = Number(formData.get("noteId"));
  if (!noteId) return;
  const admin = createAdminClient();
  await admin.from("member_notes").update({ status: "read" }).eq("id", noteId);
  revalidatePath("/account/requests");
}
