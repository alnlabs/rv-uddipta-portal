import { cadPlanForFlat } from "@/lib/plans/cad";
import {
  A4_ENTRANCE,
  A8_ENTRANCE,
  B3_ENTRANCE,
  CORRIDORS,
  DRIVE_PATH,
  FT,
  PERIMETER_BANDS,
  SITE,
  TRACK_WIDTH,
  UNIT_FOOTPRINT,
  buildingTopY,
  compoundGatePosition,
  floorBaseY,
  unitPlanSize,
} from "@/lib/layout3d";
import { planToWorld } from "@/lib/planWorld";

export type DebugLayer =
  | "flats"
  | "edges"
  | "dimensions"
  | "corridors"
  | "roads"
  | "courts"
  | "cores"
  | "gates"
  | "rooms";

export type DebugZoom = "far" | "mid" | "near";

export type DebugLabel = {
  id: string
  type: DebugLayer
  /** Point on the geometry this label describes. */
  anchor: [number, number, number]
  value: string
  dimension?: string
  priority: 1 | 2 | 3 | 4
  minZoom: DebugZoom
};

export const DEBUG_LAYER_OPTIONS: { key: DebugLayer; label: string }[] = [
  { key: "flats", label: "Apartment IDs" },
  { key: "edges", label: "Side / Edge IDs" },
  { key: "dimensions", label: "Dimensions" },
  { key: "corridors", label: "Corridors" },
  { key: "roads", label: "Roads / Tracks" },
  { key: "courts", label: "Courts / Open Spaces" },
  { key: "cores", label: "Lift & Staircases" },
  { key: "gates", label: "Entrances / Gates" },
  { key: "rooms", label: "Internal Flat Labels" },
];

const UNIT_TOP = 0.92;

const CORRIDOR_CODE: Record<string, string> = {
  cA: "CA",
  cA4s: "CA4",
  cA8s: "CA8",
  cBw: "CW",
  cBe: "CE",
  cBe12: "C12",
  cBeN: "CN",
  cAB: "CAB",
  cABj: "CJ",
  cB5: "C5",
  cB58: "C8",
  cB58j: "C8J",
  cB59: "C9",
  cB59j: "C9J",
};

const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

function feetCompact(meters: number) {
  const value = Math.round((meters / FT) * 10) / 10;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text}′`;
}

function pair(widthM: number, depthM: number) {
  return `${feetCompact(widthM)}×${feetCompact(depthM)}`;
}

function labelY(floor: number) {
  return floor > 0 ? floorBaseY(floor) + UNIT_TOP + 0.42 : floorBaseY(1) + UNIT_TOP + 0.42;
}

function roomCode(id: string, label: string, bed: number, toilet: number) {
  const text = `${id} ${label}`.toLowerCase();
  if (/kitchen|dining/.test(text)) return { code: "K", bed, toilet };
  if (/living|drawing/.test(text)) return { code: "LR", bed, toilet };
  if (/puja/.test(text)) return { code: "PU", bed, toilet };
  if (/balc/.test(text)) return { code: "BAL", bed, toilet };
  if (/util/.test(text)) return { code: "U", bed, toilet };
  if (/dress/.test(text)) return { code: "DRS", bed, toilet };
  if (/toilet|bath/.test(text)) return { code: `T${toilet + 1}`, bed, toilet: toilet + 1 };
  if (/bed/.test(text)) return { code: `BR${bed + 1}`, bed: bed + 1, toilet };
  if (/corridor|foyer|passage/.test(text)) return { code: "C", bed, toilet };
  return { code: id.slice(0, 3).toUpperCase(), bed, toilet };
}

function edgePoint(
  x: number,
  z: number,
  w: number,
  d: number,
  edge: (typeof EDGES)[number],
  y: number,
): [number, number, number] {
  const east = -1;
  const north = 1;
  const ox =
    edge.includes("e") ? east : edge.includes("w") ? -east : 0;
  const oz =
    edge.includes("n") ? north : edge.includes("s") ? -north : 0;
  return [x + ox * (w / 2), y, z + oz * (d / 2)];
}

export function buildDebugLabels(
  flats: { flatNumber: string; wing: string; floor: number; unit: number }[],
  focusFloor: number,
): DebugLabel[] {
  const floor = focusFloor > 0 ? focusFloor : 1;
  const y = focusFloor > 0 ? labelY(floor) : buildingTopY() + 0.45;
  const labels: DebugLabel[] = [];
  const onFloor = flats.filter((flat) => flat.floor === floor);

  for (const flat of onFloor) {
    const key = `${flat.wing}${flat.unit}`;
    const spot = UNIT_FOOTPRINT[key];
    if (!spot) continue;
    const [x, z] = spot;
    const [w, d] = unitPlanSize(key);
    const anchor: [number, number, number] = [x, y, z];
    const name = focusFloor > 0 ? flat.flatNumber : key;
    labels.push({
      id: `flat-${name}`,
      type: "flats",
      anchor,
      value: name,
      dimension: pair(w, d),
      priority: 1,
      minZoom: "far",
    });
    for (const edge of EDGES) {
      labels.push({
        id: `edge-${flat.flatNumber}-${edge}`,
        type: "edges",
        anchor: edgePoint(x, z, w, d, edge, y),
        value: `${name}${edge}`,
        priority: 3,
        minZoom: "mid",
      });
    }

    const plan = cadPlanForFlat({ wing: flat.wing, unit: flat.unit });
    if (!plan) continue;
    let bed = 0;
    let toilet = 0;
    for (const room of plan.rooms) {
      if (room.kind === "corridor") continue;
      const named = roomCode(room.id, room.label, bed, toilet);
      bed = named.bed;
      toilet = named.toilet;
      const center = planToWorld(
        x,
        z,
        w,
        d,
        plan.extent.w,
        plan.extent.h,
        room.x + room.w / 2,
        room.y + room.h / 2,
        y,
      );
      labels.push({
        id: `room-${flat.flatNumber}-${room.id}`,
        type: "rooms",
        anchor: center,
        value: named.code,
        dimension: `${Math.round(room.w)}′×${Math.round(room.h)}′`,
        priority: 4,
        minZoom: "near",
      });
    }
    const entry = plan.doors.find((door) => door.entrance);
    if (entry) {
      // B3 / A4 / A8 entrances are laid out in world space next to their stair cores.
      const anchor =
        flat.wing === "B" && Number(flat.unit) === 3
          ? ([
              B3_ENTRANCE.wallFace,
              y,
              (B3_ENTRANCE.z0 + B3_ENTRANCE.z1) / 2,
            ] as [number, number, number])
          : flat.wing === "A" && Number(flat.unit) === 4
            ? ([
                A4_ENTRANCE.wallFace,
                y,
                (A4_ENTRANCE.z0 + A4_ENTRANCE.z1) / 2,
              ] as [number, number, number])
          : flat.wing === "A" && Number(flat.unit) === 8
            ? ([
                A8_ENTRANCE.wallFace,
                y,
                (A8_ENTRANCE.z0 + A8_ENTRANCE.z1) / 2,
              ] as [number, number, number])
          : planToWorld(x, z, w, d, plan.extent.w, plan.extent.h, entry.x, entry.y, y);
      labels.push({
        id: `ent-${flat.flatNumber}`,
        type: "gates",
        anchor,
        value: "ENT",
        priority: 1,
        minZoom: "mid",
      });
    }
  }

  CORRIDORS.forEach((corridor, index) => {
    const code = CORRIDOR_CODE[corridor.id] ?? corridor.id;
    const alongZ = corridor.size[1] >= corridor.size[0];
    const span = alongZ ? corridor.size[1] : corridor.size[0];
    const width = alongZ ? corridor.size[0] : corridor.size[1];
    labels.push({
      id: `cor-${corridor.id}`,
      type: "corridors",
      anchor: [corridor.x, y, corridor.z],
      value: code,
      dimension: pair(width, span),
      priority: 2,
      minZoom: "mid",
    });
    labels.push({
      id: `dim-${corridor.id}`,
      type: "dimensions",
      anchor: [corridor.x, y, alongZ ? corridor.z + span * 0.28 : corridor.z],
      value: code,
      dimension: `${feetCompact(width)} ${feetCompact(span)}`,
      priority: 2,
      minZoom: "mid",
    });
    const sides: { suffix: string; anchor: [number, number, number] }[] = alongZ
      ? [
          { suffix: "e", anchor: [corridor.x - corridor.size[0] / 2, y, corridor.z] },
          { suffix: "w", anchor: [corridor.x + corridor.size[0] / 2, y, corridor.z] },
          { suffix: "n", anchor: [corridor.x, y, corridor.z + corridor.size[1] / 2] },
          { suffix: "s", anchor: [corridor.x, y, corridor.z - corridor.size[1] / 2] },
        ]
      : [
          { suffix: "n", anchor: [corridor.x, y, corridor.z + corridor.size[1] / 2] },
          { suffix: "s", anchor: [corridor.x, y, corridor.z - corridor.size[1] / 2] },
          { suffix: "e", anchor: [corridor.x - corridor.size[0] / 2, y, corridor.z] },
          { suffix: "w", anchor: [corridor.x + corridor.size[0] / 2, y, corridor.z] },
        ];
    for (const side of sides) {
      labels.push({
        id: `cor-${corridor.id}-${side.suffix}`,
        type: "corridors",
        anchor: side.anchor,
        value: `${code}${side.suffix}`,
        priority: 3,
        minZoom: "mid",
      });
    }
    const n = index + 1;
    const lift: [number, number, number] = alongZ
      ? [corridor.x, y, corridor.z + span / 2]
      : [corridor.x - span / 2, y, corridor.z];
    const stair: [number, number, number] = alongZ
      ? [corridor.x, y, corridor.z - span / 2]
      : [corridor.x + span / 2, y, corridor.z];
    labels.push({
      id: `lift-${corridor.id}`,
      type: "cores",
      anchor: lift,
      value: `L${n}`,
      priority: 1,
      minZoom: "mid",
    });
    labels.push({
      id: `stair-${corridor.id}`,
      type: "cores",
      anchor: stair,
      value: `S${n}`,
      priority: 1,
      minZoom: "mid",
    });
  });

  const gate = compoundGatePosition();
  labels.push({
    id: "gate",
    type: "gates",
    anchor: [gate[0], y, gate[2]],
    value: "G1",
    priority: 1,
    minZoom: "far",
  });

  labels.push({
    id: "court-a",
    type: "courts",
    anchor: [SITE.courtAB.position[0], y, SITE.courtAB.position[2]],
    value: "CT-A",
    dimension: pair(SITE.courtAB.size[0], SITE.courtAB.size[1]),
    priority: 2,
    minZoom: "mid",
  });
  labels.push({
    id: "court-b",
    type: "courts",
    anchor: [SITE.courtB.position[0], y, SITE.courtB.position[2]],
    value: "CT-B",
    dimension: pair(SITE.courtB.size[0], SITE.courtB.size[1]),
    priority: 2,
    minZoom: "mid",
  });

  labels.push({
    id: "drive",
    type: "roads",
    anchor: [DRIVE_PATH.label[0], y, DRIVE_PATH.label[2]],
    value: "DR",
    dimension: feetCompact(DRIVE_PATH.width),
    priority: 2,
    minZoom: "mid",
  });
  labels.push({
    id: "track",
    type: "roads",
    anchor: [PERIMETER_BANDS.track.label[0], y, PERIMETER_BANDS.track.label[2]],
    value: "T1",
    dimension: feetCompact(TRACK_WIDTH),
    priority: 2,
    minZoom: "mid",
  });

  return labels;
}
