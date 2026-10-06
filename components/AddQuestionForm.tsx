"use client";

import { useState } from "react";
import { addEnquiryField } from "@/app/actions/enquiries";
import { Form, SelectField, SwitchField, TextAreaField, TextField } from "@/components/form-ui";
import { FIELD_KINDS } from "@/lib/enquiries";

export function AddQuestionForm({ enquiryId }: { readonly enquiryId: number }) {
  const [kind, setKind] = useState("text");
  const kindHint = FIELD_KINDS.find((item) => item.value === kind)?.hint;

  return (
    <Form action={addEnquiryField} resetOnSuccess className="form-sheet grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="eyebrow">New question</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
          Add a question
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3d5247]">
          Write it the way you would ask a neighbour. You can reorder questions after they are added.
        </p>
      </div>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <TextField
        label="Question"
        name="label"
        required
        minLength={2}
        tone="question"
        placeholder="Which date works for you?"
      />
      <SelectField
        label="How they answer"
        name="kind"
        required
        tone="question"
        value={kind}
        onChange={setKind}
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
          placeholder={"Morning\nEvening\nEither is fine"}
          hint="One option on each line. People can pick one. At least two."
          className="md:col-span-2"
        />
      ) : null}
      <div className="md:col-span-2">
        <SwitchField
          label="They must answer this"
          hint="The form will not send until this question is filled in."
          name="required"
        />
      </div>
      <button type="submit" className="btn btn-gold w-full sm:w-fit md:col-span-2">
        Add question
      </button>
    </Form>
  );
}
