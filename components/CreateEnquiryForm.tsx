"use client";

import { useActionState } from "react";
import { createEnquiry, type EnquiryState } from "@/app/actions/enquiries";
import { EnquirySettingsFields } from "@/components/EnquirySettingsFields";
import { Form, FormAlert } from "@/components/form-ui";

const initial: EnquiryState = { ok: false, message: "" };

export function CreateEnquiryForm() {
  const [state, action, pending] = useActionState(createEnquiry, initial);

  return (
    <Form handled action={action} className="form-sheet grid gap-5">
      <div>
        <p className="eyebrow">New form</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
          Create a form
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#3d5247]">
          Start with a title and who it is for. You add the questions on the next screen.
        </p>
      </div>
      <EnquirySettingsFields />
      {state.message ? <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert> : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-full sm:w-fit">
        {pending ? "Creating…" : "Create form"}
      </button>
    </Form>
  );
}
