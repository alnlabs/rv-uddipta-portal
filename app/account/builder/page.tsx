import { redirect } from "next/navigation";
import { BuildingEditor } from "@/components/BuildingEditor";
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
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] font-semibold leading-none tracking-tight text-[#14241c]">
            Building details
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#3d5247] sm:text-base">
            {showAdminHome
              ? "This is the board members read. Edit the name, the numbers, nearby places, and amenities in place."
              : "This is the board members read. You can edit it. You cannot approve members."}
          </p>
        </div>
      </header>
      <BuildingEditor project={project} />
    </section>
  );
}
