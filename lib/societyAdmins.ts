import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Active society admins and anyone who holds the admin office role. */
export async function societyAdminUserIds(admin: SupabaseClient) {
  const ids = new Set<string>();
  const [{ data: active }, { data: held }] = await Promise.all([
    admin.from("profiles").select("user_id").eq("role", "admin"),
    admin.from("person_roles").select("user_id").eq("role", "admin"),
  ]);
  for (const row of active ?? []) {
    if (row.user_id) ids.add(row.user_id);
  }
  for (const row of held ?? []) {
    if (row.user_id) ids.add(row.user_id);
  }
  return [...ids];
}
