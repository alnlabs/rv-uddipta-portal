import { DashboardHome } from "@/components/DashboardHome";
import { FamilyApprovals } from "@/components/FamilyApprovals";
import { PublicGate } from "@/components/PublicGate";
import { loadBoardPayload } from "@/lib/boardData";
import { mapFlatMember, mapFlatRenter, mapOwnedFlat } from "@/lib/flats";
import { maskPhone } from "@/lib/phone";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function Page() {
  const { user, profile, supabase } = await getAuthState();

  if (!user) return <PublicGate />;
  const board = await loadBoardPayload(user, supabase, profile.role);
  const community = isCommunityRole(profile.role);

  const { data: ownRow } = await supabase
    .from("flats")
    .select()
    .eq(profile.flatId ? "id" : "user_id", profile.flatId ?? user.id)
    .maybeSingle();
  const ownedFlat = mapOwnedFlat(ownRow);

  const [{ data: memberRows }, { data: renterRows }, { data: eventRows }] =
    await Promise.all([
      ownedFlat
        ? supabase
            .from("flat_members")
            .select()
            .eq("flat_id", ownedFlat.id)
            .order("sort_order", { ascending: true })
            .order("id", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      ownedFlat
        ? supabase
            .from("flat_renters")
            .select()
            .eq("flat_id", ownedFlat.id)
            .order("sort_order", { ascending: true })
            .order("id", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      ownedFlat && community
        ? supabase
            .from("activity_events")
            .select("id, kind, title, body, created_at, flat_id")
            .eq("flat_id", ownedFlat.id)
            .order("created_at", { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const members = (memberRows ?? [])
    .map((row) => mapFlatMember(row))
    .filter((member): member is NonNullable<typeof member> => Boolean(member));

  const renters = (renterRows ?? [])
    .map((row) => mapFlatRenter(row))
    .filter((renter): renter is NonNullable<typeof renter> => Boolean(renter));

  const recentActivity = (eventRows ?? []).map((event) => ({
    id: event.id as number,
    title: String(event.title ?? ""),
    body: (event.body as string | null) ?? null,
    kind: String(event.kind ?? ""),
    createdAt: String(event.created_at ?? ""),
    flatNumber: ownedFlat?.flatNumber ?? null,
  }));

  const familyWaiting =
    profile.role === "owner" && ownedFlat
      ? (
          await createAdminClient()
            .from("registration_requests")
            .select("id, owner_name, phone")
            .eq("flat_number", ownedFlat.flatNumber)
            .eq("status", "pending")
            .eq("request_kind", "family")
        ).data ?? []
      : [];

  return (
    <>
    {familyWaiting.length ? (
      <FamilyApprovals requests={familyWaiting} />
    ) : null}
    <DashboardHome
      flats={board.flats}
      includeOwners={board.includeOwners}
      myFlatNumber={ownedFlat?.flatNumber ?? null}
      greetingName={
        profile.displayName || ownedFlat?.ownerName || null
      }
      recentActivity={recentActivity}
      members={members}
      renters={renters}
      ownedFlat={ownedFlat}
      ownerPhoneMasked={ownedFlat ? maskPhone(ownedFlat.phone) : ""}
    />
    </>
  );
}
