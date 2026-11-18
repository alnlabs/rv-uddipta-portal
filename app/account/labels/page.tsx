import Link from "next/link";
import { redirect } from "next/navigation";
import { saveSocietyLabels } from "@/app/actions/society-catalog";
import { isSuperAdmin } from "@/lib/admin";
import { LABEL_DEFAULTS, t } from "@/lib/labelDefaults";
import { loadSocietyLabels } from "@/lib/labels";
import { getAuthState } from "@/lib/session";

async function saveLabelsAction(formData: FormData) {
  "use server";
  await saveSocietyLabels(formData);
}

export default async function LabelsPage() {
  const { user } = await getAuthState();
  if (!user) redirect("/login?next=/account/labels");
  if (!isSuperAdmin(user)) redirect("/account");

  const labels = await loadSocietyLabels();
  const keys = Object.keys(LABEL_DEFAULTS).sort();

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[#0f172a]">{t(labels, "labels")}</h1>
          <p className="mt-2 max-w-2xl text-[#475569]">{t(labels, "help_labels")}</p>
        </div>
        <Link href="/account/roles" className="text-sm font-semibold text-[#1e293b]">
          ← {t(labels, "roles")}
        </Link>
      </div>

      <form action={saveLabelsAction} className="mt-6 space-y-3">
        {keys.map((key) => (
          <label key={key} className="grid gap-1 rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
            <span className="text-xs font-semibold tracking-wide text-[#64748b] uppercase">{key}</span>
            <textarea
              name={`label.${key}`}
              defaultValue={labels[key] || LABEL_DEFAULTS[key] || ""}
              rows={key.startsWith("help_") || key.includes("body") ? 3 : 1}
              className="rounded-xl border border-[rgba(15,23,42,0.12)] px-3 py-2 text-sm"
            />
          <span className="text-xs text-[#94a3b8]">
            {t(labels, "default_label")}: {LABEL_DEFAULTS[key]}
          </span>
        </label>
        ))}
        <button type="submit" className="btn-slate">
          {t(labels, "save_labels")}
        </button>
      </form>
    </section>
  );
}
