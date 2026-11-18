"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { flushDueReminders, saveSocietyReminder } from "@/app/actions/society-catalog";
import type { SocietyReminder, SocietyWork } from "@/lib/societyCatalog";
import { t } from "@/lib/labelDefaults";

export function SocietyRemindersPanel({
  reminders,
  work,
  labels,
}: {
  readonly reminders: SocietyReminder[]
  readonly work: SocietyWork[]
  readonly labels: Record<string, string>
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="mt-6 space-y-6">
      <p className="max-w-2xl text-sm text-[#475569]">{t(labels, "help_reminders")}</p>
      {error ? <p className="text-sm text-[#b91c1c]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#15803d]">{notice}</p> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setNotice(null);
          startTransition(async () => {
            const result = await flushDueReminders();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setNotice(`${t(labels, "send_due_reminders")}: ${result.sent ?? 0}`);
            router.refresh();
          });
        }}
      >
        <button type="submit" disabled={pending} className="btn-slate">
          {pending ? t(labels, "sending") : t(labels, "send_due_reminders")}
        </button>
      </form>

      <form
        action={(formData) => {
          setError(null);
          setNotice(null);
          startTransition(async () => {
            const result = await saveSocietyReminder(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setNotice(t(labels, "reminder_saved"));
            router.refresh();
          });
        }}
        className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]"
      >
        <h2 className="text-lg font-semibold text-[#0f172a]">{t(labels, "set_reminder")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "work")}</span>
            <select name="task_key" required className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2">
              <option value="">{t(labels, "select")}</option>
              {work.filter((item) => item.enabled).map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "when")}</span>
            <select name="anchor" defaultValue="absolute" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2">
              <option value="absolute">{t(labels, "at_datetime")}</option>
              <option value="start">{t(labels, "before_start")}</option>
              <option value="end">{t(labels, "before_end")}</option>
              <option value="repeat">{t(labels, "repeat")}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "date_time")}</span>
            <input name="remind_at" type="datetime-local" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "minutes_before")}</span>
            <input name="offset_minutes" type="number" defaultValue={0} className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "repeat")}</span>
            <select name="repeat" defaultValue="none" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2">
              <option value="none">{t(labels, "none")}</option>
              <option value="daily">{t(labels, "daily")}</option>
              <option value="weekly">{t(labels, "weekly")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[#334155] sm:mt-6">
            <input type="checkbox" name="keep_informed" value="true" defaultChecked />
            {t(labels, "keep_informed")}
          </label>
        </div>
        <input type="hidden" name="keep_informed" value="false" />
        <button type="submit" disabled={pending} className="btn-slate mt-4">
          {pending ? t(labels, "saving") : t(labels, "add")}
        </button>
      </form>

      <ul className="grid gap-3">
        {reminders.map((item) => (
          <li key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
            <p className="font-semibold text-[#0f172a]">{item.task_label}</p>
            <p className="mt-1 text-sm text-[#475569]">
              {item.anchor === "absolute"
                ? t(labels, "at_datetime")
                : item.anchor === "start"
                  ? t(labels, "before_start")
                  : item.anchor === "end"
                    ? t(labels, "before_end")
                    : t(labels, "repeat")}
              {item.remind_at ? ` · ${new Date(item.remind_at).toLocaleString()}` : ""}
              {item.repeat !== "none" ? ` · ${t(labels, item.repeat)}` : ""}
              {item.keep_informed ? ` · ${t(labels, "keep_informed")}` : ""}
              {item.enabled ? "" : ` · ${t(labels, "off")}`}
            </p>
            {item.last_sent_at ? (
              <p className="mt-1 text-xs text-[#64748b]">
                {t(labels, "last_sent")} {new Date(item.last_sent_at).toLocaleString()}
              </p>
            ) : null}
            <form
              className="mt-3"
              action={(formData) => {
                setError(null);
                startTransition(async () => {
                  const result = await saveSocietyReminder(formData);
                  if (!result.ok) setError(result.error);
                  else router.refresh();
                });
              }}
            >
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="task_key" value={item.task_key} />
              <input type="hidden" name="anchor" value={item.anchor} />
              <input type="hidden" name="repeat" value={item.repeat} />
              <input type="hidden" name="offset_minutes" value={item.offset_minutes} />
              <input type="hidden" name="keep_informed" value={item.keep_informed ? "true" : "false"} />
              <input type="hidden" name="enabled" value={item.enabled ? "false" : "true"} />
              {item.remind_at ? <input type="hidden" name="remind_at" value={item.remind_at} /> : null}
              <button type="submit" disabled={pending} className="btn-line">
                {item.enabled ? t(labels, "turn_off") : t(labels, "turn_on")}
              </button>
            </form>
          </li>
        ))}
        {!reminders.length ? (
          <li className="text-sm text-[#64748b]">{t(labels, "no_reminders_yet")}</li>
        ) : null}
      </ul>
    </div>
  );
}
