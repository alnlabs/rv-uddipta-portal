import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export type LinkedHome = {
  flatId: number | null
  flatNumber: string | null
};

/**
 * One rule for “is a home linked?” across portal pages and mobile APIs.
 * Prefer profiles.flat_id, then home person_roles, then flats.user_id ownership.
 */
export async function resolveLinkedHome(input: {
  readonly userId: string
  readonly flatId: number | null
  readonly healProfile?: boolean
}): Promise<LinkedHome> {
  const admin = createAdminClient();
  let flatId = input.flatId;
  let flatNumber: string | null = null;

  if (flatId) {
    const { data: flat } = await admin
      .from("flats")
      .select("flat_number")
      .eq("id", flatId)
      .maybeSingle();
    flatNumber = flat?.flat_number ? String(flat.flat_number) : null;
    if (flatNumber) return { flatId, flatNumber };
  }

  const { data: held } = await admin
    .from("person_roles")
    .select("role, flat_id")
    .eq("user_id", input.userId);
  const homeHeld = (held ?? []).find(
    (row) =>
      row.flat_id
      && (row.role === "owner" || row.role === "co_owner" || row.role === "tenant"),
  );
  if (homeHeld?.flat_id) {
    flatId = Number(homeHeld.flat_id);
    const { data: flat } = await admin
      .from("flats")
      .select("flat_number")
      .eq("id", flatId)
      .maybeSingle();
    flatNumber = flat?.flat_number ? String(flat.flat_number) : null;
    if (flatId && input.healProfile && !input.flatId) {
      await admin.from("profiles").update({ flat_id: flatId }).eq("user_id", input.userId);
    }
    return { flatId, flatNumber };
  }

  const { data: owned } = await admin
    .from("flats")
    .select("id, flat_number")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (owned?.id) {
    flatId = Number(owned.id);
    flatNumber = owned.flat_number ? String(owned.flat_number) : null;
    if (flatId && input.healProfile && !input.flatId) {
      await admin.from("profiles").update({ flat_id: flatId }).eq("user_id", input.userId);
    }
    return { flatId, flatNumber };
  }

  return { flatId: null, flatNumber: null };
}
