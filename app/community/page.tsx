import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ModelFlat } from "@/components/Building3DView";
import { HomeBoard } from "@/components/HomeBoard";
import { loadBoardPayload } from "@/lib/boardData";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import { INVENTORY } from "@/lib/inventory";
import { ensureProfile, isCommunityRole } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export default async function CommunityPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(user, supabase);
  const board = await loadBoardPayload(user, supabase, profile.role);
  const showOwners = board.includeOwners || isCommunityRole(profile.role);

  const { data: ownFlat } = await supabase
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();

  const byNumber = new Map(board.flats.map((flat) => [flat.flatNumber, flat]));
  const modelFlats: ModelFlat[] = INVENTORY.map((flat) => {
    const owned = byNumber.get(flat.flatNumber);
    const base: ModelFlat = {
      flatNumber: flat.flatNumber,
      wing: flat.wing,
      floor: flat.floor,
      unit: flat.unit,
      type: flat.type,
      facing: flat.facing,
      areaSqft: flat.areaSqft,
      saleStatus: owned?.saleStatus === "sold" ? "sold" : "unsold",
      openForRent: owned?.openForRent,
      openForResale: owned?.openForResale,
    };
    if (!owned || owned.saleStatus !== "sold") return base;
    if (!board.includeOwners) {
      return {
        ...base,
        saleStatus: "sold",
        occupancyLabel: owned.openForRent
          ? "Open for rent"
          : owned.openForResale
            ? "Open for resale"
            : "Sold",
      };
    }
    return {
      ...base,
      saleStatus: "sold",
      occupancyLabel: saleOccupancyLabel(owned),
      ownerName: owned.ownerName || undefined,
      phoneMasked: owned.phoneMasked || undefined,
      tenantName: owned.tenantName || undefined,
      tenantPhoneMasked: owned.tenantPhoneMasked || undefined,
      memberNames: (board.membersByFlatId[owned.id] ?? []).map((m) => m.name),
      statusLabel: possessionLabel(owned),
      openForRent: owned.openForRent,
      openForResale: owned.openForResale,
    };
  });

  return (
    <Suspense
      fallback={
        <div className="page-gutter max-w-6xl py-10 text-sm text-[#3d5247]">
          Loading community…
        </div>
      }
    >
      <HomeBoard
        data={board.data}
        error={board.error}
        membersByFlatId={board.membersByFlatId}
        myFlatNumber={ownFlat?.flat_number ?? null}
        showOwners={showOwners}
        includeOwners={board.includeOwners}
        modelFlats={modelFlats}
      />
    </Suspense>
  );
}
