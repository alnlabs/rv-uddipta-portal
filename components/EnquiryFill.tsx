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
  if (field.kind === "long") {
    return (
      <TextAreaField
        label={field.label}
        name={name}
        required={field.required}
        defaultValue={value}
        rows={4}
      />
    );
  }
  if (field.kind === "date") {
    return (
      <DateField
        label={field.label}
        name={name}
        required={field.required}
        defaultValue={value}
      />
    );
  }
  if (field.kind === "choice") {
    return (
      <ChoiceField
        legend={field.label}
        name={name}
        defaultValue={value}
        options={field.choices.map((choice) => ({ value: choice, label: choice }))}
      />
    );
  }
  return (
    <TextField label={field.label} name={name} required={field.required} defaultValue={value} />
  );
}

export function EnquiryFill({
  slug,
  fields,
  defaults,
  identity,
  closed,
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
}) {
  const [state, action, pending] = useActionState(submitEnquiry, initial);
  const askName = !identity.name;
  const askPhone = !identity.phone;
  const askFlat = !identity.flatNumber;

  if (closed) {
    return (
      <p className="mt-4 rounded-2xl bg-[#fffcf5] px-4 py-3 text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
        This form is closed. New answers are not accepted.
      </p>
    );
  }

  return (
    <Form handled action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      {askName ? null : <input type="hidden" name="name" value={identity.name} />}
      {askPhone ? null : <input type="hidden" name="phone" value={identity.phone} />}
      {askFlat ? null : <input type="hidden" name="flatNumber" value={identity.flatNumber} />}
      {identity.name || identity.flatNumber ? (
        <p className="text-sm text-[#3d5247]">
          Answering as {[identity.name, identity.flatNumber].filter(Boolean).join(" · ")}.
        </p>
      ) : null}
      {askName || askPhone || askFlat ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {askName ? (
            <TextField label="Your name" name="name" required minLength={2} autoComplete="name" />
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
            />
          ) : null}
          {askFlat ? (
            <TextField
              label="Flat"
              name="flatNumber"
              required
              placeholder="A101"
              autoCapitalize="characters"
            />
          ) : null}
        </div>
      ) : null}
      {fields.map((field) => (
        <QuestionField key={field.id} field={field} value={defaults[field.id] ?? ""} />
      ))}
      {state.message ? (
        <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-full sm:w-fit">
        {pending ? "Sending…" : "Send"}
      </button>
    </Form>
  );
}
