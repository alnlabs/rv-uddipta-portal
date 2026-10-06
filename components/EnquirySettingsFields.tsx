"use client";

import { useState } from "react";
import {
  ChoiceField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/form-ui";
import { RESULT_VIEWS, VISIBILITY_OPTIONS } from "@/lib/enquiries";

export function EnquirySettingsFields({
  defaults,
  part = "all",
}: {
  readonly defaults?: {
    title?: string
    note?: string
    visibility?: string
    askSignin?: boolean
    resultsView?: string
  }
  readonly part?: "all" | "content" | "access"
}) {
  const [view, setView] = useState(defaults?.resultsView || "community");
  const viewHint = RESULT_VIEWS.find((item) => item.value === view)?.hint;
  const content = part === "all" || part === "content";
  const access = part === "all" || part === "access";

  return (
    <div className="@container">
    <div className="grid gap-5 @3xl:grid-cols-2">
      {content ? (
        <>
          <TextField
            label="Form title"
            name="title"
            required
            minLength={2}
            defaultValue={defaults?.title}
            placeholder="Weekend parking poll"
            hint="This is the heading people see when they open the form."
          />
          <TextAreaField
            label="Introduction"
            name="note"
            rows={4}
            defaultValue={defaults?.note}
            placeholder="Tell residents what this is for, and when you need the answer."
            hint="A short note under the title. Leave it blank if the title is enough."
          />
        </>
      ) : null}
      {access ? (
        <>
          <div className="@3xl:col-span-2">
            <ChoiceField
              legend="Who can open it"
              name="visibility"
              layout="stack"
              defaultValue={defaults?.visibility || "public"}
              options={VISIBILITY_OPTIONS}
            />
          </div>
          <SwitchField
            label="Ask them to sign in"
            hint="Signing in fills their name and flat. If they skip it, the form still asks for name, phone, and flat."
            name="askSignin"
            defaultChecked={defaults?.askSignin}
          />
          <SelectField
            label="Who can see the answers"
            name="resultsView"
            value={view}
            onChange={setView}
            options={RESULT_VIEWS.map(({ value, label }) => ({ value, label }))}
            hint={viewHint}
          />
        </>
      ) : null}
    </div>
    </div>
  );
}
