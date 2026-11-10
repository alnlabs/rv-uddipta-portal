"use client";

import { useState } from "react";
import { updateEnquiryField } from "@/app/actions/enquiries";
import { Form, SelectField, SwitchField, TextAreaField, TextField } from "@/components/form-ui";
import { FIELD_KINDS, type EnquiryField } from "@/lib/enquiries";

export function EditQuestionForm({
  enquiryId,
  field,
  index,
}: {
  readonly enquiryId: number
  readonly field: EnquiryField
  readonly index: number
}) {
  const [kind, setKind] = useState(field.kind);
  const kindHint = FIELD_KINDS.find((item) => item.value === kind)?.hint;

  return (
    <Form action={updateEnquiryField} className="grid gap-4">
      <input type="hidden" name="id" value={field.id} />
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#b45309]">Question {index + 1}</p>
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
      <SelectField
        label="How they answer"
        name="kind"
        required
        tone="question"
        value={kind}
        onChange={(next) => setKind(next as EnquiryField["kind"])}
        options={FIELD_KINDS.map(({ value, label }) => ({ value, label }))}
        hint={kindHint}
      />
      {kind === "choice" ? (
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
  );
}
