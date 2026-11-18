import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { submitResidentPaymentProof } from "@/app/actions/billing";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { signedProofUrl } from "@/lib/paymentProof";
import { getAuthState } from "@/lib/session";
import { createClient } from "@/utils/supabase/server";

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default async function ResidentBillingPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/billing");
  if (!profile.flatId) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "billing");
  if (access === "none") return <FeatureOff label="Dues and billing" />;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("list_my_dues");
  if (error) return <DeskError message={error.message} />;
  const payload = (data ?? {}) as { flat?: string; invoices?: Record<string, unknown>[]; payments?: Record<string, unknown>[] };
  const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];
  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  const open = invoices.filter((row) => ["open", "partial"].includes(String(row.status)));

  const proofLinks = new Map<number, string | null>();
  await Promise.all(
    payments.map(async (row) => {
      const path = row.proofPath ? String(row.proofPath) : "";
      if (path) proofLinks.set(Number(row.id), await signedProofUrl(path));
    }),
  );

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Services</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Dues</h1>
      <p className="mt-2 text-[#475569]">
        {payload.flat
          ? `Invoices for ${payload.flat}. Pay outside the app, then upload a screenshot or PDF as proof. The office confirms it into the ledger — there is no online payment.`
          : "Link a flat to see dues."}
      </p>

      <ul className="mt-6 grid gap-3">
        {open.map((row) => (
          <li key={String(row.id)} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">
              {String(row.status)} · {String(row.period)}
            </p>
            <h2 className="mt-1 font-semibold text-[#0f172a]">{String(row.title)}</h2>
            <p className="text-sm text-[#475569]">
              {rupees(Number(row.amountPaise || 0))} · balance {rupees(Number(row.balancePaise || 0))}
            </p>
            <form action={submitResidentPaymentProof} className="mt-4 grid gap-2">
              <input type="hidden" name="invoiceId" value={String(row.id)} />
              <input
                name="amount"
                defaultValue={String(Number(row.balancePaise || 0) / 100)}
                placeholder="₹ paid"
                className="field-control"
                required
              />
              <select name="method" defaultValue="upi" className="field-control">
                <option value="upi">UPI</option>
                <option value="offline">Cash / office</option>
              </select>
              <input name="reference" placeholder="UTR / receipt note (optional)" className="field-control" />
              <label className="text-sm text-[#475569]">
                Proof (screenshot or PDF)
                <input
                  name="proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="mt-1 block w-full text-sm"
                  required
                />
              </label>
              <button type="submit" className="btn-slate w-fit">Submit proof</button>
            </form>
          </li>
        ))}
        {!open.length ? <li className="text-sm text-[#475569]">No open invoices.</li> : null}
      </ul>

      {payments.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Office ledger</h2>
          <ul className="mt-3 grid gap-2">
            {payments.map((row) => (
              <li key={String(row.id)} className="text-sm text-[#0f172a]">
                {rupees(Number(row.amountPaise || 0))} · {String(row.method)} · {String(row.status)}
                {row.reference ? ` · ${String(row.reference)}` : ""}
                {proofLinks.get(Number(row.id)) ? (
                  <>
                    {" · "}
                    <a href={proofLinks.get(Number(row.id)) || "#"} target="_blank" rel="noreferrer" className="underline">
                      Proof
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
