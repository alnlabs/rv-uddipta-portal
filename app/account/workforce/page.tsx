import { redirect } from "next/navigation";
import { setWorkforceBlacklist } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function OfficeWorkforcePage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "workforce");
  if (access === "none") return <FeatureOff label="Helpers and vendors" />;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workforce_people")
    .select("id, kind, name, phone, code, blacklisted, created_at, workforce_links(flat_number, active, note)")
    .order("name")
    .limit(120);
  if (error) return <DeskError message={error.message} />;

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Helpers and vendors</h1>
      <p className="mt-2 text-[#475569]">Domestic help, vendors, and cab passes linked to homes. Gate can look up the pass code.</p>
      <ul className="mt-6 grid gap-3">
        {(data ?? []).map((person) => {
          const links = Array.isArray(person.workforce_links) ? person.workforce_links : [];
          const homes = links.filter((link) => link.active).map((link) => link.flat_number).join(", ");
          return (
            <li key={person.id} className="slab flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">
                  {person.kind}{person.blacklisted ? " · blacklisted" : ""}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{person.name}</h3>
                <p className="text-sm text-[#475569]">
                  Code {person.code}
                  {person.phone ? ` · ${person.phone}` : ""}
                  {homes ? ` · ${homes}` : ""}
                </p>
              </div>
              {access === "manage" ? (
                <form action={setWorkforceBlacklist}>
                  <input type="hidden" name="id" value={person.id} />
                  <input type="hidden" name="blacklisted" value={person.blacklisted ? "false" : "true"} />
                  <button type="submit" className="btn-line">
                    {person.blacklisted ? "Clear blacklist" : "Blacklist"}
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
        {!data?.length ? <li className="text-sm text-[#475569]">No helpers registered yet.</li> : null}
      </ul>
    </section>
  );
}
