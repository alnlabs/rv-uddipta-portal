"use client";

import { useActionState, useState } from "react";
import { createEnquiry, type EnquiryState } from "@/app/actions/enquiries";
import { EnquirySettingsFields } from "@/components/EnquirySettingsFields";
import { Form, FormAlert } from "@/components/form-ui";

const initial: EnquiryState = { ok: false, message: "" };

export function CreateEnquiryForm() {
  const [state, action, pending] = useActionState(createEnquiry, initial);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Form handled action={action} className="form-sheet grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">New form</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
            Create a form
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#3d5247]">
            Start with the title. You add the questions on the next screen.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
            className="btn btn-ghost ring-1 ring-[rgba(27,58,47,0.14)]"
          >
            {settingsOpen ? "Hide settings" : "Settings"}
          </button>
          {settingsOpen ? null : (
            <p className="text-sm leading-relaxed text-[#3d5247]">
              Anyone with the link can open it. The community can see the answers.
            </p>
          )}
        </div>
      </div>
      <EnquirySettingsFields part="content" />
      <div className={settingsOpen ? "grid gap-5" : "hidden"}>
        <EnquirySettingsFields part="access" />
      </div>
      {state.message ? <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert> : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-full sm:w-fit">
        {pending ? "Creating…" : "Create form"}
      </button>
    </Form>
  );
}
