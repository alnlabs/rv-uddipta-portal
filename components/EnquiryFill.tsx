"use client";

import { useActionState } from "react";
import { submitEnquiry, type EnquiryState } from "@/app/actions/enquiries";
import {
  ChoiceField,
  DateField,
  Form,
  FormAlert,
  TextAreaField,
  TextField,
} from "@/components/form-ui";
import type { EnquiryField } from "@/lib/enquiries";

const initial: EnquiryState = { ok: false, message: "" };

function QuestionField({
  field,
  value,
}: {
  readonly field: EnquiryField
  readonly value: string
}) {
  const name = `q_${field.id}`;
  const shared = {
    label: field.label,
    name,
    required: field.required,
    tone: "question" as const,
  };
  if (field.kind === "long") {
    return <TextAreaField {...shared} defaultValue={value} rows={5} />;
  }
  if (field.kind === "date") {
    return <DateField {...shared} defaultValue={value} />;
  }
  if (field.kind === "choice") {
    return (
      <ChoiceField
        legend={field.label}
        name={name}
        required={field.required}
        tone="question"
        layout="stack"
        defaultValue={value}
        options={field.choices.map((choice) => ({ value: choice, label: choice }))}
      />
    );
  }
  return <TextField {...shared} defaultValue={value} />;
}

export function EnquiryFill({
  slug,
  fields,
  defaults,
  identity,
  closed,
  updating,
}: {
  readonly slug: string
  readonly fields: EnquiryField[]
  readonly defaults: Record<number, string>
  readonly identity: {
    name: string
    phone: string
    flatNumber: string
  }
  readonly closed: boolean
  readonly updating: boolean
}) {
  const [state, action, pending] = useActionState(submitEnquiry, initial);
  const askName = !identity.name;
  const askPhone = !identity.phone;
  const askFlat = !identity.flatNumber;
  const who = [identity.name, identity.flatNumber].filter(Boolean).join(" · ");

  if (closed) {
    return (
      <p className="form-sheet mt-5 text-base leading-relaxed text-[#3d5247]">
        This form is closed. Answers already sent are kept, and new ones are not accepted.
      </p>
    );
  }

  if (fields.length === 0) {
    return (
      <p className="form-sheet mt-5 text-base leading-relaxed text-[#3d5247]">
        This form does not have any questions yet.
      </p>
    );
  }

  return (
    <Form handled action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      {askName ? null : <input type="hidden" name="name" value={identity.name} />}
      {askPhone ? null : <input type="hidden" name="phone" value={identity.phone} />}
      {askFlat ? null : <input type="hidden" name="flatNumber" value={identity.flatNumber} />}

      {who ? (
        <div className="rounded-[1.5rem] bg-[#14241c] px-5 py-4 text-[#f7f2e6] md:px-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#e8d5a3] uppercase">
            Answering as
          </p>
          <p className="mt-1 text-lg font-semibold">{who}</p>
        </div>
      ) : null}

      {askName || askPhone || askFlat ? (
        <section className="form-sheet">
          <h2 className="text-xl font-semibold tracking-tight text-[#14241c]">Your details</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#3d5247]">
            So the answer is tied to the right flat. One answer is kept per flat.
          </p>
          <div className="mt-5 grid gap-4">
            {askName ? (
              <TextField
                label="Your name"
                name="name"
                required
                minLength={2}
                autoComplete="name"
                tone="question"
              />
            ) : null}
            {askPhone ? (
              <TextField
                label="Phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                required
                autoComplete="tel"
                placeholder="10-digit mobile"
                tone="question"
              />
            ) : null}
            {askFlat ? (
              <TextField
                label="Flat"
                name="flatNumber"
                required
                placeholder="A101"
                autoCapitalize="characters"
                tone="question"
                hint="Wing and number, such as A101 or B1004."
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {fields.map((field, index) => (
        <section key={field.id} className="form-sheet">
          <p className="text-sm font-semibold text-[#7a5c22]">
            Question {index + 1} of {fields.length}
          </p>
          <div className="mt-3">
            <QuestionField field={field} value={defaults[field.id] ?? ""} />
          </div>
        </section>
      ))}

      {state.message ? <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert> : null}

      <div className="form-sheet flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[#3d5247]">
          {updating
            ? "This flat already has an answer. Sending again replaces it."
            : "Each flat keeps one answer. You can send it again later to update it."}
        </p>
        <button type="submit" disabled={pending} className="btn btn-gold w-full shrink-0 sm:w-auto">
          {pending ? "Sending…" : updating ? "Update answer" : "Send answer"}
        </button>
      </div>
    </Form>
  );
}
