import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleAssignForm } from "@/components/RoleAssignForm";
import { RolePersonEditor } from "@/components/RolePersonEditor";
import { ROLE_GUIDE, accessSummary, roleLabel, roleNeedsHome } from "@/lib/roleLabels";
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
  if (!canManageAdmin(profile.role, user)) redirect("/account");

  const params = await searchParams;
  if (params.flat || params.as === "owner" || params.as === "family" || params.as === "tenant") {
    const next = new URLSearchParams();
    if (params.flat) next.set("flat", params.flat);
    if (params.as) next.set("as", params.as);
    redirect(`/account/owners?${next}`);
  }
  const q = (params.q || "").trim().toLowerCase();
  const accounts = await loadSignInPeople();
  const officePeople = accounts.filter((person) => !roleNeedsHome(person.role));
  const openPerson = officePeople.find((person) => person.userId === params.person) ?? null;
  const people = officePeople
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

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Roles</h1>
      <p className="mt-2 max-w-2xl text-[#475569]">
        Office roles only. Who lives in a home is set on Flats. A super admin stays an admin and cannot be changed here.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {ROLE_GUIDE.filter((item) => !roleNeedsHome(item.value) && item.value !== "visitor").map((item) => (
          <li key={item.value} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
            <p className="font-semibold text-[#0f172a]">{item.label}</p>
            <p className="mt-1 text-sm text-[#475569]">{item.help}</p>
          </li>
        ))}
      </ul>

      {openPerson && !openPerson.locked ? (
        <div className="mt-6">
          <RolePersonEditor kind="office" person={openPerson} />
          <Link href="/account/roles" className="mt-3 inline-flex text-sm font-semibold text-[#1e293b]">
            Close
          </Link>
        </div>
      ) : (
        <RoleAssignForm
          candidates={accounts
            .filter((person) => !person.locked)
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
          placeholder="Search name or email"
          className="field-control max-w-md"
        />
        <button type="submit" className="btn-line">Search</button>
      </form>

      <ul className="mt-4 divide-y divide-[rgba(15,23,42,0.08)]">
        {people.map((person) => (
          <li key={person.userId} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-[#0f172a]">
                {person.displayName || person.email || "Signed-in person"}
              </p>
              <p className="text-sm text-[#475569]">
                {person.email ? `${person.email} · ` : ""}
                {accessSummary(person)}
              </p>
            </div>
            {person.locked ? (
              <span className="shrink-0 rounded-full bg-[#059669] px-2 py-1 text-[10px] font-bold tracking-wide text-[#0f172a] uppercase">
                Super admin
              </span>
            ) : (
              <Link
                href={`/account/roles?person=${person.userId}`}
                className="shrink-0 text-sm font-semibold text-[#1e293b]"
              >
                Change
              </Link>
            )}
          </li>
        ))}
        {!people.length ? (
          <li className="py-3 text-sm text-[#475569]">
            {q ? "No one matches that search." : "No one has an office role yet."}
          </li>
        ) : null}
      </ul>
    </section>
  );
}
