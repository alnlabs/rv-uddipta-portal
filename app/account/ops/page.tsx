import { redirect } from "next/navigation";
import { postOpsLog, resolveOpsLog } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canAccessAdminDesk, getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function OfficeOpsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!(await canAccessAdminDesk())) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "ops");
  if (access === "none") return <FeatureOff label="Building ops" />;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ops_logs")
    .select("id, kind, status, title, body, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return <DeskError message={error.message} />;
  const open = (data ?? []).filter((row) => row.status === "open");

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Building ops</h1>
      <p className="mt-2 text-[#475569]">Water, power, lift, DG, tanker, and other building status notes.</p>

      {access === "manage" ? (
        <form action={postOpsLog} className="field-panel mt-6 grid gap-3 md:grid-cols-2">
          <select name="kind" defaultValue="water" className="field-control">
            <option value="water">Water</option>
            <option value="power">Power</option>
            <option value="lift">Lift</option>
            <option value="dg">DG</option>
            <option value="tanker">Tanker</option>
            <option value="other">Other</option>
          </select>
          <input name="title" placeholder="Title" className="field-control" required />
          <textarea name="body" placeholder="Details" className="field-control md:col-span-2" rows={3} />
          <button type="submit" className="btn-slate w-fit">Post ops log</button>
        </form>
      ) : null}

      <ul className="mt-8 grid gap-3">
        {(data ?? []).map((row) => (
          <li key={row.id} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">
              {row.status} · {row.kind}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{row.title}</h3>
            {row.body ? <p className="text-sm text-[#475569]">{row.body}</p> : null}
            {access === "manage" && row.status === "open" ? (
              <form action={resolveOpsLog} className="mt-3">
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn-line">Mark resolved</button>
              </form>
            ) : null}
          </li>
        ))}
        {!open.length && !data?.length ? <li className="text-sm text-[#475569]">No ops logs yet.</li> : null}
      </ul>
    </section>
  );
}
