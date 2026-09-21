import { maskPhone } from "./phone";
import type {
  BoardData,
  FlatMember,
  FlatRenter,
  Occupancy,
  OwnedFlat,
  PublicFlat,
  SaleStatus,
} from "./types";

type FlatRow = {
  id?: number;
  flat_number?: string;
  wing?: string | null;
  floor?: number;
  unit?: number;
  type?: string;
  facing?: string | null;
  area_sqft?: number | null;
  sale_status?: string | null;
  occupancy?: string | null;
  open_for_rent?: boolean | null;
  open_for_resale?: boolean | null;
  owner_name?: string | null;
  owner_photo_url?: string | null;
  phone_masked?: string | null;
  phone?: string | null;
  tenant_name?: string | null;
  tenant_phone_masked?: string | null;
  tenant_phone?: string | null;
  registration?: string;
  interior?: string;
  ceremony?: string;
  moving?: string;
  registration_date?: string | null;
  interior_start_date?: string | null;
  interior_date?: string | null;
  ceremony_date?: string | null;
  moving_date?: string | null;
  updated_at?: string;
};

type MemberRow = {
  id?: number;
  flat_id?: number;
  name?: string;
  relation?: string;
  phone?: string | null;
  photo_url?: string | null;
  sort_order?: number;
};

type RenterRow = {
  id?: number;
  flat_id?: number;
  name?: string;
  phone?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  sort_order?: number;
};

function dateOrNull(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function saleStatusOf(row: FlatRow): SaleStatus {
  if (row.sale_status === "sold" || row.sale_status === "unsold") {
    return row.sale_status;
  }
  return row.owner_name ? "sold" : "unsold";
}

function occupancyOf(row: FlatRow, saleStatus: SaleStatus): Occupancy | null {
  if (saleStatus !== "sold") return null;
  if (row.occupancy === "owner_stay" || row.occupancy === "rented") {
    return row.occupancy;
  }
  return "owner_stay";
}

export function mapPublicFlat(row: FlatRow | null): PublicFlat | null {
  if (!row || row.id == null || !row.flat_number) return null;
  const saleStatus = saleStatusOf(row);
  return {
    id: row.id,
    flatNumber: row.flat_number,
    wing: row.wing ?? "",
    floor: row.floor ?? 0,
    unit: row.unit ?? 0,
    type: row.type ?? "",
    facing: row.facing ?? "",
    areaSqft: row.area_sqft ?? null,
    saleStatus,
    occupancy: occupancyOf(row, saleStatus),
    openForRent: Boolean(row.open_for_rent),
    openForResale: Boolean(row.open_for_resale),
    ownerName: row.owner_name ?? "",
    ownerPhotoUrl: row.owner_photo_url ?? null,
    phoneMasked: row.phone_masked ?? maskPhone(row.phone),
    tenantName: row.tenant_name ?? "",
    tenantPhoneMasked:
      row.tenant_phone_masked ??
      (row.tenant_phone ? maskPhone(row.tenant_phone) : ""),
    registration: row.registration ?? "pending",
    interior: row.interior ?? "not_started",
    ceremony: row.ceremony ?? "pending",
    moving: row.moving ?? "pending",
    registrationDate: dateOrNull(row.registration_date),
    interiorStartDate: dateOrNull(row.interior_start_date),
    interiorDate: dateOrNull(row.interior_date),
    ceremonyDate: dateOrNull(row.ceremony_date),
    movingDate: dateOrNull(row.moving_date),
    updatedAt: row.updated_at ?? "",
  };
}

export function mapOwnedFlat(row: FlatRow | null): OwnedFlat | null {
  if (!row) return null;
  const mapped = mapPublicFlat({
    ...row,
    phone_masked: maskPhone(row.phone),
    tenant_phone_masked: row.tenant_phone
      ? maskPhone(row.tenant_phone)
      : row.tenant_phone_masked,
  });
  if (!mapped) return null;
  return {
    ...mapped,
    phone: row.phone ?? "",
    tenantPhone: row.tenant_phone ?? "",
  };
}

export function mapFlatMember(row: MemberRow | null): FlatMember | null {
  if (!row || row.id == null || row.flat_id == null || !row.name) return null;
  return {
    id: row.id,
    flatId: row.flat_id,
    name: row.name.trim(),
    relation: row.relation ?? "other",
    phone: row.phone ?? null,
    photoUrl: row.photo_url ?? null,
    sortOrder: row.sort_order ?? 0,
  };
}

export function mapFlatRenter(row: RenterRow | null): FlatRenter | null {
  if (!row || row.id == null || row.flat_id == null || !row.name) return null;
  return {
    id: row.id,
    flatId: row.flat_id,
    name: row.name.trim(),
    phone: row.phone ?? null,
    startDate: dateOrNull(row.start_date),
    endDate: dateOrNull(row.end_date),
    notes: row.notes ?? null,
    sortOrder: row.sort_order ?? 0,
  };
}

export function summarize(flats: PublicFlat[]) {
  return {
    sold: flats.filter((f) => f.saleStatus === "sold").length,
    unsold: flats.filter((f) => f.saleStatus !== "sold").length,
    ownerStay: flats.filter((f) => f.occupancy === "owner_stay").length,
    rented: flats.filter((f) => f.occupancy === "rented").length,
    openForRent: flats.filter((f) => f.openForRent).length,
    openForResale: flats.filter((f) => f.openForResale).length,
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
