import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSaveProfile } from "@/app/actions/admin-manage";
import { canManageAdmin, ensureProfile } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export default async function AdminRolesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) redirect("/admin/builder");

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, role, flat_id, display_name, updated_at")
    .order("updated_at", { ascending: false });

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

  const emails: Record<string, string> = {};
  for (const row of profiles ?? []) {
    try {
      const { data } = await admin.auth.admin.getUserById(row.user_id);
      if (data.user?.email) emails[row.user_id] = data.user.email;
    } catch {
      /* ignore */
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#14241c]">Roles</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        admin, builder, owner, co_owner, visitor, tenant. Env admin emails still
        bootstrap as admin on login.
      </p>

      <ul className="mt-6 space-y-4">
        {(profiles ?? []).map((row) => (
          <li
            key={row.user_id}
            className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]"
          >
            <p className="text-sm font-semibold text-[#14241c]">
              {row.display_name || emails[row.user_id] || row.user_id.slice(0, 8)}
            </p>
            <p className="text-xs text-[#3d5247]">
              {emails[row.user_id] || row.user_id}
            </p>
            <form action={adminSaveProfile} className="mt-3 grid gap-2 sm:grid-cols-4">
              <input type="hidden" name="userId" value={row.user_id} />
              <label className="text-xs font-semibold uppercase tracking-wide text-[#3d5247]">
                Role
                <select
                  name="role"
                  defaultValue={row.role}
                  className="mt-1 min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-2 text-sm font-normal normal-case text-[#14241c]"
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
                  name="flatNumber"
                  defaultValue={
                    row.flat_id ? flatMap[row.flat_id] || "" : ""
                  }
                  placeholder="A101"
                  className="mt-1 min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-2 text-sm font-normal normal-case text-[#14241c]"
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
          </li>
        ))}
      </ul>
    </section>
  );
}
