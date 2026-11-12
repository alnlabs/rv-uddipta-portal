import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { getAuthState } from "@/lib/session";
import { createClient } from "@/utils/supabase/server";

export default async function ResidentOpsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/ops");
  const access = await resolveDeskAccess(profile.role, user, "ops");
  if (access === "none") return <FeatureOff label="Building ops" />;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("list_building_ops");
  if (error) return <DeskError message={error.message} />;
  const open = Array.isArray((data as { open?: unknown } | null)?.open)
    ? ((data as { open: Record<string, unknown>[] }).open)
    : [];

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Building</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Building status</h1>
      <p className="mt-2 text-[#475569]">Open outages and building ops notes from the office.</p>
      <ul className="mt-6 grid gap-3">
        {open.map((row) => (
          <li key={String(row.id)} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{String(row.kind)}</p>
            <h2 className="mt-1 font-semibold text-[#0f172a]">{String(row.title)}</h2>
            {row.body ? <p className="mt-1 text-sm text-[#475569]">{String(row.body)}</p> : null}
          </li>
        ))}
        {!open.length ? <li className="text-sm text-[#475569]">Nothing open right now.</li> : null}
      </ul>
    </section>
  );
}
