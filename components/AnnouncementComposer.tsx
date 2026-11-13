"use client";

import { useMemo, useState } from "react";
import { postAnnouncement } from "@/app/actions/activity";
import { DateField, Form, SelectField, SwitchField, TextAreaField, TextField } from "@/components/form-ui";
import { planDayLabel } from "@/lib/indiaDay";
import { NOTICE_KINDS, type NoticeKind } from "@/lib/postKinds";

const KIND_META: Record<NoticeKind, { tip: string; example: string }> = {
  announcement: {
    tip: "General news for every home.",
    example: "Water tank cleaning this Saturday",
  },
  maintenance: {
    tip: "Building work, water, lift, or repairs.",
    example: "Lift service — Block A, 10am–2pm",
  },
  meeting: {
    tip: "Society meeting with a clear day.",
    example: "AGM in the clubhouse",
  },
};

export function AnnouncementComposer({
  email,
  whatsapp,
}: {
  readonly email: boolean
  readonly whatsapp: boolean
}) {
  const [kind, setKind] = useState<NoticeKind>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [pin, setPin] = useState(false);

  const meta = KIND_META[kind];
  const previewTitle = title.trim() || meta.example;
  const previewMeta = kind === "meeting"
    ? (planDayLabel(startsOn) || "Pick a meeting day")
    : "Today";

  const reach = useMemo(() => {
    const parts = ["Notices", "Updates"];
    if (email) parts.push("email");
    if (whatsapp) parts.push("WhatsApp");
    return parts.join(" · ");
  }, [email, whatsapp]);

  const kindOptions = NOTICE_KINDS.map((option) => ({
    value: option.value,
    label: option.label,
    hint: KIND_META[option.value].tip,
  }));

  return (
    <Form
      action={postAnnouncement}
      success="Notice published to every home."
      resetOnSuccess
      onReset={() => {
        setTitle("");
        setBody("");
        setStartsOn("");
        setPin(false);
        setKind("announcement");
      }}
      className="field-panel mt-5 grid gap-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">Publish notice</h2>
        <p className="mt-1 text-sm text-[#475569]">
          Official notice for every home. Shows in {reach}.
        </p>
      </div>

      <SelectField
        label="Type"
        name="kind"
        options={kindOptions}
        value={kind}
        onChange={(next) => setKind(next as NoticeKind)}
        required
      />
      <p className="text-sm text-[#64748b]">{meta.tip}</p>

      <TextField
        label="Title"
        name="title"
        required
        minLength={3}
        maxLength={80}
        placeholder={meta.example}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <TextAreaField
        label="Details"
        name="body"
        rows={4}
        placeholder="Optional — place, time, or what residents should do"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />

      {kind === "meeting" ? (
        <DateField
          label="Meeting day"
          name="startsOn"
          required
          notBeforeToday
          value={startsOn}
          onChange={setStartsOn}
        />
      ) : null}

      <SwitchField
        name="pin"
        label="Pin at the top"
        hint="Stays above other notices until you unpin it."
        checked={pin}
        onChange={setPin}
      />

      <div
        className={`rounded-[1.25rem] bg-[#f8fafc] px-4 py-3.5 ring-1 ring-[rgba(15,23,42,0.08)] ${
          pin ? "border-l-4 border-[#b45309]" : "border-l-4 border-[#059669]"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-[#b45309] uppercase">
            {pin ? "Pinned" : NOTICE_KINDS.find((item) => item.value === kind)?.label}
          </p>
          <p className="text-sm text-[#64748b]">{previewMeta}</p>
        </div>
        <p className="mt-1 text-base font-semibold text-[#0f172a]">{previewTitle}</p>
        {body.trim() ? (
          <p className="mt-1 text-sm leading-snug text-[#475569]">{body.trim()}</p>
        ) : (
          <p className="mt-1 text-sm italic text-[#94a3b8]">No details yet</p>
        )}
      </div>

      <button type="submit" className="btn btn-forest w-full sm:w-fit">
        Publish to every home
      </button>
    </Form>
  );
}
