import { redirect } from "next/navigation";
import { assignRequest, createWorkOrder, setNoteStatus } from "@/app/actions/community-os";
import { deleteNote, replyToNote } from "@/app/actions/updates";
import { Form, TextAreaField, WorkspaceHeader } from "@/components/form-ui";
import { loadCategoryLabels } from "@/lib/features";
import { loadNoteThreads } from "@/lib/requestThread";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");

  const params = await searchParams;
  const kind = params.kind === "feedback" ? "feedback" : "request";
  const labels = await loadCategoryLabels();
  const requestName = labels.request || "Requests";
  const feedbackName = labels.feedback || "Feedback";
  const admin = createAdminClient();
  const [{ data: notes, error }, { data: staff }] = await Promise.all([
    admin
      .from("member_notes")
      .select("id, author_name, flat_number, body, admin_reply, status, kind, created_at, image_url")
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(80),
    admin.from("profiles").select("user_id, display_name, role").in("role", ["staff", "facility"]),
  ]);
  const threads = await loadNoteThreads((notes ?? []).map((note) => note.id as number));
  const noteIds = (notes ?? []).map((note) => note.id as number);
  const { data: jobs } = noteIds.length
    ? await admin.from("work_orders").select("id, source_note_id, assignee_user_id").in("source_note_id", noteIds)
    : { data: [] as { id: number; source_note_id: number | null; assignee_user_id: string | null }[] };
  const jobFor = new Map<number, string | null>();
  for (const job of jobs ?? []) {
    if (job.source_note_id) jobFor.set(job.source_note_id, job.assignee_user_id);
  }
  const staffName = new Map((staff ?? []).map((person) => [person.user_id, person.display_name || person.role]));

  return (
    <section>
      <WorkspaceHeader
        title="Requests"
        lede="Homes send a request or feedback. Write back, and they can answer until you mark it done."
      />

      <div className="mt-4 flex gap-2">
        <a
          href="/account/requests"
          className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
            kind === "request" ? "bg-[#1e293b] text-[#f8fafc]" : "text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)]"
          }`}
        >
          {requestName}
        </a>
        <a
          href="/account/requests?kind=feedback"
          className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
            kind === "feedback" ? "bg-[#1e293b] text-[#f8fafc]" : "text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)]"
          }`}
        >
          {feedbackName}
        </a>
      </div>

      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}

      <ul className="mt-5 grid gap-3 lg:grid-cols-2">
        {(notes ?? []).length === 0 ? (
          <li className="rounded-2xl bg-[#ffffff] p-4 text-[#475569] ring-1 ring-[rgba(15,23,42,0.1)]">
            Nothing here.
          </li>
        ) : (
          (notes ?? []).map((note) => (
            <li
              key={note.id}
              className="rounded-[1.35rem] border-l-4 border-[#059669] bg-[#ffffff] p-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
            >
              <p className="text-sm font-semibold text-[#b45309]">
                {note.author_name}
                {note.flat_number ? ` · ${note.flat_number}` : ""}
                {` · ${note.status === "done" ? "Done" : note.status === "in_progress" ? "In progress" : note.status === "waiting" ? "Waiting" : "New"}`}
              </p>
              <ul className="mt-3 grid gap-2">
                {(threads.get(note.id) ?? [{ id: 0, body: note.body, fromOffice: false }]).map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-sm ${message.fromOffice ? "bg-[#f1f5f9]" : "bg-[#ecfdf5]"}`}
                  >
                    <p className="font-semibold text-[#0f172a]">{message.fromOffice ? "Office" : note.author_name}</p>
                    <p className="mt-1 text-[#0f172a]">{message.body}</p>
                  </li>
                ))}
                {!threads.get(note.id)?.length && note.admin_reply ? (
                  <li className="rounded-xl bg-[#f1f5f9] px-3 py-2 text-sm">
                    <p className="font-semibold text-[#0f172a]">Office</p>
                    <p className="mt-1 text-[#0f172a]">{note.admin_reply}</p>
                  </li>
                ) : null}
              </ul>
              {note.image_url ? (
                <img src={note.image_url} alt="" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />
              ) : null}
              <p className="mt-3 text-sm text-[#475569]">
                {jobFor.get(note.id) ? `With ${staffName.get(jobFor.get(note.id) || "") || "staff"}` : "No one assigned yet."}
              </p>
              <form action={assignRequest} className="mt-2 flex flex-wrap gap-2">
                <input type="hidden" name="noteId" value={note.id} />
                <select name="assignee" required defaultValue={jobFor.get(note.id) || ""} className="field-control max-w-xs">
                  <option value="" disabled>Who is doing this</option>
                  {(staff ?? []).map((person) => (
                    <option key={person.user_id} value={person.user_id}>
                      {person.display_name || person.role}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-line">Assign</button>
              </form>
              <form action={setNoteStatus} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="noteId" value={note.id} />
                <select name="status" defaultValue={note.status === "open" || note.status === "read" ? "new" : note.status} className="field-control max-w-[12rem]">
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="waiting">Waiting on the resident</option>
                  <option value="done">Done</option>
                </select>
                <button type="submit" className="btn-line">Update status</button>
              </form>
              <form action={deleteNote} className="mt-2">
                <input type="hidden" name="noteId" value={note.id} />
                <button type="submit" className="text-sm font-semibold text-[#8a2f2f]">Delete</button>
              </form>
              <form action={createWorkOrder} className="mt-2">
                <input type="hidden" name="noteId" value={note.id} />
                <input type="hidden" name="title" value={note.body.slice(0, 80)} />
                <input type="hidden" name="place" value={note.flat_number || ""} />
                <input type="hidden" name="body" value={note.body} />
                <button type="submit" className="btn-line">Turn into a job</button>
              </form>
              <Form action={replyToNote} success="Reply sent." className="mt-3 grid gap-2">
                <input type="hidden" name="noteId" value={note.id} />
                <TextAreaField
                  label="Write back"
                  name="reply"
                  required
                  rows={2}
                  hint="They can answer until you mark this done."
                />
                <button type="submit" className="btn-slate w-fit">Send</button>
              </Form>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
