import { redirect } from "next/navigation";
import { createVisitorPass, decideVisitorPass } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { DateField } from "@/components/form-ui";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function VisitorsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/visitors");
  if (!isCommunityRole(profile.role)) redirect("/register");
  const access = await resolveDeskAccess(profile.role, user, "visitor_passes");
  if (access === "none") return <FeatureOff label="Visitor passes" />;

  const admin = createAdminClient();
  const query = admin
    .from("visitor_passes")
    .select("id, code, visitor_name, purpose, visit_on, status, flat_number, host_user_id")
    .order("created_at", { ascending: false })
    .limit(30);
  const { data, error } = profile.flatId
    ? await query.eq("flat_id", profile.flatId)
    : await query.eq("host_user_id", user.id);
  if (error) return <DeskError message={error.message} />;

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Visitors</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Visitor passes</h1>
      <p className="mt-2 text-[#475569]">
        The visitor shows the pass on their phone. They do not get an account.
      </p>
      {access === "manage" ? (
      <form action={createVisitorPass} className="slab mt-6 grid gap-3 p-4">
        <label className="grid gap-1 text-sm font-semibold text-[#0f172a]">
          Visitor name
          <input name="visitorName" required className="field-control" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#0f172a]">
          Phone
          <input name="phone" className="field-control" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#0f172a]">
          Why they are coming
          <input name="purpose" className="field-control" />
        </label>
        <DateField label="Date" name="visitOn" required notBeforeToday />
        <button type="submit" className="btn-slate w-fit">Create pass</button>
      </form>
      ) : (
        <p className="mt-6 text-sm text-[#475569]">You can see passes. You cannot create one.</p>
      )}
      <ul className="mt-6 grid gap-3">
        {(data ?? []).map((pass) => (
          <li key={pass.id} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{pass.status.replaceAll("_", " ")}</p>
            <h2 className="mt-1 text-lg font-semibold text-[#0f172a]">{pass.visitor_name}</h2>
            <p className="text-sm text-[#475569]">
              {pass.flat_number} · {pass.visit_on}
              {pass.purpose ? ` · ${pass.purpose}` : ""}
            </p>
            <p className="mt-2 text-sm text-[#0f172a]">
              Pass <a className="font-semibold underline" href={`/pass/${pass.code}`}>{pass.code}</a>
            </p>
            {pass.status === "pending_approval" && pass.host_user_id === user.id ? (
              <div className="mt-3 flex gap-2">
                <form action={decideVisitorPass}>
                  <input type="hidden" name="passId" value={pass.id} />
                  <input type="hidden" name="status" value="expected" />
                  <button type="submit" className="btn-slate">Approve</button>
                </form>
                <form action={decideVisitorPass}>
                  <input type="hidden" name="passId" value={pass.id} />
                  <input type="hidden" name="status" value="refused" />
                  <button type="submit" className="btn-line">Refuse</button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
