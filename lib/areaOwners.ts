import "server-only";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { canManageAdmin, canRunFacility, type AppRole } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type SocietyArea = {
  areaKey: string
  label: string
  ownerRole: string
  currentOwnerRole: string
  startsAt: string | null
  endsAt: string | null
  summary: string
};

export async function currentAreaOwnerRole(area: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("current_area_owner_role", { p_area: area });
    if (error) return null;
    return typeof data === "string" && data ? data : null;
  } catch {
    return null;
  }
}

/** Admin, facility, or the role currently set as repairs owner (e.g. builder). */
export async function canRunJobs(
  role: AppRole | null | undefined,
  user: User | null,
): Promise<boolean> {
  if (canRunFacility(role, user)) return true;
  if (!role) return false;
  const owner = await currentAreaOwnerRole("repairs");
  return Boolean(owner && role === owner);
}

export function isJobsManagerRole(
  role: AppRole | null | undefined,
  user: User | null,
  repairsOwner: string | null,
) {
  if (canManageAdmin(role, user)) return true;
  if (role === "facility") return true;
  return Boolean(role && repairsOwner && role === repairsOwner);
}

export async function loadSocietyAreas(): Promise<SocietyArea[]> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.rpc("list_society_areas");
    if (error || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map((row) => ({
      areaKey: String(row.areaKey || row.area_key || ""),
      label: String(row.label || ""),
      ownerRole: String(row.ownerRole || row.owner_role || ""),
      currentOwnerRole: String(row.currentOwnerRole || row.current_owner_role || ""),
      startsAt: row.startsAt || row.starts_at ? String(row.startsAt || row.starts_at) : null,
      endsAt: row.endsAt || row.ends_at ? String(row.endsAt || row.ends_at) : null,
      summary: String(row.summary || ""),
    }));
  } catch {
    return [];
  }
}
