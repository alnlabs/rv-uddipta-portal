import { redirect } from "next/navigation";
import { setFeatureEnabled } from "@/app/actions/community-os";
import { FEATURE_CATALOG, loadEnabledFeatures } from "@/lib/features";
import { isSuperAdmin } from "@/lib/admin";
import { loadSocietyLabels, t } from "@/lib/labels";
import { getAuthState } from "@/lib/session";

export default async function FeaturesPage() {
  const { user } = await getAuthState();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect("/account");
  const [enabledList, societyLabels] = await Promise.all([
    loadEnabledFeatures(),
    loadSocietyLabels(),
  ]);
  const enabled = new Set(enabledList);
  const groups = [...new Set(FEATURE_CATALOG.map((item) => item.group))];

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">{t(societyLabels, "manage_features")}</h1>
      <p className="mt-2 max-w-2xl text-[#475569]">
        Turn a feature off for the whole community. A role permission cannot turn it back on.
      </p>
      {groups.map((group) => (
        <section key={group} className="mt-6">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">{group}</h2>
          <ul className="mt-3 grid gap-2">
            {FEATURE_CATALOG.filter((item) => item.group === group).map((item) => {
              const on = enabled.has(item.key);
              return (
                <li key={item.key} className="slab flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#0f172a]">
                      {t(societyLabels, `feature_${item.key}`)}
                    </p>
                    <p className="text-sm text-[#475569]">{item.summary}</p>
                  </div>
                  <form action={setFeatureEnabled}>
                    <input type="hidden" name="key" value={item.key} />
                    <input type="hidden" name="enabled" value={on ? "false" : "true"} />
                    <button type="submit" className={on ? "btn-slate" : "btn-line"}>
                      {on ? t(societyLabels, "on") : t(societyLabels, "off")}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
