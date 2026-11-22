import Link from "next/link";
import { redirect } from "next/navigation";
import { saveSocietyLabels } from "@/app/actions/society-catalog";
import { isSuperAdmin } from "@/lib/admin";
import { LABEL_DEFAULTS, LABEL_GROUPS, LABEL_TITLES, t } from "@/lib/labelDefaults";
import { loadSocietyLabels } from "@/lib/labels";
import { getAuthState } from "@/lib/session";

async function saveLabelsAction(formData: FormData) {
  "use server";
  await saveSocietyLabels(formData);
}

function titleFor(key: string) {
  return LABEL_TITLES[key] || key.replaceAll("_", " ");
}

export default async function LabelsPage() {
  const { user } = await getAuthState();
  if (!user) redirect("/login?next=/account/labels");
  if (!isSuperAdmin(user)) redirect("/account");

  const labels = await loadSocietyLabels();
  const grouped = new Set(LABEL_GROUPS.flatMap((group) => group.keys));
  const leftover = Object.keys(LABEL_DEFAULTS).filter((key) => !grouped.has(key));
  const groups = leftover.length
    ? [...LABEL_GROUPS, { title: "Other", blurb: "Extra wordings.", keys: leftover.sort() }]
    : LABEL_GROUPS;

  return (
    <section className="pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Manage</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]">
            {t(labels, "labels")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#475569]">
            {t(labels, "help_labels")}
          </p>
        </div>
        <Link href="/account/roles" className="text-sm font-semibold text-[#1e293b]">
          ← {t(labels, "roles")}
        </Link>
      </div>

      <form action={saveLabelsAction} className="mt-8 space-y-8">
        {groups.map((group) => (
          <section key={group.title} className="overflow-hidden rounded-2xl bg-white ring-1 ring-[rgba(15,23,42,0.1)]">
            <header className="border-b border-[rgba(15,23,42,0.08)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#0f172a]">{group.title}</h2>
              <p className="mt-1 text-sm text-[#64748b]">{group.blurb}</p>
            </header>
            <div className="divide-y divide-[rgba(15,23,42,0.06)]">
              {group.keys.map((key) => {
                const usual = LABEL_DEFAULTS[key] || "";
                const current = labels[key] || usual;
                const long = key.startsWith("help_") || key.includes("body") || key.includes("_help");
                const changed = current.trim() !== usual.trim();
                return (
                  <label key={key} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:items-start sm:gap-6">
                    <span className="pt-2">
                      <span className="block text-sm font-semibold text-[#0f172a]">{titleFor(key)}</span>
                      {changed ? (
                        <span className="mt-1 block text-xs text-[#059669]">Custom · usual: {usual}</span>
                      ) : (
                        <span className="mt-1 block text-xs text-[#94a3b8]">Usual wording</span>
                      )}
                    </span>
                    {long ? (
                      <textarea
                        name={`label.${key}`}
                        defaultValue={current}
                        rows={3}
                        placeholder={usual}
                        className="field-control min-h-[5rem] resize-y"
                      />
                    ) : (
                      <input
                        name={`label.${key}`}
                        defaultValue={current}
                        placeholder={usual}
                        className="field-control"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4 z-10 flex justify-end">
          <button type="submit" className="btn-slate shadow-lg shadow-[rgba(15,23,42,0.12)]">
            {t(labels, "save_labels")}
          </button>
        </div>
      </form>
    </section>
  );
}
