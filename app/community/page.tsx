import { Suspense } from "react";
import type { ModelFlat } from "@/components/Building3DView";
import { FeatureOff } from "@/components/FeatureOff";
import { HomeBoard } from "@/components/HomeBoard";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { loadBoardPayload, loadBrochureBoard } from "@/lib/boardData";
import { INVENTORY } from "@/lib/inventory";
import { isCommunityRole } from "@/lib/roles";
import { getProjectInfo } from "@/lib/projectInfo";
import { getAuthState } from "@/lib/session";
import type { PublicFlat } from "@/lib/types";

function toModelFlat(flat: PublicFlat, memberNames: string[]): ModelFlat {
  const sold = flat.saleStatus === "sold" || Boolean(flat.ownerName.trim());
  return {
    flatNumber: flat.flatNumber,
    wing: flat.wing,
    floor: flat.floor,
    unit: flat.unit,
    type: flat.type,
    facing: flat.facing,
    areaSqft: flat.areaSqft,
    saleStatus: sold ? "sold" : "unsold",
    occupancyLabel:
      flat.occupancy === "rented"
        ? "Rented"
        : sold
          ? "Owner stay"
          : null,
    openForRent: flat.openForRent,
    openForResale: flat.openForResale,
    ownerName: flat.ownerName,
    ownerEmail: flat.ownerEmail,
    phoneMasked: flat.phoneMasked,
    tenantName: flat.tenantName,
    tenantPhoneMasked: flat.tenantPhoneMasked,
    memberNames,
  };
}

export default async function CommunityPage() {
  const { user, profile, supabase } = await getAuthState();
  if (user && (await resolveDeskAccess(profile.role, user, "building")) === "none") {
    return <FeatureOff label="Building" />;
  }
  const project = await getProjectInfo();
  const community = Boolean(user && profile && isCommunityRole(profile.role));
  const board = user
    ? await loadBoardPayload(user, supabase, profile.role)
    : await loadBrochureBoard();

  const byNumber = new Map(board.flats.map((flat) => [flat.flatNumber, flat]));
  const modelFlats: ModelFlat[] = INVENTORY.map((item) => {
    const flat = byNumber.get(item.flatNumber);
    if (!flat) {
      return {
        flatNumber: item.flatNumber,
        wing: item.wing,
        floor: item.floor,
        unit: item.unit,
        type: item.type,
        facing: item.facing,
        areaSqft: item.areaSqft,
      };
    }
    return toModelFlat(
      flat,
      (board.membersByFlatId[flat.id] ?? []).map((member) => member.name),
    );
  });

  let myFlatNumber: string | null = null;
  if (user && profile) {
    const { data: ownRow } = await supabase
      .from("flats")
      .select("flat_number")
      .eq(profile.flatId ? "id" : "user_id", profile.flatId ?? user.id)
      .maybeSingle();
    myFlatNumber = (ownRow?.flat_number as string | undefined) ?? null;
  }

  return (
    <Suspense
      fallback={
        <div className="page-gutter max-w-6xl py-10 text-sm text-[#475569]">
          Opening the building…
        </div>
      }
    >
      <HomeBoard
        data={board.data}
        error={board.error}
        modelFlats={modelFlats}
        myFlatNumber={myFlatNumber}
        project={project}
        showVisit={!community}
        signedIn={Boolean(user)}
      />
    </Suspense>
  );
}
