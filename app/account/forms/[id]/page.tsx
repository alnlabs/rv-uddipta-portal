import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteEnquiryField,
  moveEnquiryField,
  saveEnquirySettings,
  setEnquiryClosed,
  updateEnquiryField,
} from "@/app/actions/enquiries";
import { AddQuestionForm } from "@/components/AddQuestionForm";
import { CopyLink } from "@/components/CopyLink";
import { EnquiryResults } from "@/components/EnquiryResults";
import { EnquirySettingsFields } from "@/components/EnquirySettingsFields";
import { FormBuilder } from "@/components/FormBuilder";
import { Form, SwitchField, TextAreaField, TextField, WorkspaceHeader } from "@/components/form-ui";
import { FIELD_KINDS, RESULT_VIEWS } from "@/lib/enquiries";
import { loadAnswers, loadEnquiryById } from "@/lib/enquiryData";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function EnquiryAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/account/forms");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");

  const { id: raw } = await params;
  const id = Number(raw);
  const bundle = Number.isFinite(id) ? await loadEnquiryById(id) : null;
  if (!bundle) notFound();
  const { enquiry, fields } = bundle;
  const answers = await loadAnswers(enquiry.id);
  const answeredFieldIds = new Set(
    answers.flatMap((answer) => Object.keys(answer.values).map(Number)),
  );
  const link = `https://uddipta.vercel.app/f/${enquiry.slug}`;
  const audience = enquiry.visibility === "private" ? "Residents only" : "Anyone with the link";
  const resultsLabel = RESULT_VIEWS.find((item) => item.value === enquiry.resultsView)?.label ?? "The community";
  const settingsSummary = `${audience} · ${resultsLabel}${enquiry.closedAt ? " · Closed" : ""}`;
  const questionWord = fields.length === 1 ? "question" : "questions";
  const questionCount = fields.length
    ? `${fields.length} ${questionWord}. The order here is the order on the form.`
    : "No questions yet. Add the first one below.";

  return (
    <section className="w-full">
      <WorkspaceHeader
        kicker={enquiry.closedAt ? "Closed" : "Open"}
        title={enquiry.title}
        lede={
          enquiry.closedAt
            ? "Closed forms keep the answers already sent. Nobody can send a new one until you open it again."
            : "People with the link can fill this in. Edit the questions here, then share it."
        }
        action={
          <Link href="/account/forms" className="text-sm font-semibold text-[#1b3a2f]">
            All forms
          </Link>
        }
      />

      <div className="mt-5">
        <CopyLink href={link} previewHref={`/f/${enquiry.slug}`} />
      </div>

      <FormBuilder
        summary={settingsSummary}
        heading={
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
              What people answer
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#3d5247]">{questionCount}</p>
          </div>
        }
        settings={
          <>
            <Form action={saveEnquirySettings} className="form-sheet grid gap-5">
              <div>
                <p className="eyebrow">Settings</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
                  About this form
                </h2>
              </div>
              <input type="hidden" name="id" value={enquiry.id} />
              <EnquirySettingsFields
                defaults={{
                  title: enquiry.title,
                  note: enquiry.note,
                  visibility: enquiry.visibility,
                  askSignin: enquiry.askSignin,
                  resultsView: enquiry.resultsView,
                }}
              />
              <button type="submit" className="btn btn-gold w-full sm:w-fit">
                Save settings
              </button>
            </Form>

            <form action={setEnquiryClosed.bind(null, enquiry.id, !enquiry.closedAt)} className="form-sheet">
              <h2 className="text-lg font-semibold text-[#14241c]">
                {enquiry.closedAt ? "Open it again" : "Stop new answers"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#3d5247]">
                {enquiry.closedAt
                  ? "Opening the form lets people send answers again."
                  : "Closing keeps every answer and stops new ones. You can open it later."}
              </p>
              <button type="submit" className="btn btn-ghost mt-4 ring-1 ring-[rgba(27,58,47,0.14)]">
                {enquiry.closedAt ? "Open the form" : "Close the form"}
              </button>
            </form>
          </>
        }
      >
        <div className="grid gap-4">
          <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field, index) => (
              <li key={field.id} className="form-sheet">
                <Form action={updateEnquiryField} className="grid gap-4">
                  <input type="hidden" name="id" value={field.id} />
                  <input type="hidden" name="enquiryId" value={enquiry.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#7a5c22]">
                      Question {index + 1}
                      <span className="ml-2 font-medium text-[#3d5247]">
                        {FIELD_KINDS.find((kind) => kind.value === field.kind)?.label}
                      </span>
                    </p>
                  </div>
                  <TextField
                    label="Question"
                    name="label"
                    required
                    minLength={2}
                    tone="question"
                    defaultValue={field.label}
                    hint="This is the sentence people read."
                  />
                  {field.kind === "choice" ? (
                    <TextAreaField
                      label="Options"
                      name="choices"
                      required
                      rows={4}
                      tone="question"
                      defaultValue={field.choices.join("\n")}
                      hint="One option on each line. People pick one."
                    />
                  ) : null}
                  <SwitchField
                    label="They must answer this"
                    hint="The form will not send until this question is filled in."
                    name="required"
                    defaultChecked={field.required}
                  />
                  <button type="submit" className="btn btn-forest w-full sm:w-fit">
                    Save question
                  </button>
                </Form>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[rgba(27,58,47,0.08)] pt-4">
                  <form action={moveEnquiryField.bind(null, enquiry.id, field.id, -1)}>
                    <button type="submit" className="btn btn-ghost ring-1 ring-[rgba(27,58,47,0.14)]" disabled={index === 0}>
                      Move up
                    </button>
                  </form>
                  <form action={moveEnquiryField.bind(null, enquiry.id, field.id, 1)}>
                    <button
                      type="submit"
                      className="btn btn-ghost ring-1 ring-[rgba(27,58,47,0.14)]"
                      disabled={index === fields.length - 1}
                    >
                      Move down
                    </button>
                  </form>
                  {answeredFieldIds.has(field.id) ? (
                    <p className="text-sm leading-relaxed text-[#3d5247]">
                      This question stays, because people have already answered it.
                    </p>
                  ) : (
                    <form action={deleteEnquiryField.bind(null, enquiry.id, field.id)}>
                      <button type="submit" className="btn btn-danger">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <AddQuestionForm enquiryId={enquiry.id} />
        </div>
      </FormBuilder>

      <EnquiryResults fields={fields} answers={answers} />
    </section>
  );
}
