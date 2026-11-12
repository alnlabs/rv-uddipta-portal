import { redirect } from "next/navigation";
import { publishCircular } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canAccessAdminDesk, getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function OfficeCircularsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!(await canAccessAdminDesk())) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "circulars");
  if (access === "none") return <FeatureOff label="Circulars" />;

  const admin = createAdminClient();
  const [{ data: circulars, error }, { data: reads }] = await Promise.all([
    admin.from("circulars").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(40),
    admin.from("circular_reads").select("circular_id"),
  ]);
  if (error) return <DeskError message={error.message} />;
  const readCount = new Map<number, number>();
  for (const row of reads ?? []) {
    readCount.set(row.circular_id, (readCount.get(row.circular_id) || 0) + 1);
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Circulars</h1>
      <p className="mt-2 text-[#475569]">Official circulars. Residents acknowledge when they have read them.</p>

      {access === "manage" ? (
        <form action={publishCircular} className="field-panel mt-6 grid gap-3">
          <input name="title" placeholder="Title" className="field-control" required />
          <textarea name="body" placeholder="Body" className="field-control" rows={5} required />
          <button type="submit" className="btn-slate w-fit">Publish</button>
        </form>
      ) : null}

      <ul className="mt-8 grid gap-3">
        {(circulars ?? []).map((row) => (
          <li key={row.id} className="slab p-4">
            <h3 className="text-lg font-semibold text-[#0f172a]">{row.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#475569]">{row.body}</p>
            <p className="mt-2 text-xs text-[#64748b]">{readCount.get(row.id) || 0} acknowledgements</p>
          </li>
        ))}
        {!circulars?.length ? <li className="text-sm text-[#475569]">No circulars yet.</li> : null}
      </ul>
    </section>
  );
}
