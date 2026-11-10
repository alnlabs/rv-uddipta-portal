import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleAssignForm } from "@/components/RoleAssignForm";
import { RolePersonEditor } from "@/components/RolePersonEditor";
import { ROLE_GUIDE, accessSummary, roleLabel, roleNeedsHome } from "@/lib/roleLabels";
import { isSuperAdmin } from "@/lib/admin";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { loadSignInPeople } from "@/lib/signInPeople";

export default async function AdminRolesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string; flat?: string; as?: string; person?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/account/roles");
  const superAdmin = isSuperAdmin(user);
  const societyAdmin = canManageAdmin(profile?.role, user);
  if (!superAdmin && !societyAdmin) redirect("/account");

  const params = await searchParams;
  if (params.flat || params.as === "owner" || params.as === "family" || params.as === "tenant") {
    const next = new URLSearchParams();
    if (params.flat) next.set("flat", params.flat);
    if (params.as) next.set("as", params.as);
    redirect(`/account/owners?${next}`);
  }
  const q = (params.q || "").trim().toLowerCase();
  const accounts = await loadSignInPeople();
  // Super sees every apartment sign-in; society admin still focuses office desks.
  const listed = superAdmin
    ? accounts
    : accounts.filter((person) => !roleNeedsHome(person.role));
  const openPerson = listed.find((person) => person.userId === params.person) ?? null;
  const people = listed
    .filter((person) => {
      if (!q) return true;
      return [person.displayName, person.email, person.role, person.flatNumber || ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) =>
      (a.displayName || a.email).localeCompare(b.displayName || b.email, undefined, { sensitivity: "base" }),
    );

  const guideRoles = ROLE_GUIDE.filter((item) => {
    if (roleNeedsHome(item.value) || item.value === "visitor") return false;
    if (!superAdmin && item.value === "admin") return false;
    return true;
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Roles</h1>
      <p className="mt-2 max-w-2xl text-[#475569]">
        {superAdmin
          ? "Assign society admin and every office role. Home membership stays on Flats."
          : "Assign facility, security, committee, staff, or builder. Society admin is set only by the super admin."}
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {guideRoles.map((item) => (
          <li key={item.value} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
            <p className="font-semibold text-[#0f172a]">{item.label}</p>
            <p className="mt-1 text-sm text-[#475569]">{item.help}</p>
          </li>
        ))}
      </ul>

      {openPerson && !openPerson.locked ? (
        <div className="mt-6">
          <RolePersonEditor kind="office" person={openPerson} allowAdmin={superAdmin} />
          <Link href="/account/roles" className="mt-3 inline-flex text-sm font-semibold text-[#1e293b]">
            Close
          </Link>
        </div>
      ) : (
        <RoleAssignForm
          allowAdmin={superAdmin}
          defaultRole={superAdmin ? "admin" : "facility"}
          candidates={accounts
            .filter((person) => !person.locked && person.userId !== user.id)
            .map((person) => ({
              userId: person.userId,
              label: `${person.displayName || person.email || "Signed-in person"} · ${roleLabel(person.role)}`,
              flatNumber: person.flatNumber,
            }))}
        />
      )}

      <form className="mt-8 flex gap-2" action="/account/roles">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Search"
          className="min-w-0 flex-1 rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-[#1e293b] px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      <ul className="mt-4 divide-y divide-[rgba(15,23,42,0.08)] rounded-2xl bg-white ring-1 ring-[rgba(15,23,42,0.1)]">
        {people.map((person) => (
          <li key={person.userId}>
            <Link
              href={`/account/roles?person=${person.userId}`}
              className="flex flex-col gap-0.5 px-4 py-3 hover:bg-[#f8fafc]"
            >
              <span className="font-semibold text-[#0f172a]">
                {person.displayName || person.email || "Signed-in person"}
              </span>
              <span className="text-sm text-[#475569]">{accessSummary(person)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
