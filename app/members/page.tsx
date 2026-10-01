import { redirect } from "next/navigation";
import { PageShell, PageTitle } from "@/components/chrome";
import { MembersDirectory } from "@/components/MembersDirectory";
import { loadBoardPayload } from "@/lib/boardData";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { user, profile, supabase } = await getAuthState();
  if (!user) redirect("/login");
  const community = isCommunityRole(profile.role);
  const board = await loadBoardPayload(user, supabase, profile.role);
  const params = await searchParams;
  const q = (params.q || "").trim().toLowerCase();

  if (!community) redirect("/");

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
    }))
    .filter((flat) => {
      if (!q) return true;
      const hay = [
        flat.flatNumber,
        flat.ownerName,
        flat.ownerEmail,
        flat.tenantName,
        ...flat.members.map((member) => member.name),
        ...flat.renters.map((renter) => renter.name),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      const wing = (a.wing || "A").localeCompare(b.wing || "A");
      if (wing) return wing;
      return a.floor - b.floor || a.flatNumber.localeCompare(b.flatNumber);
    });

  return (
    <PageShell>
      <PageTitle
        title="Neighbours"
        lede="Who lives in which flat."
        action={<p className="text-sm text-[#3d5247]">{sold.length} homes</p>}
      />
      <MembersDirectory flats={sold} initialQuery={params.q || ""} />
    </PageShell>
  );
}
