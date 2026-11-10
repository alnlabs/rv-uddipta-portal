import { redirect } from "next/navigation";
import { decideVisitorPass, walkInVisitor } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { entryAllowed, hostApprovalRequired } from "@/lib/gateHost";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { indiaDay } from "@/lib/indiaDay";
import { canRunGate } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/gate");
  if (!canRunGate(profile.role, user)) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "gate");
  if (access === "none") return <FeatureOff label="Gate" />;
  const code = (await searchParams).code?.trim().toUpperCase() || "";

  const admin = createAdminClient();
  const today = indiaDay();
  const approval = await hostApprovalRequired(admin);
  const fields = "id, visitor_name, visitor_phone, flat_number, purpose, status, visit_on, code, host_answer";
  const [active, recentLeft] = await Promise.all([
    admin
      .from("visitor_passes")
      .select(fields)
      .in("status", ["waiting", "inside", "expected", "pending_approval"])
      .order("created_at", { ascending: false }),
    admin
      .from("visitor_passes")
      .select(fields)
      .eq("status", "left")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  if (active.error) return <DeskError message={active.error.message} />;
  if (recentLeft.error) return <DeskError message={recentLeft.error.message} />;

  const rows = active.data ?? [];
  const lookedUp = code
    ? rows.find((row) => row.code === code) ??
      recentLeft.data?.find((row) => row.code === code) ??
      (
        await admin
          .from("visitor_passes")
          .select(fields)
          .eq("code", code)
          .maybeSingle()
      ).data
    : null;
  const groups = [
    { title: "Waiting now", rows: rows.filter((row) => row.status === "waiting") },
    { title: "Inside", rows: rows.filter((row) => row.status === "inside") },
    { title: "Expected today", rows: rows.filter((row) => row.status === "expected" && row.visit_on === today) },
    { title: "Left", rows: recentLeft.data ?? [] },
  ];
  const waiting = groups[0].rows.length;
  const inside = groups[1].rows.length;
  const left = groups[3].rows.length;

  return (
    <section className="page-gutter max-w-5xl py-8 md:py-12">
      <p className="eyebrow">Gate</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Gate</h1>
      <p className="mt-2 text-[#475569]">
        {waiting} waiting · {inside} inside · {left} left recently
      </p>
      <form action="/gate" className="slab mt-6 flex flex-wrap gap-2 p-4">
        <input name="code" defaultValue={code} placeholder="Pass code" className="field-control max-w-xs" />
        <button type="submit" className="btn-slate">Look up pass</button>
      </form>
      {code ? (
        lookedUp ? (
          <div className="slab mt-4 p-4">
            <p className="font-mono text-4xl font-semibold tracking-[0.18em] text-[#0f172a]">{lookedUp.code}</p>
            <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{lookedUp.status.replaceAll("_", " ")}</p>
            <h2 className="mt-1 text-lg font-semibold text-[#0f172a]">{lookedUp.visitor_name}</h2>
            <p className="text-sm text-[#475569]">
              {lookedUp.flat_number} · {lookedUp.purpose || "Visitor"}
              {lookedUp.visitor_phone ? ` · ${lookedUp.visitor_phone}` : ""}
            </p>
            {access === "manage" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {entryAllowed({ status: lookedUp.status, hostAnswer: lookedUp.host_answer, approvalRequired: approval }) && lookedUp.status !== "inside" ? (
                <form action={decideVisitorPass}>
                  <input type="hidden" name="passId" value={lookedUp.id} />
                  <input type="hidden" name="status" value="inside" />
                  <button type="submit" className="btn-slate">Allow in</button>
                </form>
              ) : null}
              {!entryAllowed({ status: lookedUp.status, hostAnswer: lookedUp.host_answer, approvalRequired: approval }) && (lookedUp.status === "waiting" || lookedUp.status === "pending_approval") ? (
                <p className="text-sm text-[#b45309]">Wait for the resident to allow this visitor.</p>
              ) : null}
              {lookedUp.status === "inside" ? (
                <form action={decideVisitorPass}>
                  <input type="hidden" name="passId" value={lookedUp.id} />
                  <input type="hidden" name="status" value="left" />
                  <button type="submit" className="btn-line">Mark out</button>
                </form>
              ) : null}
            </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#475569]">No pass with that code.</p>
        )
      ) : null}
      {access === "manage" ? (
      <form action={walkInVisitor} className="slab mt-4 grid gap-3 p-4 md:grid-cols-4">
        <input name="visitorName" required placeholder="Unplanned guest name" className="field-control" />
        <input name="flatNumber" required placeholder="Home, such as B804" className="field-control" />
        <input name="purpose" placeholder="Guest, delivery, cab, service" className="field-control" />
        <button type="submit" className="btn-slate">Notify home</button>
      </form>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">{group.title}</h2>
            <ul className="mt-3 grid gap-3">
              {group.rows.length ? group.rows.map((row) => (
                <li key={row.id} className="slab p-4">
                  <p className="font-mono text-2xl font-semibold tracking-[0.16em] text-[#0f172a]">{row.code}</p>
                  <h3 className="mt-2 font-semibold text-[#0f172a]">{row.visitor_name}</h3>
                  <p className="text-sm text-[#475569]">
                    {row.flat_number} · {row.purpose || "Visitor"}
                    {row.visitor_phone ? ` · ${row.visitor_phone}` : ""}
                  </p>
                  {access === "manage" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entryAllowed({ status: row.status, hostAnswer: row.host_answer, approvalRequired: approval }) && row.status !== "inside" ? (
                      <form action={decideVisitorPass}>
                        <input type="hidden" name="passId" value={row.id} />
                        <input type="hidden" name="status" value="inside" />
                        <button type="submit" className="btn-slate">Allow in</button>
                      </form>
                    ) : null}
                    {!entryAllowed({ status: row.status, hostAnswer: row.host_answer, approvalRequired: approval }) && (row.status === "waiting" || row.status === "pending_approval") ? (
                      <p className="text-sm text-[#b45309]">Wait for the resident to allow this visitor.</p>
                    ) : null}
                    {row.status === "expected" ? (
                      <form action={decideVisitorPass}>
                        <input type="hidden" name="passId" value={row.id} />
                        <input type="hidden" name="status" value="waiting" />
                        <button type="submit" className="btn-line">At the gate</button>
                      </form>
                    ) : null}
                    {row.status === "inside" ? (
                      <form action={decideVisitorPass}>
                        <input type="hidden" name="passId" value={row.id} />
                        <input type="hidden" name="status" value="left" />
                        <button type="submit" className="btn-line">Mark out</button>
                      </form>
                    ) : null}
                  </div>
                  ) : null}
                </li>
              )) : <li className="text-sm text-[#475569]">Nobody here.</li>}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
