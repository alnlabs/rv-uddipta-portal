"use client";

import { ROLE_GROUPS, ROLE_GUIDE, roleLabel } from "@/lib/roleLabels";

export function RoleChoice({
  value,
  onChange,
  kind,
}: {
  readonly value: string
  readonly onChange: (next: string) => void
  readonly kind: "office" | "home"
}) {
  const selected = ROLE_GUIDE.find((item) => item.value === value);
  const groups = ROLE_GROUPS.filter((group) =>
    kind === "home" ? group.title === "Lives in a home" : group.title !== "Lives in a home",
  );

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[#0f172a]">
        {kind === "home" ? "On this home" : "Office role"}
      </legend>
      <input type="hidden" name="role" value={value} />
      <div className="mt-3 grid gap-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold tracking-[0.08em] text-[#64748b] uppercase">{group.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.roles.map((role) => {
                const on = value === role;
                return (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(role)}
                    className={on ? "btn-slate" : "btn-line"}
                  >
                    {roleLabel(role)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {selected ? <p className="mt-3 text-sm leading-relaxed text-[#475569]">{selected.help}</p> : null}
    </fieldset>
  );
}
