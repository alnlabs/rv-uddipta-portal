"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { publishActivity } from "@/lib/activity";
import { reachCommunity } from "@/lib/reach";
import { canEditBuilder, canManageAdmin, ensureProfile } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function postBuilderUpdate(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const profile = await ensureProfile(user, supabase);
  if (!canEditBuilder(profile.role, user)) throw new Error("Not allowed");

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (title.length < 3) throw new Error("Title is too short");

  await publishActivity({
    actorUserId: user.id,
    kind: "builder_update",
    title,
    body: body || null,
    visibility: "public",
    href: "/feed",
    notify: "all_profiles",
  });

  revalidatePath("/feed");
  revalidatePath("/notifications");
}

export async function postAnnouncement(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) throw new Error("Not allowed");

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (title.length < 3) throw new Error("Write a title first.");

  const eventId = await publishActivity({
    actorUserId: user.id,
    kind: "announcement",
    title,
    body: body || null,
    visibility: "community",
    href: "/feed",
    notify: "community",
  });

  if (formData.get("pin") === "on" && eventId) {
    const admin = createAdminClient();
    await admin.from("activity_events").update({ pinned: true }).eq("id", eventId);
  }

  await reachCommunity({
    title: `Announcement · ${title}`,
    body: body || title,
    exceptUserId: user.id,
  }).catch((error: unknown) => {
    console.warn("announcement reach failed", error instanceof Error ? error.message : error);
  });

  revalidatePath("/feed");
  revalidatePath("/notifications");
}

export async function pinAnnouncement(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) throw new Error("Not allowed");

  const id = Number(formData.get("id"));
  if (!id) return;
  const pinned = formData.get("pinned") === "true";

  const admin = createAdminClient();
  const { data } = await admin
    .from("activity_events")
    .select("kind")
    .eq("id", id)
    .maybeSingle();
  if (!data || (data.kind !== "announcement" && data.kind !== "builder_update")) return;

  await admin.from("activity_events").update({ pinned }).eq("id", id);
  revalidatePath("/feed");
}

export async function deleteAnnouncement(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) throw new Error("Not allowed");

  const id = Number(formData.get("id"));
  if (!id) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("activity_events")
    .select("kind")
    .eq("id", id)
    .maybeSingle();
  if (!data || (data.kind !== "announcement" && data.kind !== "builder_update")) return;

  await admin.from("activity_events").delete().eq("id", id);
  revalidatePath("/feed");
  revalidatePath("/notifications");
}

export async function markNotificationRead(id: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
}
