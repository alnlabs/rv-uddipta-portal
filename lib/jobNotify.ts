import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { societyAdminUserIds } from "@/lib/societyAdmins";

/** Keep informed: society admins (+ optional extra people) get a job notification. */
export async function notifyJobWatchers(
  admin: SupabaseClient,
  input: {
    title: string
    body: string
    href?: string
    alsoUserIds?: Array<string | null | undefined>
  },
) {
  const ids = new Set(await societyAdminUserIds(admin));
  for (const id of input.alsoUserIds ?? []) {
    if (id) ids.add(id);
  }
  if (!ids.size) return;
  await admin
    .from("notifications")
    .insert(
      [...ids].map((userId) => ({
        user_id: userId,
        kind: "job_update",
        title: input.title,
        body: input.body,
        href: input.href || "/account/jobs",
      })),
    )
    .then(() => undefined, () => undefined);
}
