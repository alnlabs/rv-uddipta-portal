import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { addMyWorkforce } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { getAuthState } from "@/lib/session";
import { createClient } from "@/utils/supabase/server";

export default async function ResidentWorkforcePage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/workforce");
  if (!profile.flatId) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "workforce");
  if (access === "none") return <FeatureOff label="Helpers and vendors" />;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("list_my_workforce");
  if (error) return <DeskError message={error.message} />;
  const people = Array.isArray((data as { people?: unknown } | null)?.people)
    ? ((data as { people: Record<string, unknown>[] }).people)
    : [];

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Visitors</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Helpers and vendors</h1>
      <p className="mt-2 text-[#475569]">Register domestic help, vendors, or a cab. Security can check the pass code at the gate.</p>

      {access === "manage" ? (
        <form action={addMyWorkforce} className="field-panel mt-6 grid gap-3">
          <select name="kind" defaultValue="domestic" className="field-control">
            <option value="domestic">Domestic help</option>
            <option value="vendor">Vendor</option>
            <option value="cab">Cab</option>
          </select>
          <input name="name" placeholder="Name" className="field-control" required />
          <input name="phone" placeholder="Phone" className="field-control" />
          <input name="note" placeholder="Note" className="field-control" />
          <button type="submit" className="btn-slate w-fit">Add pass</button>
        </form>
      ) : null}

      <ul className="mt-6 grid gap-3">
        {people.map((person) => (
          <li key={String(person.id)} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{String(person.kind)}</p>
            <h2 className="mt-1 font-semibold text-[#0f172a]">{String(person.name)}</h2>
            <p className="text-sm text-[#475569]">
              Code {String(person.code)}
              {person.phone ? ` · ${String(person.phone)}` : ""}
              {person.blacklisted ? " · blacklisted" : ""}
            </p>
          </li>
        ))}
        {!people.length ? <li className="text-sm text-[#475569]">No helpers linked to this home yet.</li> : null}
      </ul>
    </section>
  );
}
