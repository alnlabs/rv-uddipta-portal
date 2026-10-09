import { redirect } from "next/navigation";
import { CategoryRow } from "@/components/CategoryRow";
import { DeskError } from "@/components/FeatureOff";
import { POST_GROUPS, postKind } from "@/lib/postKinds";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const ABOUT: Record<string, string> = {
  update: "A short note for the community.",
  question: "A question neighbours can answer.",
  quote: "A line someone wants to share.",
  celebration: "A birthday, festival, or good news.",
  sale: "Something a neighbour is selling.",
  wanted: "Something a neighbour is looking for.",
  giveaway: "Something free to collect.",
  lost: "Something lost or found.",
  recommendation: "A person or place worth using.",
  parking: "A parking slot someone is offering.",
  event: "Something happening on a day and time.",
  poll: "A question with choices.",
  alert: "News neighbours should see now.",
  emergency: "Urgent. Everyone is told at once.",
  request: "Something a home asks the office to do.",
  feedback: "Something a home wants the office to know.",
};

const SECTIONS = [
  ...POST_GROUPS.map((group) => ({
    key: group.value,
    title: group.value === "admin" ? "To the office" : group.label,
    detail:
      group.value === "talk"
        ? "Everyday posts."
        : group.value === "neighbours"
          ? "Offers, needs, and things people notice."
          : group.value === "plans"
            ? "Events, polls, and alerts."
            : group.value === "emergency"
              ? "Urgent posts. Everyone is told at once."
              : "Messages that go to the office. They do not appear on Updates.",
  })),
  { key: "other", title: "Other", detail: "Types that are not on the usual list." },
];

type CategoryRowData = {
  id: number
  value: string
  label: string
  enabled: boolean
};

export default async function CategoriesPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select("id, value, label, enabled")
    .order("sort_order");
  if (error) return <DeskError message={error.message} />;

  const rows = (data ?? []) as CategoryRowData[];
  const grouped = SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter((row) => {
      const kind = postKind(row.value);
      if (section.key === "other") return !kind;
      return kind?.group === section.key;
    }),
  })).filter((section) => section.rows.length);

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Categories</h1>
      <p className="mt-2 max-w-3xl text-[#475569]">
        The choices people see when they post. Hide a type to take it off that list. Rename it if the community uses a different word. Posts already sent stay as they are.
      </p>
      {grouped.map((section) => (
        <section key={section.key} className="mt-8">
          <h2 className="text-lg font-semibold text-[#0f172a]">{section.title}</h2>
          <p className="mt-1 text-sm text-[#475569]">{section.detail}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.rows.map((row) => (
              <CategoryRow
                key={row.id}
                id={row.id}
                label={row.label}
                enabled={row.enabled}
                about={ABOUT[row.value] || "Shown wherever this type is used."}
              />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
