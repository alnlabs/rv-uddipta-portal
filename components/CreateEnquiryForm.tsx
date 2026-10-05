"use client";

import { useActionState } from "react";
import { createEnquiry, type EnquiryState } from "@/app/actions/enquiries";
import {
  ChoiceField,
  Form,
  FormAlert,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/form-ui";
import { RESULT_VIEWS } from "@/lib/enquiries";

const initial: EnquiryState = { ok: false, message: "" };

export function CreateEnquiryForm() {
  const [state, action, pending] = useActionState(createEnquiry, initial);

  return (
    <Form handled action={action} className="mt-8 grid max-w-xl gap-4">
      <h2 className="text-xl font-semibold text-[#14241c]">New form</h2>
      <TextField label="Title" name="title" required minLength={2} />
      <TextAreaField label="Note" name="note" rows={3} />
      <ChoiceField
        legend="Who can fill it"
        name="visibility"
        defaultValue="public"
        options={[
          { value: "public", label: "Public" },
          { value: "private", label: "Private" },
        ]}
      />
      <SwitchField
        label="Ask them to sign in"
        hint="If they do not sign in, the form asks for name, phone, and flat."
        name="askSignin"
      />
      <SelectField
        label="Who can see the results"
        name="resultsView"
        defaultValue="community"
        options={RESULT_VIEWS}
      />
      {state.message ? <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert> : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-fit">
        {pending ? "Creating…" : "Create form"}
      </button>
    </Form>
  );
}
