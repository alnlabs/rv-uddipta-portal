import { cookies } from "next/headers";
import { DashboardHome } from "@/components/DashboardHome";
import { PublicGate } from "@/components/PublicGate";
import { loadBoardPayload } from "@/lib/boardData";
import { ensureProfile, isCommunityRole } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <PublicGate />;

  const profile = await ensureProfile(user, supabase);
  const board = await loadBoardPayload(user, supabase, profile.role);
  const community = isCommunityRole(profile.role);

  const [{ data: ownFlat }, feedQuery] = await Promise.all([
    supabase
      .from("flats")
      .select("flat_number")
      .eq("user_id", user.id)
      .maybeSingle(),
    (async () => {
      let query = supabase
        .from("activity_events")
        .select("id, kind, title, body, created_at, flat_id")
        .order("created_at", { ascending: false })
        .limit(6);
      if (!community) {
        query = query.eq("visibility", "public");
      }
      return query;
    })(),
  ]);

  const { data: events } = feedQuery;
  const flatIds = [
    ...new Set(
      (events ?? [])
        .map((e) => e.flat_id as number | null)
        .filter((id): id is number => id != null),
    ),
  ];
  const flatLabels: Record<number, string> = {};
  if (flatIds.length) {
    const { data: flatRows } = await supabase
      .from("flats")
      .select("id, flat_number")
      .in("id", flatIds);
    for (const row of flatRows ?? []) {
      flatLabels[row.id] = row.flat_number;
    }
  }

  const recentActivity = (events ?? []).map((event) => ({
    id: event.id as number,
    title: String(event.title ?? ""),
    body: (event.body as string | null) ?? null,
    kind: String(event.kind ?? ""),
    createdAt: String(event.created_at ?? ""),
    flatNumber:
      event.flat_id != null ? (flatLabels[event.flat_id as number] ?? null) : null,
  }));

  return (
    <DashboardHome
      flats={board.flats}
      includeOwners={board.includeOwners}
      myFlatNumber={ownFlat?.flat_number ?? null}
      recentActivity={recentActivity}
    />
  );
}
