import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleAssignForm } from "@/components/RoleAssignForm";
import { RolePersonEditor } from "@/components/RolePersonEditor";
import { WorkspaceHeader } from "@/components/form-ui";
import { isSuperAdmin } from "@/lib/admin";
import { accessSummary, roleLabel } from "@/lib/roleLabels";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import {
  isSocietyPerson,
  loadSocietyPeopleIndex,
} from "@/lib/societyPeople";
import { createAdminClient } from "@/utils/supabase/admin";

type SignInPerson = {
  userId: string
  role: string
  displayName: string
  email: string
  locked: boolean
  flatNumber: string | null
};

function personName(person: SignInPerson) {
  return person.displayName || person.email || "Signed-in person";
}

function roleOrder(role: string) {
  if (role === "owner") return 0;
  if (role === "co_owner") return 1;
  if (role === "tenant") return 2;
  return 3;
}

function groupByFlat(people: SignInPerson[]) {
  const withoutFlat: SignInPerson[] = [];
  const byFlat = new Map<string, SignInPerson[]>();
  for (const person of people) {
    if (!person.flatNumber) {
      withoutFlat.push(person);
      continue;
    }
    const list = byFlat.get(person.flatNumber) ?? [];
    list.push(person);
    byFlat.set(person.flatNumber, list);
  }
  for (const list of byFlat.values()) {
    list.sort(
      (a, b) =>
        roleOrder(a.role) - roleOrder(b.role) ||
        personName(a).localeCompare(personName(b)),
    );
  }
  withoutFlat.sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? -1 : 1;
    return personName(a).localeCompare(personName(b));
  });
  const flats = [...byFlat.entries()]
    .map(([flatNumber, members]) => ({
      flatNumber,
      members,
      registeredOwner: members.some((person) => person.role === "owner"),
    }))
    .sort((a, b) => {
      if (a.registeredOwner !== b.registeredOwner) return a.registeredOwner ? -1 : 1;
      return a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true });
    });
  return { flats, withoutFlat };
}

export default async function AdminRolesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ flat?: string; as?: string; person?: string }>
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
    .filter((person) => isSocietyPerson({ ...person, index }));
  const grouped = groupByFlat(people);
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
        <>
        <ul className="mt-3 grid gap-3">
          {grouped.flats.map((group) => (
            <li
              key={group.flatNumber}
              className="overflow-hidden rounded-[1.25rem] bg-[#fffcf5] text-[#14241c] ring-1 ring-[rgba(27,58,47,0.1)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[rgba(27,58,47,0.08)] px-4 py-3">
                <p className="text-lg font-semibold tracking-tight">{group.flatNumber}</p>
                <p className="text-sm text-[#3d5247]">
                  {group.members.length} {group.members.length === 1 ? "person" : "people"}
                </p>
              </div>
              <ul className="divide-y divide-[rgba(27,58,47,0.08)]">
                {group.members.map((person) => {
                  const editing = openPerson?.userId === person.userId;
                  const label = personName(person);
                  const owner = person.role === "owner";
                  return (
                    <li
                      key={person.userId}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${
                        editing ? "bg-[#1b3a2f] text-[#e8d5a3]" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
                          <span className="truncate">{label}</span>
                          {owner ? (
                            <span className="rounded-full bg-[#c9a45c] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#14241c] uppercase">
                              Registered
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold tracking-wide uppercase ${
                                editing ? "text-[#e8d5a3]" : "text-[#7a5c22]"
                              }`}
                            >
                              {roleLabel(person.role)}
                            </span>
                          )}
                        </p>
                        <p className={`truncate text-sm ${editing ? "text-[#d8c898]" : "text-[#3d5247]"}`}>
                          {accessSummary(person)}
                        </p>
                      </div>
                      <Link
                        href={editing ? "/account/roles" : `/account/roles?person=${person.userId}`}
                        className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${
                          editing ? "text-[#e8d5a3]" : "text-[#1b3a2f]"
                        }`}
                      >
                        {editing ? "Close" : "Change"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        {grouped.withoutFlat.length ? (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-[#14241c]">No flat linked</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {grouped.withoutFlat.map((person) => {
                const editing = openPerson?.userId === person.userId;
                const label = personName(person);
                return (
                  <li
                    key={person.userId}
                    className={`flex min-h-24 flex-col justify-between rounded-[1.25rem] px-3.5 py-3 ring-1 ${
                      editing
                        ? "bg-[#1b3a2f] text-[#e8d5a3] ring-transparent"
                        : "bg-[#fffcf5] text-[#14241c] ring-[rgba(27,58,47,0.1)]"
                    }`}
                  >
                    <p className="truncate text-base font-semibold">{label}</p>
                    <p className={`truncate text-sm ${editing ? "text-[#d8c898]" : "text-[#3d5247]"}`}>
                      {person.locked ? "Cannot be removed. No flat." : accessSummary(person)}
                    </p>
                    {person.locked ? (
                      <span className="w-fit rounded-full bg-[#c9a45c] px-2 py-1 text-[10px] font-bold tracking-wide text-[#14241c] uppercase">
                        Super admin
                      </span>
                    ) : (
                      <Link
                        href={editing ? "/account/roles" : `/account/roles?person=${person.userId}`}
                        className={`inline-flex min-h-11 items-center text-sm font-semibold ${
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
          </div>
        ) : null}
        </>
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
