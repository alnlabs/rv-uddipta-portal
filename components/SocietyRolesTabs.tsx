import Link from "next/link";
import { t, type SocietyLabels } from "@/lib/labelDefaults";

const TABS = [
  { id: "people", key: "people" },
  { id: "work", key: "work_list" },
  { id: "roles", key: "roles" },
  { id: "areas", key: "areas" },
  { id: "reminders", key: "reminders" },
] as const;

export function SocietyRolesTabs({
  active,
  labels,
  showLabelsLink = false,
}: {
  readonly active: string
  readonly labels: SocietyLabels
  readonly showLabelsLink?: boolean
}) {
  return (
    <nav className="mt-5 flex flex-wrap gap-2" aria-label="Society team sections">
      {TABS.map((tab) => {
        const href = tab.id === "people" ? "/account/roles" : `/account/roles?tab=${tab.id}`;
        const on = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={
              on
                ? "rounded-full bg-[#1e293b] px-3.5 py-1.5 text-sm font-semibold text-white"
                : "rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-[#334155] ring-1 ring-[rgba(15,23,42,0.12)]"
            }
          >
            {t(labels, tab.key)}
          </Link>
        );
      })}
      {showLabelsLink ? (
        <Link
          href="/account/labels"
          className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-[#334155] ring-1 ring-[rgba(15,23,42,0.12)]"
        >
          {t(labels, "labels")}
        </Link>
      ) : null}
    </nav>
  );
}
