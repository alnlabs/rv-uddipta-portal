import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSaveBuilder } from "@/app/actions/admin-manage";
import { getProjectInfo } from "@/lib/projectInfo";
import { canEditBuilder, canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function AdminBuilderPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canEditBuilder(profile.role, user)) redirect("/");

  const project = await getProjectInfo();

  const showAdminHome = canManageAdmin(profile.role, user);

  return (
    <section>
      <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
        Administration
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-[#14241c]">Builder details</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        These facts appear on the public home page and signed-in dashboard.
      </p>
      {showAdminHome ? (
        <Link
          href="/account"
          className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#2f5a48]"
        >
          ← Admin home
        </Link>
      ) : null}

      <form
        action={adminSaveBuilder}
        className="mt-6 grid max-w-2xl gap-3 rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]"
      >
        {(
          [
            ["name", "Name", project.name],
            ["developer", "Developer", project.developer],
            ["tagline", "Tagline", project.tagline],
            ["location", "Location", project.location],
            ["address", "Address", project.address],
            ["rera", "RERA", project.rera],
            ["igbc", "IGBC", project.igbc],
          ] as const
        ).map(([name, label, value]) => (
          <label key={name} className="block text-sm font-semibold">
            {label}
            <input
              name={name}
              defaultValue={value}
              className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
            />
          </label>
        ))}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["acres", "Acres", project.acres],
              ["units", "Units", project.units],
              ["floors", "Floors", project.floors],
              ["clubhouseSqft", "Clubhouse sft", project.clubhouseSqft],
              [
                "greeneryFacingPercent",
                "Greenery %",
                project.greeneryFacingPercent,
              ],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="block text-sm font-semibold">
              {label}
              <input
                name={name}
                type="number"
                step="any"
                defaultValue={value}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              />
            </label>
          ))}
        </div>
        <label className="block text-sm font-semibold">
          Nearby (one per line: Label | distance)
          <textarea
            name="nearby"
            rows={4}
            defaultValue={project.nearby
              .map((n) => `${n.label} | ${n.distance}`)
              .join("\n")}
            className="mt-1 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 py-2 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold">
          Amenities (one per line)
          <textarea
            name="amenities"
            rows={8}
            defaultValue={project.amenities.join("\n")}
            className="mt-1 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 w-fit rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c]"
        >
          Save builder details
        </button>
      </form>
    </section>
  );
}
