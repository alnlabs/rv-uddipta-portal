import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/DashboardHome";
import { HouseholdHome } from "@/components/HouseholdHome";
import { FamilyApprovals } from "@/components/FamilyApprovals";
import { PublicGate } from "@/components/PublicGate";
import { loadBoardPayload } from "@/lib/boardData";
import { mapFlatMember, mapFlatRenter, mapOwnedFlat } from "@/lib/flats";
import { maskPhone } from "@/lib/phone";
import { visibleText } from "@/lib/richText";
import { isSuperAdmin } from "@/lib/admin";
import { canEditFlat, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function Page() {
  const { user, profile, supabase } = await getAuthState();

  if (!user) return <PublicGate />;
  if (isSuperAdmin(user)) redirect("/account");
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

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const familyWaiting =
    profile.role === "owner" && ownedFlat
      ? (
          await admin
            .from("registration_requests")
            .select("id, owner_name, phone")
            .eq("flat_number", ownedFlat.flatNumber)
            .eq("status", "pending")
            .eq("request_kind", "family")
        ).data ?? []
      : [];

  const [{ data: openNotes }, { data: todayEvents }] = await Promise.all([
    ownedFlat
      ? admin
          .from("member_notes")
          .select("id, kind, body, status")
          .eq("flat_id", ownedFlat.id)
          .neq("status", "done")
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as { id: number; kind: string; body: string; status: string }[] }),
    admin
      .from("member_posts")
      .select("id, body, starts_on, author_name")
      .eq("kind", "event")
      .eq("starts_on", today)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const needsAction = [
    ...familyWaiting.map((row) => ({
      title: "Family waiting for approval",
      detail: String(row.owner_name || "A family member"),
      href: "/",
    })),
    ...(openNotes ?? []).map((note) => ({
      title: note.kind === "feedback" ? "Feedback with the office" : "Request with the office",
      detail: String(note.body || ""),
      href: "/requests",
    })),
  ];
  const todayItems = (todayEvents ?? []).map((event) => ({
    title: visibleText(String(event.body || "")) || "Event",
    when: event.author_name ? `Posted by ${event.author_name}` : "Today",
    href: "/feed?view=events",
  }));

  if ((profile.role === "tenant" || profile.role === "co_owner") && ownedFlat) {
    return (
      <HouseholdHome
        kind={profile.role === "tenant" ? "tenant" : "family"}
        name={profile.displayName || null}
        flat={ownedFlat}
        members={members}
        renters={renters}
        needsAction={needsAction}
        todayItems={todayItems}
      />
    );
  }

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
      canEditHome={canEditFlat(profile.role)}
      needsAction={needsAction}
      todayItems={todayItems}
    />
    </>
  );
}
