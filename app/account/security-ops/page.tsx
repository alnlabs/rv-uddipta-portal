import { redirect } from "next/navigation";
import {
  addBlacklistEntry,
  closeIncident,
  createIncident,
  createMaterialExit,
  decideMaterialExit,
  setBlacklistActive,
} from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canManageAdmin, canRunGate } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function SecurityOpsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  const canDesk = canManageAdmin(profile.role, user) || canRunGate(profile.role, user);
  if (!canDesk) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "security_ops");
  // Security role may not have security_ops grant yet — still allow gate staff.
  if (access === "none" && !canRunGate(profile.role, user) && !canManageAdmin(profile.role, user)) {
    return <FeatureOff label="Security ops" />;
  }

  const admin = createAdminClient();
  const [{ data: blacklist, error: blError }, { data: exits, error: exitError }, { data: incidents, error: incError }] =
    await Promise.all([
      admin.from("security_blacklist").select("id, kind, value, reason, active, created_at").order("created_at", { ascending: false }).limit(40),
      admin.from("material_exits").select("id, flat_number, description, carrier_name, vehicle, status, created_at").order("created_at", { ascending: false }).limit(40),
      admin.from("security_incidents").select("id, title, body, severity, status, created_at").order("created_at", { ascending: false }).limit(40),
    ]);
  const error = blError || exitError || incError;
  if (error) return <DeskError message={error.message} />;

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Security ops</h1>
      <p className="mt-2 text-[#475569]">Blacklist, material exit slips, and incident log for the gate.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <form action={addBlacklistEntry} className="slab grid gap-3 p-4">
          <h2 className="font-semibold text-[#0f172a]">Blacklist</h2>
          <select name="kind" defaultValue="person" className="field-control">
            <option value="person">Person</option>
            <option value="vehicle">Vehicle</option>
            <option value="phone">Phone</option>
          </select>
          <input name="value" placeholder="Name / plate / phone" className="field-control" required />
          <input name="reason" placeholder="Reason" className="field-control" />
          <button type="submit" className="btn-slate w-fit">Add</button>
        </form>

        <form action={createMaterialExit} className="slab grid gap-3 p-4">
          <h2 className="font-semibold text-[#0f172a]">Material exit</h2>
          <input name="flatNumber" placeholder="Home" className="field-control" />
          <input name="description" placeholder="What is leaving" className="field-control" required />
          <input name="carrierName" placeholder="Carrier" className="field-control" />
          <input name="vehicle" placeholder="Vehicle" className="field-control" />
          <button type="submit" className="btn-slate w-fit">Log exit</button>
        </form>

        <form action={createIncident} className="slab grid gap-3 p-4">
          <h2 className="font-semibold text-[#0f172a]">Incident</h2>
          <input name="title" placeholder="Title" className="field-control" required />
          <textarea name="body" placeholder="Details" className="field-control" rows={3} />
          <select name="severity" defaultValue="low" className="field-control">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="btn-slate w-fit">Log incident</button>
        </form>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Active blacklist</h2>
        <ul className="mt-3 grid gap-2">
          {(blacklist ?? []).map((row) => (
            <li key={row.id} className="slab flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <p className="text-sm text-[#0f172a]">
                {row.kind} · {row.value}{row.reason ? ` · ${row.reason}` : ""}{row.active ? "" : " · inactive"}
              </p>
              <form action={setBlacklistActive}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="active" value={row.active ? "false" : "true"} />
                <button type="submit" className="btn-line">{row.active ? "Deactivate" : "Activate"}</button>
              </form>
            </li>
          ))}
          {!blacklist?.length ? <li className="text-sm text-[#475569]">Empty.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Material exits</h2>
        <ul className="mt-3 grid gap-3">
          {(exits ?? []).map((row) => (
            <li key={row.id} className="slab p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{row.status}</p>
              <h3 className="mt-1 font-semibold text-[#0f172a]">
                {row.flat_number || "Gate"} · {row.description}
              </h3>
              <p className="text-sm text-[#475569]">
                {[row.carrier_name, row.vehicle].filter(Boolean).join(" · ")}
              </p>
              {row.status === "open" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["allowed", "stopped", "done"] as const).map((status) => (
                    <form key={status} action={decideMaterialExit}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="status" value={status} />
                      <button type="submit" className="btn-line capitalize">{status}</button>
                    </form>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
          {!exits?.length ? <li className="text-sm text-[#475569]">No material exits.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Incidents</h2>
        <ul className="mt-3 grid gap-3">
          {(incidents ?? []).map((row) => (
            <li key={row.id} className="slab p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">
                {row.status} · {row.severity}
              </p>
              <h3 className="mt-1 font-semibold text-[#0f172a]">{row.title}</h3>
              {row.body ? <p className="text-sm text-[#475569]">{row.body}</p> : null}
              {row.status === "open" ? (
                <form action={closeIncident} className="mt-3">
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="btn-line">Close</button>
                </form>
              ) : null}
            </li>
          ))}
          {!incidents?.length ? <li className="text-sm text-[#475569]">No incidents.</li> : null}
        </ul>
      </section>
    </section>
  );
}
