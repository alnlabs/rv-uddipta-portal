import { redirect } from "next/navigation";
import { assignWorkOrder, createWorkOrder, setOnDuty } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canRunFacility } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function JobsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canRunFacility(profile.role, user)) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "maintenance");
  if (access === "none") return <FeatureOff label="Jobs" />;

  const admin = createAdminClient();
  const [{ data: jobs, error }, { data: staff }] = await Promise.all([
    admin.from("work_orders").select("id, title, place, body, status, assignee_user_id").order("created_at", { ascending: false }).limit(40),
    admin.from("profiles").select("user_id, display_name, role, on_duty").in("role", ["staff", "facility"]),
  ]);
  if (error) return <DeskError message={error.message} />;
  const names = new Map((staff ?? []).map((person) => [person.user_id, person.display_name || person.role]));

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Jobs</h1>
      <p className="mt-2 text-[#475569]">Who is on duty today, then the jobs and who has each one.</p>
      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">On duty today</h2>
        <ul className="mt-3 grid gap-2">
          {(staff ?? []).map((person) => (
            <li key={person.user_id} className="slab flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold text-[#0f172a]">{person.display_name || person.role}</p>
                <p className="text-sm text-[#475569]">{person.on_duty ? "On duty" : "Off duty"}</p>
              </div>
              {access === "manage" ? (
              <form action={setOnDuty}>
                <input type="hidden" name="personId" value={person.user_id} />
                <input type="hidden" name="onDuty" value={person.on_duty ? "false" : "true"} />
                <button type="submit" className={person.on_duty ? "btn-slate" : "btn-line"}>
                  {person.on_duty ? "On duty" : "Mark on duty"}
                </button>
              </form>
              ) : null}
            </li>
          ))}
          {!staff?.length ? <li className="text-sm text-[#475569]">No facility or service staff yet.</li> : null}
        </ul>
      </section>
      {access === "manage" ? (
      <form action={createWorkOrder} className="slab mt-6 grid gap-3 p-4">
        <input name="title" required placeholder="Job" className="field-control" />
        <input name="place" placeholder="Where" className="field-control" />
        <textarea name="body" placeholder="What needs doing" className="field-control" />
        <button type="submit" className="btn-slate w-fit">Open job</button>
      </form>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {(jobs ?? []).map((job) => (
          <li key={job.id} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{job.status.replaceAll("_", " ")}</p>
            <h2 className="mt-1 text-lg font-semibold text-[#0f172a]">{job.title}</h2>
            <p className="text-sm text-[#475569]">{job.place}{job.body ? ` · ${job.body}` : ""}</p>
            <p className="mt-1 text-sm text-[#475569]">
              {job.assignee_user_id ? names.get(job.assignee_user_id) || "Assigned" : "Unassigned"}
            </p>
            {access === "manage" ? (
            <form action={assignWorkOrder} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="jobId" value={job.id} />
              <select name="assignee" defaultValue={job.assignee_user_id || ""} className="field-control max-w-xs">
                <option value="">Assign</option>
                {(staff ?? []).map((person) => (
                  <option key={person.user_id} value={person.user_id}>
                    {person.display_name || person.role}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={job.status} className="field-control max-w-[12rem]">
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
              <button type="submit" className="btn-slate">Save</button>
            </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
