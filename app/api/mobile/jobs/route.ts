import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canRunFacility } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canRunFacility(member.profile.role, member.user)) return mobileJson({ message: "Jobs are for the facility desk." }, 403);
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
      who: job.assignee_user_id ? names.get(job.assignee_user_id) || "Assigned" : "Unassigned",
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canRunFacility(member.profile.role, member.user)) return mobileJson({ message: "Jobs are for the facility desk." }, 403);
  const access = await desk(member, "maintenance");
  if (access !== "manage") return mobileJson({ message: "You can see the jobs. You cannot change them." }, 403);

  const body = await request.json().catch(() => null);
  const admin = createAdminClient();
  const personId = String(body?.personId || "");
  if (personId) {
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
    return mobileJson({ ok: true });
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
  return mobileJson({ ok: true });
}
