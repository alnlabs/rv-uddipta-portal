import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requestMyDocument } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { getAuthState } from "@/lib/session";
import { createClient } from "@/utils/supabase/server";

export default async function ResidentNocsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/nocs");
  if (!profile.flatId) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "documents");
  if (access === "none") return <FeatureOff label="NOC requests" />;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("list_my_documents");
  if (error) return <DeskError message={error.message} />;
  const requests = Array.isArray((data as { requests?: unknown } | null)?.requests)
    ? ((data as { requests: Record<string, unknown>[] }).requests)
    : [];

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Home</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">NOC and papers</h1>
      <p className="mt-2 text-[#475569]">Request move-in, move-out, sale, renovation, or tenant papers from the office.</p>

      {access === "manage" ? (
        <form action={requestMyDocument} className="field-panel mt-6 grid gap-3">
          <select name="kind" defaultValue="move_in" className="field-control" required>
            <option value="move_in">Move in</option>
            <option value="move_out">Move out</option>
            <option value="sale">Sale</option>
            <option value="renovation">Renovation</option>
            <option value="tenant">Tenant</option>
            <option value="other">Other</option>
          </select>
          <input name="title" placeholder="Title" className="field-control" required />
          <textarea name="note" placeholder="Note for the office" className="field-control" rows={3} />
          <button type="submit" className="btn-slate w-fit">Submit request</button>
        </form>
      ) : null}

      <ul className="mt-6 grid gap-3">
        {requests.map((row) => (
          <li key={String(row.id)} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">
              {String(row.status)} · {String(row.kind)}
            </p>
            <h2 className="mt-1 font-semibold text-[#0f172a]">{String(row.title)}</h2>
            {row.rejectReason ? <p className="mt-1 text-sm text-[#475569]">{String(row.rejectReason)}</p> : null}
          </li>
        ))}
        {!requests.length ? <li className="text-sm text-[#475569]">No requests yet.</li> : null}
      </ul>
    </section>
  );
}
