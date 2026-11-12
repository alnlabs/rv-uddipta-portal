import { redirect } from "next/navigation";
import { reviewDocumentRequest } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function OfficeNocsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "documents");
  if (access === "none") return <FeatureOff label="NOC requests" />;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("document_requests")
    .select("id, flat_number, kind, title, note, status, reject_reason, file_path, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return <DeskError message={error.message} />;

  const open = (data ?? []).filter((row) => ["submitted", "under_review"].includes(row.status));
  const closed = (data ?? []).filter((row) => !["submitted", "under_review", "draft"].includes(row.status));

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">NOC requests</h1>
      <p className="mt-2 text-[#475569]">Review move-in, move-out, sale, renovation, and tenant papers from homes.</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Open</h2>
        <ul className="mt-3 grid gap-3">
          {open.map((row) => (
            <li key={row.id} className="slab p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{row.status} · {row.kind}</p>
              <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{row.flat_number} · {row.title}</h3>
              {row.note ? <p className="text-sm text-[#475569]">{row.note}</p> : null}
              {access === "manage" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={reviewDocumentRequest}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="under_review" />
                    <button type="submit" className="btn-line">Mark under review</button>
                  </form>
                  <form action={reviewDocumentRequest} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="issued" />
                    <input name="filePath" placeholder="File path / link" className="field-control max-w-[14rem]" />
                    <button type="submit" className="btn-slate">Issue</button>
                  </form>
                  <form action={reviewDocumentRequest} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <input name="rejectReason" placeholder="Reason" className="field-control max-w-[14rem]" required />
                    <button type="submit" className="btn-line">Reject</button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
          {!open.length ? <li className="text-sm text-[#475569]">No open requests.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Closed</h2>
        <ul className="mt-3 grid gap-2">
          {closed.map((row) => (
            <li key={row.id} className="text-sm text-[#0f172a]">
              {row.flat_number} · {row.title} · {row.status}
              {row.reject_reason ? ` · ${row.reject_reason}` : ""}
            </li>
          ))}
          {!closed.length ? <li className="text-sm text-[#475569]">Nothing closed yet.</li> : null}
        </ul>
      </section>
    </section>
  );
}
