"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSocietyRole, setRoleTasks } from "@/app/actions/society-catalog";
import type { SocietyRoleRow, SocietyWork } from "@/lib/societyCatalog";
import { t, tFill } from "@/lib/labelDefaults";

const MAPS_TO = [
  { value: "security", label: "Security" },
  { value: "facility", label: "Facility" },
  { value: "staff", label: "Staff" },
  { value: "committee", label: "Committee" },
  { value: "builder", label: "Builder" },
];

export function SocietyRoleDutiesPanel({
  roles,
  work,
  labels,
}: {
  readonly roles: SocietyRoleRow[]
  readonly work: SocietyWork[]
  readonly labels: Record<string, string>
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error || "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-6">
      <p className="max-w-2xl text-sm text-[#475569]">{t(labels, "help_roles")}</p>
      {error ? <p className="text-sm text-[#b91c1c]">{error}</p> : null}

      <form
        action={(formData) => run(saveSocietyRole, formData)}
        className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]"
      >
        <h2 className="text-lg font-semibold text-[#0f172a]">{t(labels, "add_role")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "name")}</span>
            <input name="label" required className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#334155]">{t(labels, "app_shell")}</span>
            <select name="maps_to" defaultValue="staff" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2">
              {MAPS_TO.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-[#334155]">{t(labels, "summary")}</span>
            <input name="summary" className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2" />
          </label>
        </div>
        <button type="submit" disabled={pending} className="btn-slate mt-4">
          {pending ? t(labels, "saving") : t(labels, "add")}
        </button>
      </form>

      <ul className="grid gap-4">
        {roles.map((role) => (
          <li key={role.id} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[#0f172a]">{role.label}</p>
                <p className="text-xs text-[#64748b]">
                  {role.system ? t(labels, "standard") : t(labels, "custom")} ·{" "}
                  {tFill(labels, "people_count", { count: role.people_count })}
                  {role.maps_to ? ` · ${t(labels, "shell")} ${role.maps_to}` : ""}
                </p>
                <p className="mt-1 text-sm text-[#475569]">{role.summary}</p>
              </div>
            </div>

            <form action={(formData) => run(setRoleTasks, formData)} className="mt-4">
              <input type="hidden" name="role_key" value={role.key} />
              <p className="text-sm font-semibold text-[#0f172a]">{t(labels, "duties_of_role")}</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {work.filter((item) => item.enabled).map((item) => (
                  <li key={item.key}>
                    <label className="flex items-start gap-2 text-sm text-[#334155]">
                      <input
                        type="checkbox"
                        name="task_key"
                        value={item.key}
                        defaultChecked={role.task_keys?.includes(item.key)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{item.label}</span>
                        {item.summary ? (
                          <span className="block text-xs text-[#64748b]">{item.summary}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="submit" disabled={pending} className="btn-line mt-3">
                {t(labels, "change_duties")}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
