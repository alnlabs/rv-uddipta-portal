"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { publishActivity } from "@/lib/activity";
import { canEditBuilder, ensureProfile } from "@/lib/roles";
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
