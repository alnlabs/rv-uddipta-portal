import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export async function writeAudit(input: {
  actorUserId?: string | null
  actorName?: string | null
  action: string
  subject?: string
  detail?: string
}) {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_user_id: input.actorUserId ?? null,
      actor_name: input.actorName || "",
      action: input.action,
      subject: input.subject || "",
      detail: input.detail || "",
    });
  } catch {
    // The record is optional until the community tables exist.
  }
}
