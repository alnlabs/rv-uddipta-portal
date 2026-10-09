import { redirect } from "next/navigation";
import { answerNote, deleteNote, editOwnNote, reopenNote, submitNote } from "@/app/actions/updates";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { ChoiceField, Form, TextAreaField } from "@/components/form-ui";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { disabledRequestKinds, loadCategoryLabels } from "@/lib/features";
import { loadNoteThreads, type NoteMessage } from "@/lib/requestThread";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  waiting: "Waiting on you",
  done: "Done",
  open: "New",
  read: "Waiting on you",
};

export default async function MyRequestsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/requests");
  if (!isCommunityRole(profile.role)) redirect("/register");
  const access = await resolveDeskAccess(profile.role, user, "requests");
  if (access === "none") return <FeatureOff label="Requests" />;
  const [closed, labels] = await Promise.all([disabledRequestKinds(), loadCategoryLabels()]);
  const kinds = [
    !closed.includes("request")
      ? { value: "request", label: labels.request || "Request", hint: "Ask the office to do something." }
      : null,
    !closed.includes("feedback")
      ? { value: "feedback", label: labels.feedback || "Feedback", hint: "Tell the office what you think." }
      : null,
  ].filter((item): item is { value: string; label: string; hint: string } => item != null);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("member_notes")
    .select("id, kind, body, status, admin_reply, created_at, image_url")
    .eq("author_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return <DeskError message={error.message} />;
  const notes = data ?? [];
  const threads = await loadNoteThreads(notes.map((note) => note.id as number));
  const noteIds = notes.map((note) => note.id as number);
  const { data: jobs } = noteIds.length
    ? await admin
        .from("work_orders")
        .select("source_note_id, assignee_user_id, status")
        .in("source_note_id", noteIds)
    : { data: [] as { source_note_id: number | null; assignee_user_id: string | null; status: string }[] };
  const assigneeIds = [...new Set((jobs ?? []).map((job) => job.assignee_user_id).filter(Boolean))] as string[];
  const { data: workers } = assigneeIds.length
    ? await admin.from("profiles").select("user_id, display_name").in("user_id", assigneeIds)
    : { data: [] as { user_id: string; display_name: string | null }[] };
  const workerName = new Map((workers ?? []).map((person) => [person.user_id, person.display_name || "Staff"]));
  const workerFor = new Map<number, string>();
  for (const job of jobs ?? []) {
    if (job.source_note_id && job.assignee_user_id && job.status !== "done") {
      workerFor.set(job.source_note_id, workerName.get(job.assignee_user_id) || "Staff");
    }
  }

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Services</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Requests</h1>
      <p className="mt-2 text-[#475569]">
        Send the office a request or feedback. They can write back, and you can answer until it is done.
      </p>
      {access === "manage" && kinds.length ? (
        <Form action={submitNote} success="Sent." className="field-panel mt-6 grid gap-4">
          {kinds.length > 1 ? (
            <ChoiceField legend="What is this?" name="kind" required defaultValue={kinds[0].value} layout="stack" options={kinds} />
          ) : (
            <input type="hidden" name="kind" value={kinds[0].value} />
          )}
          <TextAreaField label="Your message" name="body" required rows={4} />
          <label className="grid gap-1 text-sm font-semibold text-[#0f172a]">
            Photo
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm font-normal text-[#475569]" />
          </label>
          <button type="submit" className="btn-slate w-fit">Send</button>
        </Form>
      ) : access === "manage" ? (
        <p className="mt-6 text-sm text-[#475569]">New messages are closed. Ones already sent stay below.</p>
      ) : (
        <p className="mt-6 text-sm text-[#475569]">You can see your messages. You cannot send a new one.</p>
      )}
      <ul className="mt-6 grid gap-3">
        {notes.map((note) => {
          const messages = threadFor(threads.get(note.id as number), String(note.body), note.admin_reply);
          const open = note.status !== "done";
          const officeWrote = messages.some((message) => message.fromOffice);
          const canChange = access === "manage" && !officeWrote;
          return (
            <li key={note.id} className="slab p-4">
              <p className="text-sm font-semibold text-[#b45309]">
                {note.kind === "feedback" ? labels.feedback || "Feedback" : labels.request || "Request"}
                {" · "}
                {STATUS_LABEL[note.status] || note.status}
                {workerFor.get(note.id as number) ? ` · With ${workerFor.get(note.id as number)}` : ""}
              </p>
              {note.image_url ? (
                <img src={note.image_url} alt="" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />
              ) : null}
              <ul className="mt-3 grid gap-2">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      message.fromOffice ? "bg-[#f1f5f9] text-[#0f172a]" : "bg-[#ecfdf5] text-[#0f172a]"
                    }`}
                  >
                    <p className="font-semibold">{message.fromOffice ? "Office" : "You"}</p>
                    <p className="mt-1">{message.body}</p>
                  </li>
                ))}
              </ul>
              {canChange ? (
                <div className="mt-3 grid gap-3">
                  <p className="text-sm text-[#475569]">You can edit or delete this until the office writes back.</p>
                  <Form action={editOwnNote} success="Saved." className="grid gap-2">
                    <input type="hidden" name="noteId" value={note.id} />
                    <TextAreaField label="Edit your message" name="body" required rows={3} defaultValue={String(note.body)} />
                    <button type="submit" className="btn-line w-fit">Save</button>
                  </Form>
                  <form action={deleteNote}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <button type="submit" className="text-sm font-semibold text-[#8a2f2f]">Delete</button>
                  </form>
                </div>
              ) : null}
              {note.status === "done" && access === "manage" ? (
                <form action={reopenNote} className="mt-3">
                  <input type="hidden" name="noteId" value={note.id} />
                  <button type="submit" className="btn-line">Reopen</button>
                </form>
              ) : null}
              {open && access === "manage" && officeWrote ? (
                <Form action={answerNote} success="Sent." className="mt-3 grid gap-2">
                  <input type="hidden" name="noteId" value={note.id} />
                  <TextAreaField label="Write back" name="body" required rows={2} />
                  <button type="submit" className="btn-line w-fit">Send</button>
                </Form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function threadFor(saved: NoteMessage[] | undefined, body: string, reply: string | null) {
  if (saved?.length) return saved;
  const messages: NoteMessage[] = [{ id: 0, noteId: 0, body, fromOffice: false, authorName: "You" }];
  if (reply) messages.push({ id: 1, noteId: 0, body: reply, fromOffice: true, authorName: "Office" });
  return messages;
}
