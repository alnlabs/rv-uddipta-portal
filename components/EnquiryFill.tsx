"use client";

import { useActionState, useEffect, useState } from "react";
import { submitEnquiry, type EnquiryState } from "@/app/actions/enquiries";
import {
  ChoiceField,
  DateField,
  Form,
  FormAlert,
  TextAreaField,
  TextField,
} from "@/components/form-ui";
import { formatShortDate } from "@/lib/homeDisplay";
import type { EnquiryField } from "@/lib/enquiries";

const initial: EnquiryState = { ok: false, message: "" };

function displayValue(field: EnquiryField, value: string) {
  const text = value.trim();
  if (!text) return "—";
  if (field.kind === "date") return formatShortDate(text) ?? text;
  return text;
}

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

function YourReply({
  fields,
  defaults,
  who,
  closed,
  onChange,
}: {
  readonly fields: EnquiryField[]
  readonly defaults: Record<number, string>
  readonly who: string
  readonly closed: boolean
  readonly onChange?: () => void
}) {
  return (
    <section className="mt-5">
      <p className="text-sm text-[#64748b]">
        Your reply
        {who ? <span className="text-[#475569]"> · {who}</span> : null}
        {closed ? <span> · closed</span> : null}
      </p>
      <dl className="mt-4 grid gap-4">
        {fields.map((field) => (
          <div key={field.id} className="grid gap-1 sm:grid-cols-[minmax(8rem,16rem)_1fr] sm:gap-6">
            <dt className="text-sm text-[#64748b]">{field.label}</dt>
            <dd className="whitespace-pre-wrap text-base leading-relaxed text-[#0f172a]">
              {displayValue(field, defaults[field.id] ?? "")}
            </dd>
          </div>
        ))}
      </dl>
      {!closed && onChange ? (
        <button type="button" onClick={onChange} className="btn-line mt-6">
          Change reply
        </button>
      ) : null}
    </section>
  );
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
  const [editing, setEditing] = useState(!updating);
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);
  const askName = !identity.name;
  const askPhone = !identity.phone;
  const askFlat = !identity.flatNumber;
  const who = [identity.name, identity.flatNumber].filter(Boolean).join(" · ");

  if (fields.length === 0) {
    return (
      <p className="form-sheet mt-5 text-base leading-relaxed text-[#475569]">
        This enquiry does not have any questions yet.
      </p>
    );
  }

  if (closed) {
    if (updating) {
      return (
        <YourReply fields={fields} defaults={defaults} who={who} closed />
      );
    }
    return (
      <p className="mt-5 text-base leading-relaxed text-[#475569]">
        This enquiry is closed. New replies are not accepted.
      </p>
    );
  }

  if (updating && !editing) {
    return (
      <YourReply
        fields={fields}
        defaults={defaults}
        who={who}
        closed={false}
        onChange={() => setEditing(true)}
      />
    );
  }

  return (
    <Form handled action={action} className="form-sheet mt-5 grid gap-6">
      <input type="hidden" name="slug" value={slug} />
      {askName ? null : <input type="hidden" name="name" value={identity.name} />}
      {askPhone ? null : <input type="hidden" name="phone" value={identity.phone} />}
      {askFlat ? null : <input type="hidden" name="flatNumber" value={identity.flatNumber} />}

      {who ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#475569]">
            Sending as <span className="font-semibold text-[#0f172a]">{who}</span>
          </p>
          {updating ? (
            <button type="button" onClick={() => setEditing(false)} className="text-sm font-semibold text-[#475569]">
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      {askName || askPhone || askFlat ? (
        <section className="grid gap-4 border-b border-[rgba(15,23,42,0.08)] pb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#0f172a]">Your details</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#475569]">
              So the reply is tied to the right flat. One reply is kept per flat.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <ol className="grid gap-6">
        {fields.map((field) => (
          <li key={field.id} className="list-none">
            <QuestionField field={field} value={defaults[field.id] ?? ""} />
          </li>
        ))}
      </ol>

      {state.message ? <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert> : null}

      <div className="flex flex-col gap-3 border-t border-[rgba(15,23,42,0.08)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[#475569]">
          {updating
            ? "Sending again replaces your earlier reply."
            : "Each flat keeps one reply. You can change it later."}
        </p>
        <button type="submit" disabled={pending} className="btn-slate w-full shrink-0 sm:w-auto">
          {pending ? "Sending…" : updating ? "Save reply" : "Send reply"}
        </button>
      </div>
    </Form>
  );
}
