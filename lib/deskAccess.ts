import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/admin";
import { FEATURE_CATALOG, loadEnabledFeatures } from "@/lib/features";
import { createAdminClient } from "@/utils/supabase/admin";

export type DeskAccess = "none" | "view" | "manage";

const RESIDENTS = new Set(["owner", "co_owner", "tenant"]);
const COMMUNITY = new Set([
  "owner",
  "co_owner",
  "tenant",
  "committee",
  "facility",
  "staff",
  "security",
  "builder",
]);

export function fallbackDeskAccess(role: string, key: string): DeskAccess {
  if (role === "admin") return "manage";
  if (key === "gate") return role === "security" ? "manage" : "none";
  if (key === "maintenance") return role === "facility" || role === "staff" ? "manage" : "none";
  if (key === "committee") return role === "committee" ? "manage" : "none";
  if (!COMMUNITY.has(role) && !RESIDENTS.has(role)) return "none";
  if (key === "documents") {
    if (role === "owner" || role === "co_owner") return "manage";
    if (role === "tenant") return "view";
    return "none";
  }
  if (FEATURE_CATALOG.some((item) => item.key === key)) return "manage";
  return "none";
}

async function grantsFor(role: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("role_permissions")
      .select("feature_key, access")
      .eq("role", role);
    if (error || !data) return new Map<string, DeskAccess>();
    return new Map(
      data.map((row) => [String(row.feature_key), row.access as DeskAccess]),
    );
  } catch {
    return new Map<string, DeskAccess>();
  }
}

export async function resolveDeskAccess(
  role: string,
  user: User | null,
  key: string,
): Promise<DeskAccess> {
  const enabled = await loadEnabledFeatures();
  if (!enabled.includes(key)) return "none";
  if (user && isSuperAdmin(user)) return "manage";
  const grants = await grantsFor(role);
  const saved = grants.get(key);
  if (saved === "none" || saved === "view" || saved === "manage") return saved;
  return fallbackDeskAccess(role, key);
}

export async function visibleDeskKeys(role: string, user: User | null) {
  const enabled = await loadEnabledFeatures();
  if (user && isSuperAdmin(user)) return enabled;
  const grants = await grantsFor(role);
  return enabled.filter((key) => {
    const saved = grants.get(key);
    const access = saved === "none" || saved === "view" || saved === "manage"
      ? saved
      : fallbackDeskAccess(role, key);
    return access !== "none";
  });
}

export async function requireDeskManage(role: string, user: User | null, key: string) {
  const access = await resolveDeskAccess(role, user, key);
  if (access !== "manage") {
    throw new Error("You can look at this. You cannot change it.");
  }
}
