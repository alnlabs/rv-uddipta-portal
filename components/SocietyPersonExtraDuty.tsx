"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPersonExtraTasks } from "@/app/actions/society-catalog";
import type { SocietyWork } from "@/lib/societyCatalog";
import { t } from "@/lib/labelDefaults";

export function SocietyPersonExtraDuty({
  userId,
  work,
  selectedKeys,
  labels,
}: {
  readonly userId: string
  readonly work: SocietyWork[]
  readonly selectedKeys: string[]
  readonly labels: Record<string, string>
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-[rgba(15,23,42,0.08)]"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await setPersonExtraTasks(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <p className="font-semibold text-[#0f172a]">{t(labels, "extra_duty")}</p>
      <p className="mt-1 text-xs text-[#64748b]">{t(labels, "extra_duty_help")}</p>
      {error ? <p className="mt-2 text-sm text-[#b91c1c]">{error}</p> : null}
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {work.filter((item) => item.enabled).map((item) => (
          <li key={item.key}>
            <label className="flex items-start gap-2 text-sm text-[#334155]">
              <input
                type="checkbox"
                name="task_key"
                value={item.key}
                defaultChecked={selectedKeys.includes(item.key)}
                className="mt-0.5"
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="submit" disabled={pending} className="btn-line mt-3">
        {pending ? t(labels, "saving") : t(labels, "save_extra_duty")}
      </button>
    </form>
  );
}
