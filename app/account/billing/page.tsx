import { redirect } from "next/navigation";
import {
  confirmPendingPayment,
  postDuesRun,
  recordPayment,
  rejectPendingPayment,
  saveFeeHead,
} from "@/app/actions/billing";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { signedProofUrl } from "@/lib/paymentProof";
import { canAccessAdminDesk, getAuthState, manageDeskRole } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default async function BillingPage() {
  const { user } = await getAuthState();
  if (!user) redirect("/login");
  if (!(await canAccessAdminDesk())) redirect("/");
  const deskRole = (await manageDeskRole()) || "admin";
  const access = await resolveDeskAccess(deskRole, user, "billing");
  if (access === "none") return <FeatureOff label="Billing" />;

  const admin = createAdminClient();
  const [{ data: heads, error: headError }, { data: invoices, error }, { data: payments }] = await Promise.all([
    admin.from("fee_heads").select("id, key, label, amount_paise, active").order("label"),
    admin.from("invoices").select("id, flat_number, period, title, status, amount_paise, balance_paise, due_on").order("created_at", { ascending: false }).limit(80),
    admin.from("payments").select("id, amount_paise, method, reference, status, created_at, invoice_id, proof_path, flat_id").order("created_at", { ascending: false }).limit(40),
  ]);
  if (error || headError) return <DeskError message={(error || headError)?.message || "Could not load billing."} />;

  const open = (invoices ?? []).filter((row) => row.status === "open" || row.status === "partial");
  const pending = (payments ?? []).filter((row) => row.status === "pending");
  const recent = (payments ?? []).filter((row) => row.status !== "pending").slice(0, 20);
  const flatByInvoice = new Map((invoices ?? []).map((row) => [row.id, row.flat_number]));
  const proofLinks = new Map<number, string | null>();
  await Promise.all(
    [...pending, ...recent].map(async (row) => {
      if (row.proof_path) proofLinks.set(row.id, await signedProofUrl(row.proof_path));
    }),
  );

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Dues and billing</h1>
      <p className="mt-2 text-[#475569]">
        Post dues, review resident proof (screenshot or PDF), and record office ledger entries. No online checkout.
      </p>

      {access === "manage" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <form action={saveFeeHead} className="slab grid gap-3 p-4">
            <h2 className="font-semibold text-[#0f172a]">Fee head</h2>
            <input name="key" defaultValue="maintenance" placeholder="Key" className="field-control" />
            <input name="label" defaultValue={(heads ?? [])[0]?.label || "Maintenance"} placeholder="Label" className="field-control" required />
            <input name="amount" defaultValue={String(((heads ?? [])[0]?.amount_paise || 350000) / 100)} placeholder="Amount (₹)" className="field-control" required />
            <button type="submit" className="btn-slate w-fit">Save fee head</button>
          </form>

          <form action={postDuesRun} className="slab grid gap-3 p-4">
            <h2 className="font-semibold text-[#0f172a]">Post dues run</h2>
            <input name="period" placeholder="2026-11" className="field-control" required />
            <input name="title" placeholder="Title (optional)" className="field-control" />
            <input name="dueOn" type="date" className="field-control" />
            <input type="hidden" name="feeHeadKey" value={(heads ?? [])[0]?.key || "maintenance"} />
            <button type="submit" className="btn-slate w-fit">Post to all sold flats</button>
          </form>
        </div>
      ) : null}

      {pending.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Proof waiting for confirmation</h2>
          <ul className="mt-3 grid gap-3">
            {pending.map((payment) => (
              <li key={payment.id} className="slab p-4">
                <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">Pending proof</p>
                <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">
                  {flatByInvoice.get(payment.invoice_id ?? 0) || `Flat ${payment.flat_id}`} · {rupees(payment.amount_paise)}
                </h3>
                <p className="text-sm text-[#475569]">
                  {payment.method}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </p>
                {proofLinks.get(payment.id) ? (
                  <a href={proofLinks.get(payment.id) || "#"} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-[#0f172a] underline">
                    Open proof
                  </a>
                ) : null}
                {access === "manage" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={confirmPendingPayment}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <button type="submit" className="btn-slate">Confirm in ledger</button>
                    </form>
                    <form action={rejectPendingPayment} className="flex flex-wrap gap-2">
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <input name="reason" placeholder="Reject reason" className="field-control max-w-[14rem]" />
                      <button type="submit" className="btn-line">Reject</button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Open invoices</h2>
        <ul className="mt-3 grid gap-3">
          {open.map((invoice) => (
            <li key={invoice.id} className="slab p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{invoice.status}</p>
              <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{invoice.flat_number} · {invoice.title}</h3>
              <p className="text-sm text-[#475569]">
                {invoice.period} · {rupees(invoice.amount_paise)} · balance {rupees(invoice.balance_paise)}
                {invoice.due_on ? ` · due ${invoice.due_on}` : ""}
              </p>
              {access === "manage" ? (
                <form action={recordPayment} className="mt-3 grid gap-2 sm:grid-cols-[repeat(4,minmax(0,auto))_1fr] sm:items-end">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <input name="amount" placeholder="₹ paid" className="field-control max-w-[8rem]" required />
                  <select name="method" defaultValue="offline" className="field-control max-w-[10rem]">
                    <option value="offline">Cash / office</option>
                    <option value="upi">UPI (office)</option>
                  </select>
                  <input name="reference" placeholder="Receipt / UTR note" className="field-control max-w-[12rem]" />
                  <label className="text-sm text-[#475569]">
                    Proof (optional)
                    <input name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full text-sm" />
                  </label>
                  <button type="submit" className="btn-slate w-fit">Record in ledger</button>
                </form>
              ) : null}
            </li>
          ))}
          {!open.length ? <li className="text-sm text-[#475569]">No open invoices.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Recent ledger entries</h2>
        <ul className="mt-3 grid gap-2">
          {recent.map((payment) => (
            <li key={payment.id} className="text-sm text-[#0f172a]">
              {rupees(payment.amount_paise)} · {payment.method} · {payment.status}
              {payment.reference ? ` · ${payment.reference}` : ""}
              {proofLinks.get(payment.id) ? (
                <>
                  {" · "}
                  <a href={proofLinks.get(payment.id) || "#"} target="_blank" rel="noreferrer" className="underline">
                    Proof
                  </a>
                </>
              ) : null}
            </li>
          ))}
          {!recent.length ? <li className="text-sm text-[#475569]">No payments yet.</li> : null}
        </ul>
      </section>
    </section>
  );
}
