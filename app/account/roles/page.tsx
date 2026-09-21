import { redirect } from "next/navigation";
import { adminSaveProfile } from "@/app/actions/admin-manage";
import { ProfileDangerZone } from "@/components/ProfileDangerZone";
import { isSuperAdmin } from "@/lib/admin";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function AdminRolesPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");

  const admin = createAdminClient();
  const [{ data: profiles }, usersPage] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, role, flat_id, display_name, updated_at")
      .order("updated_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emails: Record<string, string> = {};
  const superAdmins: Record<string, boolean> = {};
  for (const account of usersPage.data?.users ?? []) {
    if (account.email) emails[account.id] = account.email;
    superAdmins[account.id] = isSuperAdmin(account);
  }

  const flatIds = [
    ...new Set(
      (profiles ?? [])
        .map((p) => p.flat_id as number | null)
        .filter((id): id is number => id != null),
    ),
  ];
  const flatMap: Record<number, string> = {};
  if (flatIds.length) {
    const { data: flats } = await admin
      .from("flats")
      .select("id, flat_number")
      .in("id", flatIds);
    for (const f of flats ?? []) flatMap[f.id] = f.flat_number;
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#14241c]">Roles</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        admin, builder, owner, co_owner, visitor, tenant. Role reset requires
        typing the account email.
      </p>

      <ul className="mt-6 space-y-4">
        {(profiles ?? []).map((row) => {
          const email = emails[row.user_id] || "";
          const locked = Boolean(superAdmins[row.user_id]);
          return (
          <li
            key={row.user_id}
            className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]"
          >
            <p className="text-sm font-semibold text-[#14241c]">
              {row.display_name || email || row.user_id.slice(0, 8)}
              {locked ? (
                <span className="ml-2 rounded-full bg-[#1b3a2f] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#e8d5a3] uppercase">
                  Super admin
                </span>
              ) : null}
            </p>
            <p className="text-xs text-[#3d5247]">
              {email || row.user_id}
            </p>
            <form action={adminSaveProfile} className="mt-3 grid gap-2 sm:grid-cols-4">
              <input type="hidden" name="userId" value={row.user_id} />
              {locked ? (
                <>
                  <input type="hidden" name="role" value="admin" />
                  <input type="hidden" name="flatNumber" value="" />
                </>
              ) : null}
              <label className="text-xs font-semibold uppercase tracking-wide text-[#3d5247]">
                Role
                <select
                  name={locked ? undefined : "role"}
                  defaultValue={locked ? "admin" : row.role}
                  disabled={locked}
                  className="mt-1 min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-2 text-sm font-normal normal-case text-[#14241c] disabled:opacity-60"
                >
                  {(
                    [
                      "admin",
                      "builder",
                      "owner",
                      "co_owner",
                      "visitor",
                      "tenant",
                    ] as const
                  ).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#3d5247]">
                Flat
                <input
                  name={locked ? undefined : "flatNumber"}
                  defaultValue={
                    locked ? "" : row.flat_id ? flatMap[row.flat_id] || "" : ""
                  }
                  placeholder="A101"
                  disabled={locked}
                  className="mt-1 min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-2 text-sm font-normal normal-case text-[#14241c] disabled:opacity-60"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#3d5247] sm:col-span-2">
                Display name
                <input
                  name="displayName"
                  defaultValue={row.display_name || ""}
                  className="mt-1 min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-2 text-sm font-normal normal-case text-[#14241c]"
                />
              </label>
              <button
                type="submit"
                className="min-h-10 rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3] sm:col-span-4 sm:w-fit"
              >
                Save role
              </button>
            </form>
            {locked ? null : (
              <ProfileDangerZone userId={row.user_id} email={email} />
            )}
          </li>
          );
        })}
      </ul>
    </section>
  );
}
