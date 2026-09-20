import { maskPhone } from "./phone";
import type { BoardData, OwnedFlat, PublicFlat } from "./types";

type FlatRow = {
  id?: number;
  flat_number?: string;
  wing?: string | null;
  floor?: number;
  unit?: number;
  type?: string;
  facing?: string | null;
  area_sqft?: number | null;
  owner_name?: string | null;
  phone_masked?: string | null;
  phone?: string | null;
  registration?: string;
  interior?: string;
  ceremony?: string;
  moving?: string;
  updated_at?: string;
};

export function mapPublicFlat(row: FlatRow | null): PublicFlat | null {
  if (!row || row.id == null || !row.flat_number) return null;
  return {
    id: row.id,
    flatNumber: row.flat_number,
    wing: row.wing ?? "",
    floor: row.floor ?? 0,
    unit: row.unit ?? 0,
    type: row.type ?? "",
    facing: row.facing ?? "",
    areaSqft: row.area_sqft ?? null,
    ownerName: row.owner_name ?? "",
    phoneMasked: row.phone_masked ?? maskPhone(row.phone),
    registration: row.registration ?? "pending",
    interior: row.interior ?? "not_started",
    ceremony: row.ceremony ?? "pending",
    moving: row.moving ?? "pending",
    updatedAt: row.updated_at ?? "",
  };
}

export function mapOwnedFlat(row: FlatRow | null): OwnedFlat | null {
  if (!row) return null;
  const mapped = mapPublicFlat({
    ...row,
    phone_masked: maskPhone(row.phone),
  });
  if (!mapped) return null;
  return {
    ...mapped,
    phone: row.phone ?? "",
  };
}

export function summarize(flats: PublicFlat[]) {
  return {
    registrationCompleted: flats.filter((f) => f.registration === "completed").length,
    interiorInProgress: flats.filter((f) => f.interior === "in_progress").length,
    interiorCompleted: flats.filter((f) => f.interior === "completed").length,
    ceremonyCompleted: flats.filter((f) => f.ceremony === "completed").length,
    movedIn: flats.filter((f) => f.moving === "moved_in").length,
  };
}

export function groupByFloor(flats: PublicFlat[]): BoardData {
  const byFloor: Record<string, PublicFlat[]> = {};
  for (const flat of flats) {
    const key = String(flat.floor);
    if (!byFloor[key]) byFloor[key] = [];
    byFloor[key].push(flat);
  }

  const floors = Object.keys(byFloor)
    .map(Number)
    .sort((a, b) => a - b)
    .map((floor) => ({
      floor,
      flats: byFloor[String(floor)].sort((a, b) => {
        const wing = (a.wing || "A").localeCompare(b.wing || "A");
        return wing || a.unit - b.unit;
      }),
    }));

  return {
    total: flats.length,
    floors,
    flats,
    summary: summarize(flats),
  };
}
