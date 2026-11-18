"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSocietyTask } from "@/app/actions/society-catalog";
import type { SocietyWork } from "@/lib/societyCatalog";
import { t } from "@/lib/labelDefaults";

export function SocietyWorkPanel({
  work,
  labels,
}: {
  readonly work: SocietyWork[]
  readonly labels: Record<string, string>
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function onSave(formData: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await saveSocietyTask(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(t(labels, "saved"));
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-6">
      <p className="max-w-2xl text-sm text-[#475569]">{t(labels, "help_work")}</p>
      {error ? <p className="text-sm text-[#b91c1c]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#15803d]">{notice}</p> : null}

      <form action={onSave} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
        <h2 className="text-lg font-semibold text-[#0f172a]">{t(labels, "add_work")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "name")}</span>
            <input name="label" required className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "type")}</span>
            <select name="duration" defaultValue="regular" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2">
              <option value="regular">{t(labels, "regular_duty")}</option>
              <option value="temporary">{t(labels, "temporary_duty")}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-[#334155]">{t(labels, "summary")}</span>
            <input name="summary" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "starts_temporary")}</span>
            <input name="starts_at" type="datetime-local" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "ends_temporary")}</span>
            <input name="ends_at" type="datetime-local" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
        </div>
        <button type="submit" disabled={pending} className="btn-slate mt-4">
          {pending ? t(labels, "saving") : t(labels, "add")}
        </button>
      </form>

      <ul className="grid gap-3">
        {work.map((item) => (
          <li key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
            <form action={onSave} className="grid gap-3">
              <input type="hidden" name="id" value={item.id} />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#0f172a]">{item.label}</p>
                  <p className="text-xs text-[#64748b]">
                    {item.system ? t(labels, "standard") : t(labels, "custom")} ·{" "}
                    {item.duration === "temporary" ? t(labels, "temporary_duty") : t(labels, "regular_duty")}
                    {item.active ? "" : ` · ${t(labels, "inactive")}`}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-[#334155]">
                  <input type="checkbox" name="enabled" defaultChecked={item.enabled} />
                  {t(labels, "on")}
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#334155]">{t(labels, "name")}</span>
                <input name="label" defaultValue={item.label} className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#334155]">{t(labels, "summary")}</span>
                <input name="summary" defaultValue={item.summary} className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-[#334155]">{t(labels, "type")}</span>
                <select name="duration" defaultValue={item.duration} className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2">
                  <option value="regular">{t(labels, "regular_duty")}</option>
                  <option value="temporary">{t(labels, "temporary_duty")}</option>
                </select>
              </label>
              <button type="submit" disabled={pending} className="btn-line w-fit">
                {t(labels, "save")}
              </button>
            </form>
          </li>
        ))}
        {!work.length ? (
          <li className="text-sm text-[#64748b]">{t(labels, "no_work_yet")}</li>
        ) : null}
      </ul>
    </div>
  );
}
