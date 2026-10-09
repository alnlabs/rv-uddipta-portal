import { redirect } from "next/navigation";
import { updateMyJob } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canDoStaffWork } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function WorkPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/work");
  if (!canDoStaffWork(profile.role, user)) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "maintenance");
  if (access === "none") return <FeatureOff label="My work" />;

  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("on_duty").eq("user_id", user.id).maybeSingle();
  let query = admin
    .from("work_orders")
    .select("id, title, place, body, status")
    .order("created_at", { ascending: false })
    .limit(40);
  if (profile.role === "staff") query = query.eq("assignee_user_id", user.id);
  const { data, error } = await query;
  if (error) return <DeskError message={error.message} />;

  const jobs = data ?? [];
  const groups = [
    { title: "Needs action", rows: jobs.filter((job) => job.status !== "done") },
    { title: "Done", rows: jobs.filter((job) => job.status === "done") },
  ];

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Work</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">My work</h1>
      <p className="mt-2 text-[#475569]">{me?.on_duty ? "You are on duty today." : "You are off duty today."}</p>
      {groups.map((group) => (
        <section key={group.title} className="mt-6">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">{group.title}</h2>
          <ul className="mt-3 grid gap-3">
            {group.rows.map((job) => (
              <li key={job.id} className="slab p-4">
                <h3 className="font-semibold text-[#0f172a]">{job.title}</h3>
                <p className="text-sm text-[#475569]">{job.place}{job.body ? ` · ${job.body}` : ""}</p>
                {access === "manage" && job.status !== "done" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={updateMyJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="status" value="in_progress" />
                      <button type="submit" className="btn-line">Start</button>
                    </form>
                    <form action={updateMyJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="status" value="done" />
                      <button type="submit" className="btn-slate">Done</button>
                    </form>
                  </div>
                ) : (
                  <p className="badge-ok mt-3">Done</p>
                )}
              </li>
            ))}
            {!group.rows.length ? <li className="text-sm text-[#475569]">Nothing here.</li> : null}
          </ul>
        </section>
      ))}
    </section>
  );
}
