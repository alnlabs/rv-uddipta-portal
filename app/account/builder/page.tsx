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
      <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-tight text-[#14241c]">
        Building details
      </h1>
      <p className="mt-2 text-base text-[#3d5247]">
        The words members see on Building.
        {showAdminHome ? "" : " You can edit these. You cannot approve members."}
      </p>

      <form
        action={adminSaveBuilder}
        className="mt-6 grid max-w-2xl gap-4"
      >
        <div className="grid gap-3 rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]">
          <h2 className="text-lg font-semibold text-[#14241c]">What members read</h2>
        {(
          [
            ["name", "Name", project.name],
            ["tagline", "One line about the building", project.tagline],
            ["launchDate", "Launch date", project.launchDate],
            ["developer", "Builder", project.developer],
            ["location", "Place", project.location],
            ["address", "Address", project.address],
            ["rera", "RERA", project.rera],
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
        </div>
        <details className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]">
          <summary className="cursor-pointer text-lg font-semibold text-[#14241c]">
            Extra numbers
          </summary>
          <input type="hidden" name="igbc" value={project.igbc} />
        <div className="mt-3 grid grid-cols-2 gap-3">
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
        </details>
        <label className="block rounded-2xl bg-[#fffcf5] p-4 text-sm font-semibold ring-1 ring-[rgba(27,58,47,0.12)]">
          Nearby places. One line each: place | how far
          <textarea
            name="nearby"
            rows={4}
            defaultValue={project.nearby
              .map((n) => `${n.label} | ${n.distance}`)
              .join("\n")}
            className="mt-1 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 py-2 font-normal"
          />
        </label>
        <label className="block rounded-2xl bg-[#fffcf5] p-4 text-sm font-semibold ring-1 ring-[rgba(27,58,47,0.12)]">
          Amenities, one on each line. They show as Play, Exercise, Gather, and Safety.
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
          Save
        </button>
      </form>
    </section>
  );
}
