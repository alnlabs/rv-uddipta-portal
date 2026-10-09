import { redirect } from "next/navigation";
import { savePermission } from "@/app/actions/community-os";
import { fallbackDeskAccess } from "@/lib/deskAccess";
import { FEATURE_CATALOG } from "@/lib/features";
import { ROLE_GROUPS, ROLE_GUIDE, type RoleValue } from "@/lib/roleLabels";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const LEVELS = [
  { value: "none", label: "No access" },
  { value: "view", label: "Can look" },
  { value: "manage", label: "Can change" },
] as const;

const GROUPS = [...new Set(FEATURE_CATALOG.map((item) => item.group))];

function isRole(value: string | undefined): value is RoleValue {
  return ROLE_GUIDE.some((item) => item.value === value);
}

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/");
  const params = await searchParams;
  const role: RoleValue = isRole(params.role) ? params.role : "owner";
  const guide = ROLE_GUIDE.find((item) => item.value === role);
  const admin = createAdminClient();
  const { data } = await admin.from("role_permissions").select("role, feature_key, access").eq("role", role);
  const current = new Map((data ?? []).map((row) => [String(row.feature_key), String(row.access)]));

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Permissions</h1>
      <p className="mt-2 max-w-3xl text-[#475569]">
        Pick a role, then set each desk. No access hides it. Can look opens it without changes. Can change lets them update it. A desk turned off under Features stays closed for everyone.
      </p>

      <div className="mt-6 grid gap-4">
        {ROLE_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-semibold text-[#64748b]">{group.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.roles.map((value) => {
                const item = ROLE_GUIDE.find((roleItem) => roleItem.value === value);
                const active = value === role;
                return (
                  <a
                    key={value}
                    href={`/account/permissions?role=${value}`}
                    className={
                      active
                        ? "inline-flex min-h-11 items-center rounded-full bg-[#1e293b] px-4 text-sm font-semibold text-[#f8fafc]"
                        : "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)]"
                    }
                  >
                    {item?.label}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {guide ? <p className="mt-4 text-sm text-[#475569]">{guide.help}</p> : null}

      {GROUPS.map((group) => (
        <section key={group} className="mt-8">
          <h2 className="text-lg font-semibold text-[#0f172a]">{group}</h2>
          <ul className="mt-3 grid gap-3">
            {FEATURE_CATALOG.filter((feature) => feature.group === group).map((feature) => {
              const saved = current.get(feature.key);
              const access =
                saved === "none" || saved === "view" || saved === "manage"
                  ? saved
                  : fallbackDeskAccess(role, feature.key);
              return (
                <li key={feature.key} className="slab flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0f172a]">{feature.label}</p>
                    <p className="mt-1 text-sm text-[#475569]">{feature.summary}</p>
                  </div>
                  <form action={savePermission} className="flex flex-wrap gap-2 lg:shrink-0">
                    <input type="hidden" name="role" value={role} />
                    <input type="hidden" name="feature" value={feature.key} />
                    {LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="submit"
                        name="access"
                        value={level.value}
                        className={access === level.value ? "btn-slate" : "btn-line"}
                      >
                        {level.label}
                      </button>
                    ))}
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
