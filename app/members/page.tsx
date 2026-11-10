import { redirect } from "next/navigation";
import { PageShell, PageTitle } from "@/components/chrome";
import { FeatureOff } from "@/components/FeatureOff";
import { MembersDirectory } from "@/components/MembersDirectory";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { loadBoardPayload } from "@/lib/boardData";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

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
  const admin = createAdminClient();
  const [{ data: linkedRows }, { data: profileHomes }, { data: roleHomes }] = await Promise.all([
    supabase.from("flats").select("flat_number").not("user_id", "is", null),
    admin.from("profiles").select("flat_id").not("flat_id", "is", null),
    admin.from("person_roles").select("flat_id").not("flat_id", "is", null),
  ]);
  const registeredFlats = new Set((linkedRows ?? []).map((row) => String(row.flat_number)));
  const flatNumbers = new Map(board.flats.map((flat) => [flat.id, flat.flatNumber]));
  for (const row of [...(profileHomes ?? []), ...(roleHomes ?? [])]) {
    const number = row.flat_id != null ? flatNumbers.get(Number(row.flat_id)) : null;
    if (number) registeredFlats.add(number);
  }
  const myFlatNumber = profile.flatId ? flatNumbers.get(profile.flatId) ?? null : null;
  let incoming: { requestId: number; home: string; note: string }[] = [];
  const connected = new Set<string>();
  if (profile.flatId) {
    const [{ data: pendingIn }, { data: accepted }] = await Promise.all([
      admin
        .from("connection_requests")
        .select("id, from_flat_id, note, status")
        .eq("to_flat_id", profile.flatId)
        .eq("status", "pending")
        .then((result) => result, () => ({ data: [] as { id: number; from_flat_id: number | null; note: string | null; status: string }[] })),
      admin
        .from("connection_requests")
        .select("from_flat_id, to_flat_id, status")
        .eq("status", "accepted")
        .or(`from_flat_id.eq.${profile.flatId},to_flat_id.eq.${profile.flatId}`)
        .then((result) => result, () => ({ data: [] as { from_flat_id: number | null; to_flat_id: number; status: string }[] })),
    ]);
    incoming = (pendingIn ?? []).map((row) => ({
      requestId: row.id as number,
      home: row.from_flat_id ? flatNumbers.get(row.from_flat_id) || "" : "",
      note: row.note || "",
    })).filter((row) => row.home);
    for (const row of accepted ?? []) {
      if (row.from_flat_id === profile.flatId && row.to_flat_id) {
        const other = flatNumbers.get(row.to_flat_id);
        if (other) connected.add(other);
      }
      if (row.to_flat_id === profile.flatId && row.from_flat_id) {
        const other = flatNumbers.get(row.from_flat_id);
        if (other) connected.add(other);
      }
    }
  }

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
        lede="Who lives in each home. Open a home for owner, family, and tenant details, then connect if you want to introduce yourself."
      />
      <MembersDirectory
        flats={sold}
        initialQuery={q}
        myFlatNumber={myFlatNumber}
        connectedHomes={[...connected]}
        incoming={incoming}
      />
    </PageShell>
  );
}
