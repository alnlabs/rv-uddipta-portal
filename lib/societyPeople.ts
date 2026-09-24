import "server-only";

import { normalizeEmail } from "@/lib/email";
import type { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type BrochureOwner = {
  flatNumber: string
  ownerName: string
  email: string | null
  linked: boolean
};

export type SocietyPeopleIndex = {
  knownUserIds: Set<string>
  knownEmails: Set<string>
  unsignedOwners: BrochureOwner[]
};

export async function loadSocietyPeopleIndex(
  admin: AdminClient,
): Promise<SocietyPeopleIndex> {
  const knownUserIds = new Set<string>();
  const knownEmails = new Set<string>();

  const withEmail = await admin
    .from("flats")
    .select("flat_number, owner_name, email, user_id")
    .not("owner_name", "is", null);
  const flats = withEmail.error
    ? await admin
        .from("flats")
        .select("flat_number, owner_name, user_id")
        .not("owner_name", "is", null)
    : withEmail;

  const { data: requests } = await admin
    .from("registration_requests")
    .select("user_id, email, flat_number, owner_name, status");

  const unsignedOwners: BrochureOwner[] = [];
  for (const flat of flats.data ?? []) {
    if (flat.user_id) knownUserIds.add(String(flat.user_id));
    const email =
      "email" in flat ? normalizeEmail(String(flat.email || "")) : null;
    if (email) knownEmails.add(email);
    if (!flat.user_id && flat.owner_name) {
      unsignedOwners.push({
        flatNumber: String(flat.flat_number),
        ownerName: String(flat.owner_name),
        email,
        linked: false,
      });
    }
  }

  for (const request of requests ?? []) {
    if (request.user_id) knownUserIds.add(String(request.user_id));
    const email = normalizeEmail(String(request.email || ""));
    if (email) knownEmails.add(email);
  }

  unsignedOwners.sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));

  return { knownUserIds, knownEmails, unsignedOwners };
}

export function isSocietyPerson(input: {
  userId: string
  email: string | null
  role: string
  locked: boolean
  index: SocietyPeopleIndex
}) {
  if (input.locked) return true;
  if (input.role && input.role !== "visitor") return true;
  if (input.index.knownUserIds.has(input.userId)) return true;
  const email = normalizeEmail(input.email);
  if (email && input.index.knownEmails.has(email)) return true;
  return false;
}
