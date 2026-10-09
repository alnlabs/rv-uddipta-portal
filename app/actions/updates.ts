"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { postAnnouncement } from "@/app/actions/activity";
import { publishActivity } from "@/lib/activity";
import { requireDeskManage } from "@/lib/deskAccess";
import { disabledCommunityKinds, disabledRequestKinds } from "@/lib/features";
import { saveNotePhoto, savePostPhoto } from "@/lib/postPhoto";
import {
  NOTICE_KINDS,
  QUOTE_MAX,
  allowsPhoto,
  emergencyTopic,
  postKind,
} from "@/lib/postKinds";
import { pushUsers } from "@/lib/push";
import { visibleText } from "@/lib/richText";
import { reachCommunity } from "@/lib/reach";
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

export async function postFeedItem(
  prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  const kind = String(formData.get("kind") || "");
  if (NOTICE_KINDS.some((item) => item.value === kind)) {
    try {
      await postAnnouncement(formData);
      return { ok: true, message: "Posted." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Could not post.",
      };
    }
  }
  return postUpdate(prev, formData);
}

export async function postUpdate(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  try {
    const { user, profile, admin, flatNumber, name } = await memberContext();
    const kind = postKind(String(formData.get("kind") || "update"));
    if (!kind) return { ok: false, message: "Choose a type." };
    if ((await disabledCommunityKinds()).includes(kind.value)) {
      return { ok: false, message: "That type is turned off." };
    }
    if (kind.audience === "admin") {
      await requireDeskManage(profile.role, user, "requests");
      return sendNote(_prev, formData);
    }
    await requireDeskManage(
      profile.role,
      user,
      kind.value === "event" || kind.value === "celebration"
        ? "events"
        : kind.value === "poll"
          ? "polls"
          : "feed",
    );

    const body = String(formData.get("body") || "").trim();
    const words = visibleText(body);
    if (words.length < 2) return { ok: false, message: "Write the description before posting." };
    if (kind.value === "quote" && words.length > QUOTE_MAX) {
      return { ok: false, message: `Keep a quote under ${QUOTE_MAX} characters.` };
    }

    const choices =
      kind.value === "poll" ? pollChoices(formData) : { ok: true as const, labels: [] as string[] };
    if (!choices.ok) return { ok: false, message: choices.message };

    let topic: string | null = null;
    if (kind.value === "emergency") {
      const picked = emergencyTopic(String(formData.get("topic") || ""));
      if (!picked) return { ok: false, message: "Choose the kind of emergency." };
      topic = picked.value;
    }

    let startsOn: string | null = null;
    if (kind.value === "event" || kind.value === "celebration") {
      startsOn = String(formData.get("startsOn") || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) {
        return { ok: false, message: "Choose the date for this post." };
      }
    }

    const photo = formData.get("photo");
    const hasPhoto = photo instanceof File && photo.size > 0;
    if (hasPhoto && !allowsPhoto(kind.value)) {
      return { ok: false, message: "This type does not take a photo." };
    }

    const { data: created, error } = await admin
      .from("member_posts")
      .insert({
        author_user_id: user.id,
        flat_id: profile.flatId,
        flat_number: flatNumber,
        author_name: name,
        kind: kind.value,
        topic,
        body,
        starts_on: startsOn,
        poll_multiple: kind.value === "poll" && formData.get("multiple") === "on",
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
    const topicLabel = topic ? emergencyTopic(topic)?.label : null;
    const title = topicLabel ? `Emergency · ${topicLabel} · ${who}` : `${kind.label} · ${who}`;
    await publishActivity({
      actorUserId: user.id,
      flatId: profile.flatId,
      kind: "member_post",
      title,
      body: words,
      visibility: "community",
      href: "/feed",
      notify: "community",
    });
    if (kind.value === "emergency" && topicLabel) {
      await reachCommunity({
        title,
        body: words || title,
        exceptUserId: user.id,
      }).catch((error: unknown) => {
        console.warn("emergency reach failed", error instanceof Error ? error.message : error);
      });
    }

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
  if (labels.length < 2) return { ok: false, message: "Add at least two poll choices." };
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
    const { user, profile, admin } = await memberContext();
    await requireDeskManage(profile.role, user, "polls");
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
      .select("kind, closed_at, poll_multiple")
      .eq("id", postId)
      .maybeSingle();
    if (post?.kind !== "poll") return { ok: false, message: "That is not a poll." };
    if (post.closed_at) return { ok: false, message: "Voting is closed." };

    if (post.poll_multiple) {
      const { data: existing } = await admin
        .from("member_poll_votes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("option_id", optionId)
        .maybeSingle();
      if (existing) {
        const { error } = await admin.from("member_poll_votes").delete().eq("id", existing.id);
        if (error) return { ok: false, message: "Could not save your vote. Try again." };
      } else {
        const { error } = await admin.from("member_poll_votes").insert({
          post_id: postId,
          option_id: optionId,
          user_id: user.id,
        });
        if (error) return { ok: false, message: "Could not save your vote. Try again." };
      }
    } else {
      await admin.from("member_poll_votes").delete().eq("post_id", postId).eq("user_id", user.id);
      const { error } = await admin.from("member_poll_votes").insert({
        post_id: postId,
        option_id: optionId,
        user_id: user.id,
      });
      if (error) return { ok: false, message: "Could not save your vote. Try again." };
    }

    revalidatePath("/feed");
    revalidatePath("/polls");
    return { ok: true, message: "Vote saved." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save your vote.",
    };
  }
}

export async function reactToPost(formData: FormData) {
  const { user, profile, admin } = await memberContext();
  await requireDeskManage(profile.role, user, "feed");
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
  const { user, profile, admin } = await memberContext();
  await requireDeskManage(profile.role, user, "events");
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
  revalidatePath("/events");
}

export async function submitPollVote(formData: FormData) {
  await voteOnPoll({ ok: false, message: "" }, formData);
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
    const { user, profile, admin, flatNumber, name } = await memberContext();
    await requireDeskManage(profile.role, user, "feed");
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

export async function submitNote(formData: FormData) {
  await sendNote({ ok: false, message: "" }, formData);
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
    if ((await disabledRequestKinds()).includes(kind)) {
      return { ok: false, message: "That is closed right now." };
    }
    if (body.length < 2) return { ok: false, message: "Write a few words first." };

    const { data: note, error } = await admin
      .from("member_notes")
      .insert({
        author_user_id: user.id,
        flat_id: profile.flatId,
        flat_number: flatNumber,
        author_name: name,
        kind,
        body,
      })
      .select("id")
      .single();
    if (error || !note) return { ok: false, message: "Could not send that. Try again." };
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const imageUrl = await saveNotePhoto(note.id as number, photo);
      const { error: photoError } = await admin.from("member_notes").update({ image_url: imageUrl }).eq("id", note.id);
      if (photoError) return { ok: false, message: "The message was sent. The photo needs a database update before it can be kept." };
    }
    await admin.from("note_messages").insert({
      note_id: note.id,
      author_user_id: user.id,
      author_name: name,
      from_office: false,
      body,
    });

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
    revalidatePath("/requests");
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

export async function reopenNote(formData: FormData) {
  const { user, admin } = await memberContext();
  const noteId = Number(formData.get("noteId"));
  if (!noteId) return;
  const { data: note } = await admin
    .from("member_notes")
    .select("id, author_user_id, status")
    .eq("id", noteId)
    .maybeSingle();
  if (!note || note.author_user_id !== user.id) throw new Error("You can reopen your own request.");
  if (note.status !== "done") throw new Error("Only a finished request can be reopened.");
  const { error } = await admin.from("member_notes").update({ status: "new" }).eq("id", noteId);
  if (error) throw new Error("Could not reopen that. Try again.");
  revalidatePath("/requests");
  revalidatePath("/account/requests");
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
    .update({ admin_reply: reply, status: "waiting" })
    .eq("id", noteId);
  if (error) throw new Error(error.message);
  const officeName = profile.displayName || user.email || "Office";
  await admin.from("note_messages").insert({
    note_id: noteId,
    author_user_id: user.id,
    author_name: officeName,
    from_office: true,
    body: reply,
  });

  if (note.author_user_id) {
    const title = note.kind === "request" ? "Reply to your request" : "Reply to your feedback";
    await admin.from("notifications").insert({
      user_id: note.author_user_id,
      kind: "note_reply",
      title,
      body: reply,
      href: "/requests",
    });
    await pushUsers([note.author_user_id], title, reply);
  }

  revalidatePath("/account/requests");
  revalidatePath("/requests");
  revalidatePath("/notifications");
}

export async function answerNote(formData: FormData) {
  const { user, profile, admin, name } = await memberContext();
  const noteId = Number(formData.get("noteId"));
  const body = String(formData.get("body") || "").trim();
  if (!noteId || body.length < 2) throw new Error("Write a few words first.");
  const { data: note } = await admin
    .from("member_notes")
    .select("id, author_user_id, status, flat_number, kind")
    .eq("id", noteId)
    .maybeSingle();
  if (!note || note.author_user_id !== user.id) throw new Error("That is not your message.");
  if (note.status === "done") throw new Error("The office has finished this. Start a new one.");
  const { error } = await admin.from("note_messages").insert({
    note_id: noteId,
    author_user_id: user.id,
    author_name: name,
    from_office: false,
    body,
  });
  if (error) throw new Error(error.message);
  await admin.from("member_notes").update({ status: "in_progress" }).eq("id", noteId);
  const { data: admins } = await admin.from("profiles").select("user_id").eq("role", "admin");
  const title = note.kind === "feedback" ? "Reply on feedback" : "Reply on a request";
  const rows = (admins ?? [])
    .filter((row) => row.user_id !== user.id)
    .map((row) => ({
      user_id: row.user_id as string,
      kind: "note_reply",
      title: note.flat_number ? `${title} · ${note.flat_number}` : title,
      body,
      href: "/account/requests",
    }));
  if (rows.length) await admin.from("notifications").insert(rows);
  revalidatePath("/requests");
  revalidatePath("/account/requests");
  revalidatePath("/notifications");
}

export async function editOwnNote(formData: FormData) {
  const { user, admin } = await memberContext();
  const noteId = Number(formData.get("noteId"));
  const body = String(formData.get("body") || "").trim();
  if (!noteId || body.length < 2) throw new Error("Write a few words first.");
  const { data: note } = await admin
    .from("member_notes")
    .select("id, author_user_id")
    .eq("id", noteId)
    .maybeSingle();
  if (!note || note.author_user_id !== user.id) throw new Error("That is not your message.");
  const { data: office } = await admin
    .from("note_messages")
    .select("id")
    .eq("note_id", noteId)
    .eq("from_office", true)
    .limit(1);
  if (office?.length) throw new Error("The office has already written back. Send another message instead.");
  const { error } = await admin.from("member_notes").update({ body }).eq("id", noteId);
  if (error) throw new Error(error.message);
  const { data: first } = await admin
    .from("note_messages")
    .select("id")
    .eq("note_id", noteId)
    .eq("from_office", false)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (first) await admin.from("note_messages").update({ body }).eq("id", first.id);
  revalidatePath("/requests");
  revalidatePath("/account/requests");
}

export async function deleteNote(formData: FormData) {
  const { user, profile, admin } = await memberContext();
  const noteId = Number(formData.get("noteId"));
  if (!noteId) return;
  const { data: note } = await admin
    .from("member_notes")
    .select("id, author_user_id")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) return;
  const officeUser = canManageAdmin(profile.role, user);
  if (!officeUser && note.author_user_id !== user.id) throw new Error("That is not your message.");
  if (!officeUser) {
    const { data: office } = await admin
      .from("note_messages")
      .select("id")
      .eq("note_id", noteId)
      .eq("from_office", true)
      .limit(1);
    if (office?.length) throw new Error("The office has already written back, so this stays.");
  }
  const { error } = await admin.from("member_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  revalidatePath("/account/requests");
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
  await admin.from("member_notes").update({ status: "waiting" }).eq("id", noteId);
  revalidatePath("/account/requests");
}
