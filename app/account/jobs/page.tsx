import { redirect } from "next/navigation";
import { assignWorkOrder, createWorkOrder, setOnDuty } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { t } from "@/lib/labelDefaults";
import { loadSocietyLabels } from "@/lib/labels";
import { canRunJobs } from "@/lib/areaOwners";
import { canAccessAdminDesk, getAuthState, manageDeskRole } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const JOB_ROLES = [
  { value: "staff", label: "Staff" },
  { value: "facility", label: "Facility" },
  { value: "security", label: "Security" },
] as const;

const FREQUENCIES = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export default async function JobsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  const holdsAdmin = await canAccessAdminDesk();
  const runsJobs = await canRunJobs(profile.role, user);
  if (!(holdsAdmin || runsJobs)) redirect("/");
  const deskRole = holdsAdmin ? (await manageDeskRole()) || "admin" : profile.role;
  const access = await resolveDeskAccess(deskRole, user, "maintenance");
  if (access === "none" && !runsJobs) return <FeatureOff label="Jobs" />;

  const admin = createAdminClient();
  const [{ data: jobs, error }, { data: staff }, { data: workRows }, { data: roleLinks }, { data: extras }, labels] =
    await Promise.all([
      admin
        .from("work_orders")
        .select("id, title, place, body, status, assignee_user_id, assignee_role, frequency, society_task_id")
        .order("created_at", { ascending: false })
        .limit(40),
      admin
        .from("profiles")
        .select("user_id, display_name, role, on_duty")
        .in("role", ["staff", "facility", "security"]),
      admin
        .from("society_tasks")
        .select("id, key, label, summary, duration, enabled, ends_at")
        .eq("enabled", true)
        .order("label"),
      admin.from("society_role_tasks").select("task_id, role_id"),
      admin.from("society_person_tasks").select("user_id, task_id"),
      loadSocietyLabels(),
    ]);
  if (error) return <DeskError message={error.message} />;

  const { data: societyRoles } = await admin
    .from("society_roles")
    .select("id, key")
    .in("key", ["staff", "facility", "security"]);
  const roleIdToKey = new Map((societyRoles ?? []).map((row) => [row.id, row.key]));

  const names = new Map((staff ?? []).map((person) => [person.user_id, person.display_name || person.role]));
  const now = Date.now();
  const work = (workRows ?? []).filter((item) => {
    if (item.duration !== "temporary") return true;
    if (!item.ends_at) return true;
    return new Date(item.ends_at).getTime() > now;
  });
  const workById = new Map(work.map((item) => [item.id, item]));

  const suggestedRoleByTask = new Map<number, string>();
  for (const link of roleLinks ?? []) {
    const key = roleIdToKey.get(link.role_id);
    if (!key || !["staff", "facility", "security"].includes(key)) continue;
    const current = suggestedRoleByTask.get(link.task_id);
    const rank = { staff: 1, facility: 2, security: 3 } as Record<string, number>;
    if (!current || (rank[key] ?? 9) < (rank[current] ?? 9)) {
      suggestedRoleByTask.set(link.task_id, key);
    }
  }

  const holdersByTask = new Map<number, Set<string>>();
  for (const link of roleLinks ?? []) {
    const key = roleIdToKey.get(link.role_id);
    if (!key) continue;
    const set = holdersByTask.get(link.task_id) ?? new Set<string>();
    for (const person of staff ?? []) {
      if (person.role === key) set.add(person.user_id);
    }
    holdersByTask.set(link.task_id, set);
  }
  for (const extra of extras ?? []) {
    const set = holdersByTask.get(extra.task_id) ?? new Set<string>();
    set.add(extra.user_id);
    holdersByTask.set(extra.task_id, set);
  }

  function assigneesForJob(societyTaskId: number | null) {
    const people = staff ?? [];
    if (!societyTaskId) return people;
    const holders = holdersByTask.get(societyTaskId);
    if (!holders?.size) return people;
    const preferred = people.filter((person) => holders.has(person.user_id));
    const rest = people.filter((person) => !holders.has(person.user_id));
    return [...preferred, ...rest];
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Jobs</h1>
      <p className="mt-2 text-[#475569]">
        Pick from the {t(labels, "work_list").toLowerCase()} to set who the job is for. Admins stay{" "}
        {t(labels, "keep_informed").toLowerCase()} on status.
      </p>
      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">On duty today</h2>
        <ul className="mt-3 grid gap-2">
          {(staff ?? []).map((person) => (
            <li key={person.user_id} className="slab flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold text-[#0f172a]">{person.display_name || person.role}</p>
                <p className="text-sm text-[#475569]">
                  {person.role} · {person.on_duty ? "On duty" : "Off duty"}
                </p>
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
          {!staff?.length ? <li className="text-sm text-[#475569]">No facility, staff, or security yet.</li> : null}
        </ul>
      </section>
      {access === "manage" ? (
        <form action={createWorkOrder} className="slab mt-6 grid gap-3 p-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "work_list")}</span>
            <select name="task_key" className="field-control" defaultValue="">
              <option value="">{t(labels, "select")}</option>
              {work.map((item) => {
                const suggested = suggestedRoleByTask.get(item.id);
                return (
                  <option key={item.key} value={item.key}>
                    {item.label}
                    {suggested ? ` → ${suggested}` : ""}
                    {item.duration === "temporary" ? ` · ${t(labels, "temporary_duty")}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#334155]">For role</span>
              <select name="assignee_role" className="field-control" defaultValue="">
                <option value="">Auto from work / none</option>
                {JOB_ROLES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[#334155]">How often</span>
              <select name="frequency" className="field-control" defaultValue="once">
                {FREQUENCIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>
          <input name="title" placeholder="Job (optional if work selected)" className="field-control" />
          <input name="place" placeholder="Where" className="field-control" />
          <textarea name="body" placeholder="What needs doing" className="field-control" />
          <button type="submit" className="btn-slate w-fit">Open job</button>
        </form>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {(jobs ?? []).map((job) => {
          const linked = job.society_task_id ? workById.get(job.society_task_id) : null;
          const holders = job.society_task_id ? holdersByTask.get(job.society_task_id) : null;
          const assigneeOptions = assigneesForJob(job.society_task_id);
          return (
            <li key={job.id} className="slab p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">
                {job.status.replaceAll("_", " ")}
                {job.frequency && job.frequency !== "once" ? ` · ${job.frequency}` : ""}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#0f172a]">{job.title}</h2>
              {linked ? (
                <p className="text-xs text-[#64748b]">
                  {t(labels, "work")}: {linked.label}
                </p>
              ) : null}
              <p className="text-sm text-[#475569]">{job.place}{job.body ? ` · ${job.body}` : ""}</p>
              <p className="mt-1 text-sm text-[#475569]">
                {job.assignee_user_id
                  ? names.get(job.assignee_user_id) || "Assigned"
                  : job.assignee_role
                    ? `For ${job.assignee_role}`
                    : "Unassigned"}
              </p>
              {access === "manage" ? (
                <form action={assignWorkOrder} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="jobId" value={job.id} />
                  <select
                    name="assignee"
                    defaultValue={job.assignee_user_id || ""}
                    className="field-control max-w-xs"
                  >
                    <option value="">Assign</option>
                    {assigneeOptions.map((person) => {
                      const preferred = holders?.has(person.user_id);
                      return (
                        <option key={person.user_id} value={person.user_id}>
                          {preferred ? "★ " : ""}
                          {person.display_name || person.role}
                        </option>
                      );
                    })}
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
          );
        })}
      </ul>
    </section>
  );
}
