import "server-only";

import { roleLabel, roleNeedsHome } from "@/lib/roleLabels";
import { createAdminClient } from "@/utils/supabase/admin";

export type HeldRole = {
  role: string
  flatNumber: string | null
  label: string
};

export async function loadHeldRoles(userId: string): Promise<HeldRole[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("person_roles")
      .select("role, flat_id")
      .eq("user_id", userId);
    if (error || !data?.length) return [];
    const flatIds = [...new Set(data.map((row) => row.flat_id).filter((id): id is number => id != null))];
    const numbers = new Map<number, string>();
    if (flatIds.length) {
      const { data: flats } = await admin.from("flats").select("id, flat_number").in("id", flatIds);
      for (const flat of flats ?? []) numbers.set(flat.id as number, String(flat.flat_number));
    }
    return data
      .map((row) => {
        const role = String(row.role);
        const flatNumber = row.flat_id ? numbers.get(row.flat_id as number) ?? null : null;
        const name = roleLabel(role);
        return {
          role,
          flatNumber,
          label: flatNumber && roleNeedsHome(role) ? `${name} · ${flatNumber}` : name,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

export function homeForRole(role: string) {
  if (role === "admin") return "/account";
  if (role === "builder") return "/account/builder";
  if (role === "security") return "/gate";
  if (role === "facility") return "/account/jobs";
  if (role === "staff") return "/work";
  if (role === "committee") return "/committee";
  return "/";
}
