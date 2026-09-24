import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleAssignForm } from "@/components/RoleAssignForm";
import { RolePersonEditor } from "@/components/RolePersonEditor";
import { isSuperAdmin } from "@/lib/admin";
import { ROLE_GUIDE, roleLabel } from "@/lib/roleLabels";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import {
  isSocietyPerson,
  loadSocietyPeopleIndex,
} from "@/lib/societyPeople";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function AdminRolesPage() {
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

  const roleCounts = new Map<string, number>();
  for (const person of people) {
    roleCounts.set(person.role, (roleCounts.get(person.role) ?? 0) + 1);
  }

  return (
    <section>
      <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
        Administration
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-[#14241c]">
        People & access
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
        Only people already registered in the portal, or already stored as
        owners / registration requests. Random Google sign-ins are ignored. To
        add a name to a flat without a login, use{" "}
        <Link href="/account/owners" className="font-semibold text-[#2f5a48]">
          Owners
        </Link>
        .
      </p>
      <Link
        href="/account"
        className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#2f5a48]"
      >
        ← Admin home
      </Link>

      <RoleAssignForm
        candidates={people
          .filter((person) => !person.locked)
          .map((person) => ({
            userId: person.userId,
            label:
              person.displayName ||
              person.email ||
              person.userId.slice(0, 8),
            flatNumber: person.flatNumber,
          }))}
      />

      <div className="mt-6 rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]">
        <h2 className="text-sm font-semibold text-[#14241c]">What each access means</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {ROLE_GUIDE.map((item) => (
            <div key={item.value}>
              <dt className="text-sm font-semibold text-[#14241c]">{item.label}</dt>
              <dd className="mt-0.5 text-sm text-[#3d5247]">{item.help}</dd>
            </div>
          ))}
        </dl>
      </div>

      {people.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {[...roleCounts.entries()]
            .sort(([a], [b]) => roleLabel(a).localeCompare(roleLabel(b)))
            .map(([role, count]) => (
              <li
                key={role}
                className="rounded-full bg-[#fffcf5] px-3 py-1 text-xs font-semibold text-[#1b3a2f] ring-1 ring-[rgba(27,58,47,0.12)]"
              >
                {count} {roleLabel(role)}
                {count === 1 ? "" : "s"}
              </li>
            ))}
        </ul>
      ) : null}

      <h2 className="mt-8 text-lg font-semibold text-[#14241c]">
        In the portal
      </h2>
      {people.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[#fffcf5] p-4 text-sm text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.12)]">
          No registered portal users or matching owner records have signed in
          yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {people.map((person) => (
            <RolePersonEditor key={person.userId} person={person} />
          ))}
        </ul>
      )}

      {unsignedOwners.length ? (
        <div className="mt-8 rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]">
          <h2 className="text-lg font-semibold text-[#14241c]">
            In the database, not signed in
          </h2>
          <p className="mt-1 text-sm text-[#3d5247]">
            {unsignedOwners.length} brochure owner
            {unsignedOwners.length === 1 ? "" : "s"} have no Google login yet.
            They appear here for reference. Assign access only after they
            register.
          </p>
          <ul className="mt-3 divide-y divide-[rgba(27,58,47,0.08)]">
            {unsignedOwners.slice(0, 12).map((owner) => (
              <li
                key={owner.flatNumber}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm"
              >
                <span className="font-semibold text-[#14241c]">
                  {owner.flatNumber}
                </span>
                <span className="text-[#3d5247]">{owner.ownerName}</span>
              </li>
            ))}
          </ul>
          {unsignedOwners.length > 12 ? (
            <Link
              href="/account/owners"
              className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#2f5a48]"
            >
              See all on Owners
            </Link>
          ) : (
            <Link
              href="/account/owners"
              className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#2f5a48]"
            >
              Open Owners
            </Link>
          )}
        </div>
      ) : null}
    </section>
  );
}
