import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addEnquiryField,
  deleteEnquiryField,
  moveEnquiryField,
  saveEnquirySettings,
  setEnquiryClosed,
  updateEnquiryField,
} from "@/app/actions/enquiries";
import { CopyLink } from "@/components/CopyLink";
import { EnquiryResults } from "@/components/EnquiryResults";
import {
  ChoiceField,
  Form,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
  WorkspaceHeader,
} from "@/components/form-ui";
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

  return (
    <section>
      <WorkspaceHeader
        title={enquiry.title}
        lede={enquiry.closedAt ? "Closed. Answers are kept." : "Open for answers."}
        action={
          <Link href="/account/forms" className="text-sm font-semibold text-[#1b3a2f]">
            All forms
          </Link>
        }
      />
      <div className="mt-4">
        <CopyLink href={link} />
      </div>

      <Form action={saveEnquirySettings} className="mt-6 grid max-w-xl gap-4">
        <input type="hidden" name="id" value={enquiry.id} />
        <TextField label="Title" name="title" required minLength={2} defaultValue={enquiry.title} />
        <TextAreaField label="Note" name="note" rows={3} defaultValue={enquiry.note} />
        <ChoiceField
          legend="Who can fill it"
          name="visibility"
          defaultValue={enquiry.visibility}
          options={[
            { value: "public", label: "Public" },
            { value: "private", label: "Private" },
          ]}
        />
        <SwitchField
          label="Ask them to sign in"
          hint="If they do not sign in, the form asks for name, phone, and flat."
          name="askSignin"
          defaultChecked={enquiry.askSignin}
        />
        <SelectField
          label="Who can see the results"
          name="resultsView"
          defaultValue={enquiry.resultsView}
          options={RESULT_VIEWS}
        />
        <button type="submit" className="btn btn-gold w-fit">
          Save form
        </button>
      </Form>

      <form action={setEnquiryClosed.bind(null, enquiry.id, !enquiry.closedAt)} className="mt-3">
        <button type="submit" className="btn btn-ghost">
          {enquiry.closedAt ? "Open again" : "Close form"}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-semibold text-[#14241c]">Questions</h2>
      <ol className="mt-3 grid max-w-xl gap-3">
        {fields.map((field, index) => (
          <li
            key={field.id}
            className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.1)]"
          >
            <Form action={updateEnquiryField} className="grid gap-3">
              <input type="hidden" name="id" value={field.id} />
              <input type="hidden" name="enquiryId" value={enquiry.id} />
              <p className="text-xs font-semibold tracking-wide text-[#5a6e62] uppercase">
                {FIELD_KINDS.find((kind) => kind.value === field.kind)?.label}
              </p>
              <TextField label="Label" name="label" required minLength={2} defaultValue={field.label} />
              {field.kind === "choice" ? (
                <TextAreaField
                  label="Choices"
                  name="choices"
                  required
                  rows={3}
                  defaultValue={field.choices.join("\n")}
                  hint="One choice on each line."
                />
              ) : null}
              <SwitchField label="Required" name="required" defaultChecked={field.required} />
              <button type="submit" className="btn btn-forest w-fit">
                Save question
              </button>
            </Form>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={moveEnquiryField.bind(null, enquiry.id, field.id, -1)}>
                <button type="submit" className="btn btn-ghost" disabled={index === 0}>
                  Up
                </button>
              </form>
              <form action={moveEnquiryField.bind(null, enquiry.id, field.id, 1)}>
                <button type="submit" className="btn btn-ghost" disabled={index === fields.length - 1}>
                  Down
                </button>
              </form>
              {answeredFieldIds.has(field.id) ? (
                <p className="self-center text-sm text-[#3d5247]">
                  Kept, because people already answered it.
                </p>
              ) : (
                <form action={deleteEnquiryField.bind(null, enquiry.id, field.id)}>
                  <button type="submit" className="btn btn-ghost">
                    Remove
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ol>

      <Form action={addEnquiryField} resetOnSuccess className="mt-6 grid max-w-xl gap-3">
        <h2 className="text-xl font-semibold text-[#14241c]">Add a question</h2>
        <input type="hidden" name="enquiryId" value={enquiry.id} />
        <TextField label="Label" name="label" required minLength={2} />
        <SelectField label="Type" name="kind" required defaultValue="text" options={FIELD_KINDS} />
        <TextAreaField
          label="Choices"
          name="choices"
          rows={3}
          hint="Only for a choice question. One choice on each line."
        />
        <SwitchField label="Required" name="required" />
        <button type="submit" className="btn btn-gold w-fit">
          Add question
        </button>
      </Form>

      <EnquiryResults fields={fields} answers={answers} />
    </section>
  );
}
