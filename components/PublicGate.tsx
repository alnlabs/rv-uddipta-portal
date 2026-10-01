import { BuildingGuide } from "@/components/BuildingGuide";
import { getProjectInfo } from "@/lib/projectInfo";

export async function PublicGate() {
  const project = await getProjectInfo();
  return <BuildingGuide project={project} showVisit signedIn={false} />;
}
