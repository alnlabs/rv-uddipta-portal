import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleAssignForm } from "@/components/RoleAssignForm";
import { RolePersonEditor } from "@/components/RolePersonEditor";
import { isSuperAdmin } from "@/lib/admin";
import { accessSummary } from "@/lib/roleLabels";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import {
  isSocietyPerson,
  loadSocietyPeopleIndex,
} from "@/lib/societyPeople";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ flat?: string; as?: string; person?: string }>
}) {
  const params = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");

  const admin = createAdminClient();
  const [{ data: profiles }, usersPage, index] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, role, flat_id, display_name, updated_at")
      .order("updated_at", { ascending: false }),
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
    const { data: flats } = await admin
      .from("flats")
      .select("id, flat_number")
      .in("id", flatIds);
    for (const flat of flats ?? []) flatMap[flat.id] = flat.flat_number;
  }

  const people = (profiles ?? [])
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
    .filter((person) => isSocietyPerson({ ...person, index }))
    .sort((a, b) => {
      if (a.locked !== b.locked) return a.locked ? -1 : 1;
      const nameA = (a.displayName || a.email).toLowerCase();
      const nameB = (b.displayName || b.email).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  const unsignedOwners = index.unsignedOwners.filter(
    (owner) =>
      !people.some(
        (person) =>
          person.flatNumber === owner.flatNumber ||
          (owner.email && person.email === owner.email),
      ),
  );

  const openPerson = people.find((person) => person.userId === params.person) ?? null;

  return (
    <section className="max-w-2xl">
      <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-tight text-[#14241c]">
        Who can sign in
      </h1>
      <p className="mt-2 text-lg text-[#3d5247]">Owner, family, or admin.</p>

      <RoleAssignForm
        defaultFlat={params.flat || ""}
        defaultRole={params.as === "family" ? "family" : "owner"}
        candidates={people
          .filter((person) => !person.locked)
          .map((person) => ({
            userId: person.userId,
            label: person.displayName || person.email || "Signed-in person",
            flatNumber: person.flatNumber,
          }))}
      />

      <h2 className="mt-8 text-xl font-semibold text-[#14241c]">People</h2>
      {people.length === 0 ? (
        <p className="mt-3 text-base text-[#3d5247]">No one has signed in yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[rgba(27,58,47,0.1)]">
          {people.map((person) => (
            <li key={person.userId} className="py-3">
              <p className="text-lg font-semibold text-[#14241c]">
                {person.displayName || person.email || "Signed-in person"}
              </p>
              <p className="text-base text-[#3d5247]">
                {person.locked ? "Cannot be removed. No flat." : accessSummary(person)}
              </p>
              {person.locked ? null : (
                <Link
                  href={`/account/roles?person=${person.userId}`}
                  className="mt-1 inline-flex min-h-11 items-center text-base font-semibold text-[#1b3a2f]"
                >
                  {openPerson?.userId === person.userId ? "Editing" : "Change"}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {openPerson && !openPerson.locked ? (
        <div className="mt-4">
          <RolePersonEditor person={openPerson} />
        </div>
      ) : null}

      {unsignedOwners.length ? (
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-[#14241c]">Not signed in yet</h2>
          <p className="mt-1 text-base text-[#3d5247]">
            These owners are on a flat, but they have not signed in.
          </p>
          <ul className="mt-3 divide-y divide-[rgba(27,58,47,0.1)]">
            {unsignedOwners.slice(0, 8).map((owner) => (
              <li key={owner.flatNumber} className="flex justify-between gap-3 py-2 text-base">
                <span className="font-semibold text-[#14241c]">{owner.flatNumber}</span>
                <span className="text-[#3d5247]">{owner.ownerName}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/account/owners"
            className="mt-2 inline-flex min-h-11 items-center text-base font-semibold text-[#1b3a2f]"
          >
            Open Flats
          </Link>
        </div>
      ) : null}
    </section>
  );
}
