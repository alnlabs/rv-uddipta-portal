"use client";

import { useActionState } from "react";
import { submitEnquiry, type EnquiryState } from "@/app/actions/enquiries";
import { Form, FormAlert } from "@/components/form-ui";
import type { EnquiryField } from "@/lib/enquiries";

const initial: EnquiryState = { ok: false, message: "" };

function EnquiryChoice({
  name,
  options,
  defaultValue,
  required,
}: {
  readonly name: string
  readonly options: string[]
  readonly defaultValue: string
  readonly required: boolean
}) {
  return (
    <div className="enquiry-options" role="radiogroup">
      {options.map((option) => (
        <label key={option} className="enquiry-option">
          <input
            type="radio"
            name={name}
            value={option}
            data-field={name}
            required={required}
            defaultChecked={defaultValue === option}
            className="sr-only peer"
          />
          <span className="enquiry-option-face">{option}</span>
        </label>
      ))}
    </div>
  );
}

function QuestionRow({
  index,
  total,
  field,
  value,
}: {
  readonly index: number
  readonly total: number
  readonly field: EnquiryField
  readonly value: string
}) {
  const name = `q_${field.id}`;
  return (
    <li className="enquiry-row">
      <div className="enquiry-ask">
        <p className="enquiry-ask-num">
          {index + 1}
          <span className="text-[#94a3b8]"> / {total}</span>
        </p>
        <p className="enquiry-ask-label">
          {field.label}
          {field.required ? <span className="enquiry-ask-req"> required</span> : null}
        </p>
      </div>
      <div className="enquiry-answer">
        {field.kind === "choice" ? (
          <EnquiryChoice
            name={name}
            options={field.choices}
            defaultValue={value}
            required={field.required}
          />
        ) : null}
        {field.kind === "date" ? (
          <input
            type="date"
            name={name}
            data-field={name}
            required={field.required}
            defaultValue={value}
            className="enquiry-input"
          />
        ) : null}
        {field.kind === "long" ? (
          <textarea
            name={name}
            data-field={name}
            required={field.required}
            defaultValue={value}
            rows={3}
            className="enquiry-input enquiry-input-long"
            placeholder="Your reply"
          />
        ) : null}
        {field.kind === "text" ? (
          <input
            type="text"
            name={name}
            data-field={name}
            required={field.required}
            defaultValue={value}
            className="enquiry-input"
            placeholder="Your reply"
          />
        ) : null}
      </div>
    </li>
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
  const askName = !identity.name;
  const askPhone = !identity.phone;
  const askFlat = !identity.flatNumber;
  const who = [identity.name, identity.flatNumber].filter(Boolean).join(" · ");

  if (closed) {
    return (
      <p className="mt-6 text-base leading-relaxed text-[#475569]">
        This enquiry is closed. Replies already sent are kept, and new ones are not accepted.
      </p>
    );
  }

  if (fields.length === 0) {
    return (
      <p className="mt-6 text-base leading-relaxed text-[#475569]">
        This enquiry does not have any questions yet.
      </p>
    );
  }

  return (
    <Form handled action={action} className="mt-6">
      <input type="hidden" name="slug" value={slug} />
      {askName ? null : <input type="hidden" name="name" value={identity.name} />}
      {askPhone ? null : <input type="hidden" name="phone" value={identity.phone} />}
      {askFlat ? null : <input type="hidden" name="flatNumber" value={identity.flatNumber} />}

      {who ? (
        <p className="mb-4 text-sm text-[#64748b]">
          {updating ? "Updating reply for" : "Replying as"}{" "}
          <span className="font-medium text-[#0f172a]">{who}</span>
        </p>
      ) : null}

      {askName || askPhone || askFlat ? (
        <div className="mb-6 grid gap-3 border-b border-[rgba(15,23,42,0.08)] pb-6 sm:grid-cols-3">
          {askName ? (
            <label className="grid gap-1 text-sm">
              <span className="text-[#64748b]">Your name</span>
              <input
                name="name"
                required
                minLength={2}
                autoComplete="name"
                className="enquiry-input"
              />
            </label>
          ) : null}
          {askPhone ? (
            <label className="grid gap-1 text-sm">
              <span className="text-[#64748b]">Phone</span>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                required
                autoComplete="tel"
                placeholder="10-digit mobile"
                className="enquiry-input"
              />
            </label>
          ) : null}
          {askFlat ? (
            <label className="grid gap-1 text-sm">
              <span className="text-[#64748b]">Flat</span>
              <input
                name="flatNumber"
                required
                placeholder="A101"
                autoCapitalize="characters"
                className="enquiry-input"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <ol className="enquiry-sheet">
        {fields.map((field, index) => (
          <QuestionRow
            key={field.id}
            index={index}
            total={fields.length}
            field={field}
            value={defaults[field.id] ?? ""}
          />
        ))}
      </ol>

      {state.message ? (
        <div className="mt-4">
          <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#64748b]">
          {updating
            ? "Save to replace your earlier reply."
            : "One reply per flat. You can change it later."}
        </p>
        <button type="submit" disabled={pending} className="btn-slate w-full shrink-0 sm:w-auto">
          {pending ? "Saving…" : updating ? "Save reply" : "Send reply"}
        </button>
      </div>
    </Form>
  );
}
