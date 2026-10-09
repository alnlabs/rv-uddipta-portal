import { isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { getProjectInfo } from "@/lib/projectInfo";
import { canEditBuilder } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canEditBuilder(member.profile.role, member.user)) return mobileJson({ message: "Building details are for the builder." }, 403);

  const project = await getProjectInfo();
  return mobileJson({
    name: project.name,
    location: project.location,
    units: project.units,
    floors: project.floors,
    acres: project.acres,
    rera: project.rera,
  });
}
