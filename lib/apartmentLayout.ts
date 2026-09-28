import { facingLabel, saleOccupancyLabel, typeLabel } from "@/lib/flatDisplay";
import { planForFlat } from "@/lib/flatPlan";
import { A1_META, A1_ROOMS, isA1Unit } from "@/lib/plans/a1";
import { A2_META, A2_ROOMS, isA2Unit } from "@/lib/plans/a2";
import { A3_META, A3_ROOMS, isA3Unit } from "@/lib/plans/a3";
import { A4_META, A4_ROOMS, isA4Unit } from "@/lib/plans/a4";
import { A6_META, A6_ROOMS, isA6Unit } from "@/lib/plans/a6";
import { A7_META, A7_ROOMS, isA7Unit } from "@/lib/plans/a7";
import { A8_META, A8_ROOMS, isA8Unit } from "@/lib/plans/a8";
import { A10_META, A10_ROOMS, isA10Unit } from "@/lib/plans/a10";
import { B1_META, B1_ROOMS, isB1Unit } from "@/lib/plans/b1";
import { B2_META, B2_ROOMS, isB2Unit } from "@/lib/plans/b2";
import { B3_META, B3_ROOMS, isB3Unit } from "@/lib/plans/b3";
import { B4_META, B4_ROOMS, isB4Unit } from "@/lib/plans/b4";
import { B5_META, B5_ROOMS, isB5Unit } from "@/lib/plans/b5";
import { B6_META, B6_ROOMS, isB6Unit } from "@/lib/plans/b6";
import { B7_META, B7_ROOMS, isB7Unit } from "@/lib/plans/b7";
import { B8_META, B8_ROOMS, isB8Unit } from "@/lib/plans/b8";
import { B9_META, B9_ROOMS, isB9Unit } from "@/lib/plans/b9";
import { B10_META, B10_ROOMS, isB10Unit } from "@/lib/plans/b10";
import { B11_META, B11_ROOMS, isB11Unit } from "@/lib/plans/b11";
import { B12_META, B12_ROOMS, isB12Unit } from "@/lib/plans/b12";
import { B13_META, B13_ROOMS, isB13Unit } from "@/lib/plans/b13";
import { B14_META, B14_ROOMS, isB14Unit } from "@/lib/plans/b14";
import { B15_META, B15_ROOMS, isB15Unit } from "@/lib/plans/b15";
import type { PublicFlat } from "@/lib/types";

export type LayoutRoom = {
  id: string
  label: string
  dim: string | null
  kind: string
};

export type ApartmentLayout = {
  stack: string
  typeCode: string | null
  sbuaSft: number | null
  rooms: LayoutRoom[]
};

export type InteriorLink = {
  id: string
  label: string
  href?: string
  action?: "3d"
  ready: boolean
};

const PLAN_PAGES = new Set([
  "a1",
  "a2",
  "a3",
  "a4",
  "a6",
  "a7",
  "a8",
  "a10",
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "b6",
  "b7",
  "b8",
  "b9",
  "b10",
  "b11",
  "b12",
  "b13",
  "b14",
  "b15",
]);

type UnitMeta = {
  unit: string
  type: string
  sbuaSft?: number
};

function namedRooms(rooms: LayoutRoom[]): LayoutRoom[] {
  return rooms.filter((room) => room.label.trim() && room.kind !== "corridor");
}

function knownLayout(wing: string, unit: number): ApartmentLayout | null {
  const input = { wing, unit };
  const packs: Array<{
    match: boolean
    meta: UnitMeta
    rooms: LayoutRoom[]
  }> = [
    { match: isA1Unit(input), meta: A1_META, rooms: A1_ROOMS },
    { match: isA2Unit(input), meta: A2_META, rooms: A2_ROOMS },
    { match: isA3Unit(input), meta: A3_META, rooms: A3_ROOMS },
    { match: isA4Unit(input), meta: A4_META, rooms: A4_ROOMS },
    { match: isA6Unit(input), meta: A6_META, rooms: A6_ROOMS },
    { match: isA7Unit(input), meta: A7_META, rooms: A7_ROOMS },
    { match: isA8Unit(input), meta: A8_META, rooms: A8_ROOMS },
    { match: isA10Unit(input), meta: A10_META, rooms: A10_ROOMS },
    { match: isB1Unit(input), meta: B1_META, rooms: B1_ROOMS },
    { match: isB2Unit(input), meta: B2_META, rooms: B2_ROOMS },
    { match: isB3Unit(input), meta: B3_META, rooms: B3_ROOMS },
    { match: isB4Unit(input), meta: B4_META, rooms: B4_ROOMS },
    { match: isB5Unit(input), meta: B5_META, rooms: B5_ROOMS },
    { match: isB6Unit(input), meta: B6_META, rooms: B6_ROOMS },
    { match: isB7Unit(input), meta: B7_META, rooms: B7_ROOMS },
    { match: isB8Unit(input), meta: B8_META, rooms: B8_ROOMS },
    { match: isB9Unit(input), meta: B9_META, rooms: B9_ROOMS },
    { match: isB10Unit(input), meta: B10_META, rooms: B10_ROOMS },
    { match: isB11Unit(input), meta: B11_META, rooms: B11_ROOMS },
    { match: isB12Unit(input), meta: B12_META, rooms: B12_ROOMS },
    { match: isB13Unit(input), meta: B13_META, rooms: B13_ROOMS },
    { match: isB14Unit(input), meta: B14_META, rooms: B14_ROOMS },
    { match: isB15Unit(input), meta: B15_META, rooms: B15_ROOMS },
  ];
  const hit = packs.find((pack) => pack.match);
  if (!hit) return null;
  return {
    stack: hit.meta.unit,
    typeCode: hit.meta.type,
    sbuaSft: hit.meta.sbuaSft ?? null,
    rooms: namedRooms(hit.rooms),
  };
}

export function apartmentLayout(flat: {
  wing: string
  unit: number
  type: string
  facing: string
  areaSqft?: number | null
  flatNumber: string
  floor: number
}): ApartmentLayout {
  const known = knownLayout(flat.wing, flat.unit);
  if (known) return known;
  const plan = planForFlat(flat);
  return {
    stack: `${flat.wing}${flat.unit}`,
    typeCode: null,
    sbuaSft: flat.areaSqft ?? null,
    rooms: namedRooms(
      plan.rooms.map((room) => ({
        id: room.id,
        label: room.label,
        dim: null,
        kind: room.kind,
      })),
    ),
  };
}

export function unitPlanHref(wing: string, unit: number) {
  const slug = `${wing.toLowerCase()}${unit}`;
  return PLAN_PAGES.has(slug) ? `/plans/${slug}` : null;
}

export function heroMeta(flat: Pick<PublicFlat, "type" | "wing" | "floor" | "facing" | "areaSqft">) {
  return [
    typeLabel(flat.type),
    flat.wing ? `Wing ${flat.wing}` : null,
    `Floor ${flat.floor}`,
    flat.facing ? `${facingLabel(flat.facing)} Facing` : null,
    flat.areaSqft ? `${flat.areaSqft.toLocaleString("en-IN")} sq ft` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function occupancyCopy(flat: Pick<PublicFlat, "saleStatus" | "occupancy">) {
  return saleOccupancyLabel(flat);
}

export function interiorLinks(flat: {
  wing: string
  unit: number
}): InteriorLink[] {
  const planHref = unitPlanHref(flat.wing, flat.unit);
  return [
    { id: "quotation", label: "Quotation", ready: false },
    {
      id: "2d",
      label: "2D Designs",
      href: planHref ?? undefined,
      ready: Boolean(planHref),
    },
    { id: "3d", label: "3D Designs", action: "3d", ready: true },
    { id: "materials", label: "Materials", ready: false },
    { id: "rooms", label: "Room-wise designs", ready: false },
  ];
}

export function layoutGroups(layout: ApartmentLayout) {
  const bedrooms = layout.rooms.filter((room) => /bed/i.test(room.label));
  const living = layout.rooms.filter((room) =>
    /living|drawing|dining|foyer/i.test(room.label),
  );
  const kitchen = layout.rooms.find((room) => /kitchen/i.test(room.label));
  const puja = layout.rooms.find((room) => /puja/i.test(room.label));
  const wash = layout.rooms.find((room) => /wash|utility/i.test(room.label));
  const toilets = layout.rooms.filter(
    (room) =>
      room.kind === "wet" || /toilet|bath|\bt\d\b/i.test(room.label),
  );
  const balconies = layout.rooms.filter(
    (room) => room.kind === "balcony" || /balc|sit-out/i.test(room.label),
  );
  return { bedrooms, living, kitchen, puja, wash, toilets, balconies };
}

export function formatRoomLine(room: LayoutRoom) {
  return room.dim ? `${room.label} · ${room.dim}` : room.label;
}
