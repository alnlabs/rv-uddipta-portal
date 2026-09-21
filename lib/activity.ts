import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export type ActivityVisibility = "public" | "community";

export type ActivityInput = {
  actorUserId: string | null
  flatId?: number | null
  kind: string
  title: string
  body?: string | null
  payload?: Record<string, unknown>
  visibility?: ActivityVisibility
  href?: string | null
  /** Who gets a notification inbox row */
  notify?: "all_profiles" | "community" | "flat_and_admins" | "none"
};

export async function publishActivity(input: ActivityInput) {
  const admin = createAdminClient();
  const visibility = input.visibility ?? "community";

  const { data: event, error } = await admin
    .from("activity_events")
    .insert({
      actor_user_id: input.actorUserId,
      flat_id: input.flatId ?? null,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      payload: input.payload ?? {},
      visibility,
    })
    .select("id")
    .single();

  if (error || !event) {
    console.warn("activity insert failed", error?.message);
    return null;
  }

  const mode = input.notify ?? (visibility === "public" ? "all_profiles" : "community");
  if (mode === "none") return event.id;

  let recipients: { user_id: string }[] = [];

  if (mode === "all_profiles") {
    const { data } = await admin.from("profiles").select("user_id");
    recipients = data ?? [];
  } else if (mode === "community") {
    const { data } = await admin
      .from("profiles")
      .select("user_id")
      .in("role", ["admin", "builder", "owner", "co_owner", "tenant"]);
    recipients = data ?? [];
  } else if (mode === "flat_and_admins") {
    const { data: flatPeople } = input.flatId
      ? await admin
          .from("profiles")
          .select("user_id")
          .eq("flat_id", input.flatId)
      : { data: [] as { user_id: string }[] };
    const { data: admins } = await admin
      .from("profiles")
      .select("user_id")
      .eq("role", "admin");
    const seen = new Set<string>();
    recipients = [...(flatPeople ?? []), ...(admins ?? [])].filter((row) => {
      if (seen.has(row.user_id)) return false;
      seen.add(row.user_id);
      return true;
    });
  }

  const rows = recipients
    .filter((row) => row.user_id !== input.actorUserId)
    .map((row) => ({
      user_id: row.user_id,
      activity_id: event.id,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    }));

  if (rows.length) {
    const { error: notifyError } = await admin.from("notifications").insert(rows);
    if (notifyError) console.warn("notify fanout failed", notifyError.message);
  }

  return event.id;
}
