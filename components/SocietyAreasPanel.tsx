"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSocietyArea } from "@/app/actions/society-catalog";
import type { SocietyArea } from "@/lib/areaOwners";
import { t } from "@/lib/labelDefaults";

const OWNER_OPTIONS = [
  { value: "builder", label: "Builder" },
  { value: "facility", label: "Facility" },
  { value: "staff", label: "Staff" },
  { value: "security", label: "Security" },
  { value: "committee", label: "Committee" },
  { value: "admin", label: "Admin" },
] as const;

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function roleLabel(value: string) {
  return OWNER_OPTIONS.find((item) => item.value === value)?.label || value;
}

export function SocietyAreasPanel({
  areas,
  labels,
}: {
  readonly areas: SocietyArea[]
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
      const result = await saveSocietyArea(formData);
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
      <p className="max-w-2xl text-sm text-[#475569]">{t(labels, "help_areas")}</p>
      {error ? <p className="text-sm text-[#b91c1c]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#15803d]">{notice}</p> : null}

      <ul className="grid gap-3">
        {areas.map((area) => {
          const gateLocked = area.areaKey === "gate";
          return (
            <li key={area.areaKey} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
              <form action={onSave} className="grid gap-3">
                <input type="hidden" name="area_key" value={area.areaKey} />
                <div>
                  <p className="font-semibold text-[#0f172a]">{area.label}</p>
                  <p className="mt-1 text-sm text-[#475569]">
                    {t(labels, "current_owner")}: {roleLabel(area.currentOwnerRole)}
                  </p>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-[#334155]">{t(labels, "who_looks_after")}</span>
                  <select
                    name="owner_role"
                    defaultValue={area.ownerRole}
                    disabled={gateLocked}
                    className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2 disabled:bg-[#f8fafc]"
                  >
                    {OWNER_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-[#334155]">{t(labels, "summary")}</span>
                  <input
                    name="summary"
                    defaultValue={area.summary}
                    className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#334155]">{t(labels, "from_date")}</span>
                    <input
                      name="starts_at"
                      type="datetime-local"
                      defaultValue={toLocalInput(area.startsAt)}
                      className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-[#334155]">{t(labels, "until_date")}</span>
                    <input
                      name="ends_at"
                      type="datetime-local"
                      defaultValue={toLocalInput(area.endsAt)}
                      className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2"
                    />
                  </label>
                </div>
                <button type="submit" disabled={pending} className="btn-slate w-fit">
                  {pending ? t(labels, "saving") : t(labels, "save")}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
