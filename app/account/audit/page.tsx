import { redirect } from "next/navigation";
import { DeskError } from "@/components/FeatureOff";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function AuditPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("audit_log")
    .select("id, actor_name, action, subject, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return <DeskError message={error.message} />;

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Activity record</h1>
      <p className="mt-2 text-[#475569]">Approvals, role changes, requests, visitors, and jobs.</p>
      <ul className="mt-6 grid gap-2">
        {(data ?? []).map((row) => (
          <li key={row.id} className="slab px-4 py-3">
            <p className="font-semibold text-[#0f172a]">{row.action}</p>
            <p className="text-sm text-[#475569]">
              {row.actor_name || "Someone"}
              {row.subject ? ` · ${row.subject}` : ""}
              {row.detail ? ` · ${row.detail}` : ""}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              {new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </li>
        ))}
        {!data?.length ? <li className="text-sm text-[#475569]">Nothing recorded yet.</li> : null}
      </ul>
    </section>
  );
}
