import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin";
import { groupByFloor, mapPublicFlat } from "@/lib/flats";
import { maskPhone } from "@/lib/phone";
import { isCommunityRole, type AppRole } from "@/lib/roles";
import type { BoardData, PublicFlat } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

export type MemberSummary = {
  name: string
  photoUrl: string | null
};

export type RenterSummary = {
  name: string
  phoneMasked: string
  startDate: string | null
  endDate: string | null
  current: boolean
};

export type BoardPayload = {
  flats: PublicFlat[]
  membersByFlatId: Record<number, MemberSummary[]>
  rentersByFlatId: Record<number, RenterSummary[]>
  data: BoardData
  error: string
  includeOwners: boolean
};

function stripOwnerPii(flat: PublicFlat): PublicFlat {
  return {
    ...flat,
    occupancy: null,
    ownerName: "",
    ownerPhotoUrl: null,
    phoneMasked: "",
    tenantName: "",
    tenantPhoneMasked: "",
    registration: "pending",
    interior: "not_started",
    ceremony: "pending",
    moving: "pending",
    registrationDate: null,
    interiorStartDate: null,
    interiorDate: null,
    ceremonyDate: null,
    movingDate: null,
  };
}

/** Load flats for dashboard/community/3D. Visitors get brochure + listing flags only. */
export async function loadBoardPayload(
  user: User,
  userClient: SupabaseClient,
  role: AppRole | null = null,
): Promise<BoardPayload> {
  const includeOwners = isCommunityRole(role) || isAdminUser(user);
  const db =
    includeOwners && (isAdminUser(user) || role === "admin" || role === "builder")
      ? createAdminClient()
      : userClient;

  const { data: rows, error } = await db
    .from(includeOwners ? "flats_public" : "flats_brochure")
    .select()
    .order("floor")
    .order("unit");

  let flats = (rows ?? [])
    .map((row) => mapPublicFlat(row))
    .filter((flat): flat is PublicFlat => Boolean(flat));

  if (!includeOwners) {
    flats = flats.map(stripOwnerPii);
  }

  const membersByFlatId: Record<number, MemberSummary[]> = {};
  const rentersByFlatId: Record<number, RenterSummary[]> = {};
  if (includeOwners) {
    const [{ data: memberRows }, { data: renterRows }] = await Promise.all([
      db
        .from("flat_members")
        .select("flat_id, name, photo_url, sort_order")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
      db
        .from("flat_renters")
        .select("flat_id, name, phone, start_date, end_date, sort_order")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    for (const row of memberRows ?? []) {
      const flatId = row.flat_id as number | null;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (flatId == null || !name) continue;
      if (!membersByFlatId[flatId]) membersByFlatId[flatId] = [];
      membersByFlatId[flatId].push({
        name,
        photoUrl:
          typeof row.photo_url === "string" && row.photo_url
            ? row.photo_url
            : null,
      });
    }

    for (const row of renterRows ?? []) {
      const flatId = row.flat_id as number | null;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (flatId == null || !name) continue;
      if (!rentersByFlatId[flatId]) rentersByFlatId[flatId] = [];
      const endDate =
        typeof row.end_date === "string" ? row.end_date.slice(0, 10) : null;
      const startDate =
        typeof row.start_date === "string" ? row.start_date.slice(0, 10) : null;
      rentersByFlatId[flatId].push({
        name,
        phoneMasked: row.phone ? maskPhone(String(row.phone)) : "",
        startDate,
        endDate,
        current: !endDate,
      });
    }
  }

  return {
    flats,
    membersByFlatId,
    rentersByFlatId,
    data: groupByFloor(flats),
    error: error?.message ?? "",
    includeOwners,
  };
}

export function listingFlats(flats: PublicFlat[], kind: "rent" | "resale") {
  return flats.filter((flat) =>
    kind === "rent" ? flat.openForRent : flat.openForResale,
  );
}
