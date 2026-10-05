import "server-only";

import { isSuperAdmin } from "@/lib/admin";
import { isSocietyPerson, loadSocietyPeopleIndex } from "@/lib/societyPeople";
import { createAdminClient } from "@/utils/supabase/admin";

export type SignInPerson = {
  userId: string
  role: string
  displayName: string
  email: string
  locked: boolean
  flatNumber: string | null
};

export async function loadSignInPeople(): Promise<SignInPerson[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, usersPage, index] = await Promise.all([
    admin.from("profiles").select("user_id, role, flat_id, display_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    loadSocietyPeopleIndex(admin),
  ]);

  const emails: Record<string, string> = {};
  const superAdmins: Record<string, boolean> = {};
  for (const account of usersPage.data?.users ?? []) {
    if (account.email) emails[account.id] = account.email;
    superAdmins[account.id] = isSuperAdmin(account);
  }

  const flatIds = [
    ...new Set(
      (profiles ?? [])
        .map((row) => row.flat_id as number | null)
        .filter((id): id is number => id != null),
    ),
  ];
  const flatMap: Record<number, string> = {};
  if (flatIds.length) {
    const { data: flats } = await admin.from("flats").select("id, flat_number").in("id", flatIds);
    for (const flat of flats ?? []) flatMap[flat.id] = flat.flat_number;
  }

  return (profiles ?? [])
    .map((row) => {
      const email = emails[row.user_id] || "";
      const locked = Boolean(superAdmins[row.user_id]);
      const flatNumber = row.flat_id ? flatMap[row.flat_id] || null : null;
      return {
        userId: row.user_id as string,
        role: String(row.role || "visitor"),
        displayName: (row.display_name as string | null) || "",
        email,
        locked,
        flatNumber,
      };
    })
    .filter((person) => isSocietyPerson({ ...person, index }));
}
