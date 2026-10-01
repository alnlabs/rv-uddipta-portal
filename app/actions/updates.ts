"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { publishActivity } from "@/lib/activity";
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
    const body = String(formData.get("body") || "").trim();
    if (body.length < 2) return { ok: false, message: "Write a few words first." };

    const { error } = await admin.from("member_posts").insert({
      author_user_id: user.id,
      flat_id: profile.flatId,
      flat_number: flatNumber,
      author_name: name,
      body,
    });
    if (error) return { ok: false, message: "Could not post. Try again." };

    await publishActivity({
      actorUserId: user.id,
      flatId: profile.flatId,
      kind: "member_post",
      title: flatNumber ? `${name} · ${flatNumber}` : name,
      body,
      visibility: "community",
      href: "/feed",
      notify: "community",
    });

    revalidatePath("/feed");
    revalidatePath("/notifications");
    return { ok: true, message: "Posted." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not post.",
    };
  }
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
      href: "/notifications",
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
