import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canRunJobs } from "@/lib/areaOwners";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!(await canRunJobs(member.profile.role, member.user))) {
    return mobileJson({ message: "Jobs are for the repairs desk." }, 403);
  }
  const access = await desk(member, "maintenance");
  if (access === "none") return mobileJson({ message: "Jobs are turned off." }, 403);

  const admin = createAdminClient();
  const [{ data: jobs, error }, { data: staff }] = await Promise.all([
    admin.from("work_orders").select("id, title, place, body, status, assignee_user_id").order("created_at", { ascending: false }).limit(40),
    admin.from("profiles").select("user_id, display_name, role, on_duty").in("role", ["staff", "facility"]),
  ]);
  if (error) return mobileJson({ message: error.message }, 500);
  const names = new Map((staff ?? []).map((person) => [person.user_id, person.display_name || person.role]));
  return mobileJson({
    canManage: access === "manage",
    people: (staff ?? []).map((person) => ({
      id: person.user_id,
      name: person.display_name || person.role,
      onDuty: Boolean(person.on_duty),
    })),
    jobs: (jobs ?? []).map((job) => ({
      id: job.id,
      title: job.title,
      place: job.place || "",
      body: job.body || "",
      status: job.status === "in_progress" ? "In progress" : job.status === "done" ? "Done" : "Open",
      state: job.status,
      assigneeId: job.assignee_user_id || null,
      who: job.assignee_user_id ? names.get(job.assignee_user_id) || "Assigned" : "Unassigned",
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!(await canRunJobs(member.profile.role, member.user))) {
    return mobileJson({ message: "Jobs are for the repairs desk." }, 403);
  }
  const access = await desk(member, "maintenance");
  if (access !== "manage") return mobileJson({ message: "You can see the jobs. You cannot change them." }, 403);

  const body = await request.json().catch(() => null);
  const admin = createAdminClient();
  const personId = String(body?.personId || "");
  if (personId) {
    const { data: person } = await admin
      .from("profiles")
      .select("user_id, role")
      .eq("user_id", personId)
      .maybeSingle();
    if (!person || (person.role !== "staff" && person.role !== "facility")) {
      return mobileJson({ message: "Choose someone from facility or service staff." }, 400);
    }
    const onDuty = Boolean(body?.onDuty);
    const { error } = await admin.from("profiles").update({ on_duty: onDuty }).eq("user_id", personId);
    if (error) return mobileJson({ message: error.message }, 500);
    await writeAudit({
      actorUserId: member.user.id,
      actorName: member.name,
      action: onDuty ? "Marked someone on duty" : "Marked someone off duty",
      subject: personId,
    });
    revalidatePath("/account/jobs");
    revalidatePath("/work");
    return mobileJson({ ok: true, message: onDuty ? "On duty." : "Off duty." });
  }

  const jobId = Number(body?.jobId || 0);
  if (jobId) {
    const assignee = String(body?.assignee || "");
    const status = String(body?.status || "");
    const patch: { assignee_user_id?: string | null; status?: string } = {};
    if (assignee) {
      const { data: person } = await admin
        .from("profiles")
        .select("user_id, role")
        .eq("user_id", assignee)
        .maybeSingle();
      if (!person || (person.role !== "staff" && person.role !== "facility")) {
        return mobileJson({ message: "Choose someone from facility or service staff." }, 400);
      }
      patch.assignee_user_id = assignee;
    }
    if (["open", "in_progress", "done"].includes(status)) patch.status = status;
    if (!Object.keys(patch).length) return mobileJson({ message: "Choose an assignee or status." }, 400);
    const { data: existing } = await admin.from("work_orders").select("id").eq("id", jobId).maybeSingle();
    if (!existing) return mobileJson({ message: "That job is gone." }, 404);
    const { error } = await admin.from("work_orders").update(patch).eq("id", jobId);
    if (error) return mobileJson({ message: error.message }, 500);
    if (status === "done") {
      const { data: linked } = await admin.from("work_orders").select("source_note_id").eq("id", jobId).maybeSingle();
      if (linked?.source_note_id) {
        await admin.from("member_notes").update({ status: "done" }).eq("id", linked.source_note_id);
      }
    }
    await writeAudit({
      actorUserId: member.user.id,
      actorName: member.name,
      action: "Updated a job",
      subject: String(jobId),
      detail: status || assignee,
    });
    revalidatePath("/account/jobs");
    revalidatePath("/work");
    return mobileJson({ ok: true, message: "Job updated." });
  }

  const title = String(body?.title || "").trim();
  const place = String(body?.place || "").trim();
  const note = String(body?.body || "").trim();
  if (title.length < 2) return mobileJson({ message: "Name the job." }, 400);
  const { error } = await admin.from("work_orders").insert({ title, place, body: note, status: "open" });
  if (error) return mobileJson({ message: error.message }, 500);
  await writeAudit({
    actorUserId: member.user.id,
    actorName: member.name,
    action: "Opened a job",
    subject: title,
    detail: place,
  });
  revalidatePath("/account/jobs");
  revalidatePath("/work");
  return mobileJson({ ok: true, message: "Job opened." });
}
