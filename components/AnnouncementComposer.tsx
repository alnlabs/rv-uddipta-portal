"use client";

import { useState } from "react";
import { postAnnouncement } from "@/app/actions/activity";
import { DateField, Form, SwitchField, TextAreaField, TextField } from "@/components/form-ui";
import { NOTICE_KINDS, type NoticeKind } from "@/lib/postKinds";

export function AnnouncementComposer({
  email,
  whatsapp,
}: {
  readonly email: boolean
  readonly whatsapp: boolean
}) {
  const [kind, setKind] = useState<NoticeKind>("announcement");

  return (
    <Form
      action={postAnnouncement}
      success="Posted."
      resetOnSuccess
      className="field-panel mt-5 grid gap-3"
    >
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">Post an announcement</h2>
        <p className="mt-1 text-sm text-[#475569]">
          Everyone in the community gets this in Notifications.
          {email ? " It is also emailed." : ""}
          {whatsapp ? " It is also sent on WhatsApp." : ""}
          {" "}
          Only an admin can post one. Pin it to keep it at the top.
        </p>
      </div>
      <fieldset>
        <legend className="field-label mb-2">Type</legend>
        <div className="flex flex-wrap gap-2">
          {NOTICE_KINDS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="peer sr-only"
              />
              <span className="choice-face min-w-[7.5rem] px-3">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <TextField label="Title" name="title" required minLength={3} placeholder="Title" />
      <TextAreaField label="Details" name="body" rows={3} placeholder="Details" />
      {kind === "meeting" ? <DateField label="Meeting date" name="startsOn" required /> : null}
      <SwitchField name="pin" label="Pin at the top" hint="It stays there until you unpin or remove it." />
      <button type="submit" className="btn btn-forest w-full sm:w-fit">
        Post
      </button>
    </Form>
  );
}
