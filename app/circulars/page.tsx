import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ackMyCircular } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { getAuthState } from "@/lib/session";
import { createClient } from "@/utils/supabase/server";

export default async function ResidentCircularsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/circulars");
  const access = await resolveDeskAccess(profile.role, user, "circulars");
  if (access === "none") return <FeatureOff label="Circulars" />;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("list_my_circulars");
  if (error) return <DeskError message={error.message} />;
  const items = Array.isArray((data as { items?: unknown } | null)?.items)
    ? ((data as { items: Record<string, unknown>[] }).items)
    : [];

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Community</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Circulars</h1>
      <p className="mt-2 text-[#475569]">Official circulars from the committee. Acknowledge once you have read them.</p>
      <ul className="mt-6 grid gap-3">
        {items.map((item) => (
          <li key={String(item.id)} className="slab p-4">
            <h2 className="font-semibold text-[#0f172a]">{String(item.title)}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#475569]">{String(item.body)}</p>
            {item.read ? (
              <p className="mt-2 text-xs text-[#64748b]">Acknowledged</p>
            ) : (
              <form action={ackMyCircular} className="mt-3">
                <input type="hidden" name="circularId" value={String(item.id)} />
                <button type="submit" className="btn-slate">I have read this</button>
              </form>
            )}
          </li>
        ))}
        {!items.length ? <li className="text-sm text-[#475569]">No circulars yet.</li> : null}
      </ul>
    </section>
  );
}
