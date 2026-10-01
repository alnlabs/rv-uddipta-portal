import { Suspense } from "react";
import type { ModelFlat } from "@/components/Building3DView";
import { HomeBoard } from "@/components/HomeBoard";
import { loadBoardPayload, loadBrochureBoard } from "@/lib/boardData";
import { INVENTORY } from "@/lib/inventory";
import { isCommunityRole } from "@/lib/roles";
import { getProjectInfo } from "@/lib/projectInfo";
import { getAuthState } from "@/lib/session";

export default async function CommunityPage() {
  const { user, profile, supabase } = await getAuthState();
  const project = await getProjectInfo();
  const community = Boolean(user && profile && isCommunityRole(profile.role));
  const board = user
    ? await loadBoardPayload(user, supabase, profile.role)
    : await loadBrochureBoard();

  const modelFlats: ModelFlat[] = INVENTORY.map((flat) => ({
    flatNumber: flat.flatNumber,
    wing: flat.wing,
    floor: flat.floor,
    unit: flat.unit,
    type: flat.type,
    facing: flat.facing,
    areaSqft: flat.areaSqft,
  }));

  return (
    <Suspense
      fallback={
        <div className="page-gutter max-w-6xl py-10 text-sm text-[#3d5247]">
          Opening the building…
        </div>
      }
    >
      <HomeBoard
        data={board.data}
        error={board.error}
        modelFlats={modelFlats}
        project={project}
        showVisit={!community}
        signedIn={Boolean(user)}
      />
    </Suspense>
  );
}
