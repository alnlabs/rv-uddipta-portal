import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSaveBuilder } from "@/app/actions/admin-manage";
import { getProjectInfo } from "@/lib/projectInfo";
import { canEditBuilder, ensureProfile } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export default async function AdminBuilderPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(user, supabase);
  if (!canEditBuilder(profile.role, user)) redirect("/");

  const project = await getProjectInfo();

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#14241c]">Builder details</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        Project facts shown on the dashboard and public surfaces.
      </p>

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
