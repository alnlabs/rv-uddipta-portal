import { redirect } from "next/navigation";
import { PageShell, PageTitle } from "@/components/chrome";
import { FeatureOff } from "@/components/FeatureOff";
import { MembersDirectory } from "@/components/MembersDirectory";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { loadBoardPayload } from "@/lib/boardData";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function MembersPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string }>
}) {
  const { user, profile, supabase } = await getAuthState();
  if (!user) redirect("/login");
  if (!isCommunityRole(profile.role)) redirect("/");
  if ((await resolveDeskAccess(profile.role, user, "neighbours")) === "none") {
    return <FeatureOff label="Neighbours" />;
  }

  const params = await searchParams;
  const q = (params.q || "").trim().toLowerCase();
  const board = await loadBoardPayload(user, supabase, profile.role);
  const { data: linkedRows } = await supabase.from("flats").select("flat_number").not("user_id", "is", null);
  const registeredFlats = new Set((linkedRows ?? []).map((row) => String(row.flat_number)));

  const sold = board.flats
    .filter((flat) => flat.saleStatus === "sold" && flat.ownerName)
    .map((flat) => ({
      flatNumber: flat.flatNumber,
      wing: flat.wing,
      floor: flat.floor,
      type: flat.type,
      facing: flat.facing,
      areaSqft: flat.areaSqft,
      ownerName: flat.ownerName,
      ownerPhotoUrl: flat.ownerPhotoUrl,
      ownerEmail: flat.ownerEmail,
      phoneMasked: flat.phoneMasked,
      tenantName: flat.tenantName,
      tenantPhoneMasked: flat.tenantPhoneMasked,
      members: board.membersByFlatId[flat.id] ?? [],
      renters: board.rentersByFlatId[flat.id] ?? [],
      registrationDate: flat.registrationDate,
      interiorStartDate: flat.interiorStartDate,
      interiorDate: flat.interiorDate,
      ceremonyDate: flat.ceremonyDate,
      movingDate: flat.movingDate,
      occupancyLabel: saleOccupancyLabel(flat),
      statusLabel: possessionLabel(flat),
      openForRent: flat.openForRent,
      openForResale: flat.openForResale,
      ownerRegistered: registeredFlats.has(flat.flatNumber),
    }));

  return (
    <PageShell wide>
      <PageTitle
        title="Neighbours"
        lede="Who lives in each home. Choose a home to see the owner, family, and tenant."
      />
      <MembersDirectory flats={sold} initialQuery={q} />
    </PageShell>
  );
}
