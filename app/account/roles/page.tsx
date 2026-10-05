import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleAssignForm } from "@/components/RoleAssignForm";
import { RolePersonEditor } from "@/components/RolePersonEditor";
import { WorkspaceHeader } from "@/components/form-ui";
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
    <section>
      <WorkspaceHeader title="Who can sign in" lede="Owner, family, or admin." />

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <div className="grid gap-4 xl:sticky xl:top-3">
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

      {openPerson && !openPerson.locked ? (
        <RolePersonEditor key={openPerson.userId} person={openPerson} />
      ) : null}
      </div>

      <div>
      <h2 className="text-lg font-semibold text-[#14241c]">People</h2>
      {people.length === 0 ? (
        <p className="mt-3 text-base text-[#3d5247]">No one has signed in yet.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {people.map((person) => {
            const editing = openPerson?.userId === person.userId;
            const label = person.displayName || person.email || "Signed-in person";
            return (
              <li
                key={person.userId}
                className={`flex min-h-24 flex-col justify-between rounded-[1.25rem] px-3.5 py-3 ring-1 ${
                  editing
                    ? "bg-[#1b3a2f] text-[#e8d5a3] ring-transparent"
                    : "bg-[#fffcf5] text-[#14241c] ring-[rgba(27,58,47,0.1)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`grid size-10 place-items-center rounded-2xl text-sm font-bold ${
                      editing ? "bg-[#c9a45c] text-[#14241c]" : "bg-[#1b3a2f] text-[#e8d5a3]"
                    }`}
                  >
                    {label.slice(0, 1).toUpperCase()}
                  </span>
                  {person.flatNumber ? (
                    <span className="text-lg font-semibold tracking-tight">{person.flatNumber}</span>
                  ) : null}
                </div>
                <div className="mt-3 min-w-0">
                  <p className="truncate text-base font-semibold">{label}</p>
                  <p className={`truncate text-sm ${editing ? "text-[#d8c898]" : "text-[#3d5247]"}`}>
                    {person.locked ? "Cannot be removed. No flat." : accessSummary(person)}
                  </p>
                </div>
                {person.locked ? (
                  <span className="shrink-0 rounded-full bg-[#c9a45c] px-2 py-1 text-[10px] font-bold tracking-wide text-[#14241c] uppercase">
                    Super admin
                  </span>
                ) : (
                  <Link
                    href={editing ? "/account/roles" : `/account/roles?person=${person.userId}`}
                    className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${
                      editing ? "text-[#e8d5a3]" : "text-[#1b3a2f]"
                    }`}
                  >
                    {editing ? "Close" : "Change"}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

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
      </div>
      </div>
    </section>
  );
}
