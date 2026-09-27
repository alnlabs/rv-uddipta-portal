import type { FlatPlan, PlanFurnish, PlanOpening, PlanRoom } from "@/lib/flatPlan";

/**
 * Typical-floor A1 (3BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (common corridor / A2)
 *   −x = west  (external / utility / balcony)
 *   −y = north (top of drawing / toward A-block)
 *   +y = south (bottom / external balconies)
 *
 * Room sizes are brochure labels only. Door widths are not labelled
 * on the source drawing and are omitted from dimension text.
 */

export const A1_META = {
  unit: "A1",
  type: "3BHK-W",
  sbuaSft: 2152,
  carpetSft: 1314,
  balconySft: 222,
  floors: "A1 stack · all floors",
} as const;

export function isA1Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 1;
}

export type A1Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A1Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  /** Quarter-swing into the room, from the hinge end of the opening. */
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A1Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

/** Brochure room rectangles, feet. */
export const A1_ROOMS: A1Room[] = [
  { id: "utility", label: "Utility", dim: "4' wide", kind: "utility", x: 1, y: 0, w: 4, h: 12.875 },
  {
    id: "kitchen",
    label: "Kitchen / Dining",
    dim: "18'-4½\" × 16'-10½\"",
    kind: "room",
    x: 5,
    y: 0,
    w: 18.375,
    h: 16.875,
  },
  { id: "toilet-dine", label: "Toilet", dim: "4'-3\" × 6'-6\"", kind: "wet", x: 23.375, y: 0, w: 4.25, h: 6.5 },
  { id: "toilet-ur", label: "Toilet", dim: "5'-6\" × 8'-9\"", kind: "wet", x: 27.625, y: 0, w: 5.5, h: 8.75 },
  {
    id: "bed-ur",
    label: "Bedroom 1",
    dim: "14'-4½\" × 12'-6\"",
    kind: "room",
    x: 33.125,
    y: 0,
    w: 14.375,
    h: 12.5,
  },
  { id: "puja", label: "Puja", dim: "6' × 4'", kind: "room", x: 5, y: 12.875, w: 6, h: 4 },
  { id: "dress", label: "Dress", dim: "5'-6\" × 4'-6\"", kind: "wet", x: 29.5, y: 16.875, w: 5.5, h: 4.5 },
  {
    id: "living",
    label: "Living / Drawing",
    dim: "12'-6\" × 17'-4½\"",
    kind: "room",
    x: 35,
    y: 12.5,
    w: 12.5,
    h: 17.375,
  },
  {
    id: "bed-ll",
    label: "Bedroom 2",
    dim: "11'-1½\" × 13'",
    kind: "room",
    x: 5,
    y: 16.875,
    w: 11.125,
    h: 13,
  },
  {
    id: "bed-lc",
    label: "Bedroom 3",
    dim: "13'-4½\" × 13'",
    kind: "room",
    x: 16.125,
    y: 16.875,
    w: 13.375,
    h: 13,
  },
  {
    id: "toilet-low",
    label: "Toilet",
    dim: "5'-6\" × 8'-1½\"",
    kind: "wet",
    x: 29.5,
    y: 21.375,
    w: 5.5,
    h: 8.5,
  },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: 16.875, w: 5, h: 13 },
  { id: "balc-n", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: 29.875, w: 16.125, h: 5 },
  { id: "ac-ledge", label: "AC ledge", dim: null, kind: "utility", x: 47.5, y: 0, w: 1.6, h: 29.875 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 49.1, y: 8, w: 6.2, h: 22 },
];

export const A1_DOORS: A1Door[] = [
  { id: "entry", wall: "e", x: 47.5, y: 21.4, length: 3.2, swing: "ccw", entrance: true },
  { id: "utility", wall: "w", x: 5, y: 5.6, length: 2.6, swing: "cw" },
  { id: "puja", wall: "n", x: 6.4, y: 12.875, length: 2.4, swing: "ccw" },
  { id: "toilet-dine", wall: "s", x: 24.2, y: 6.5, length: 2.4, swing: "cw" },
  { id: "toilet-ur", wall: "e", x: 33.125, y: 2.4, length: 2.5, swing: "cw" },
  { id: "bed-ur", wall: "s", x: 36.2, y: 12.5, length: 3, swing: "ccw" },
  { id: "bed-ll", wall: "n", x: 7.6, y: 16.875, length: 3, swing: "cw" },
  { id: "bed-lc", wall: "n", x: 20.4, y: 16.875, length: 3, swing: "ccw" },
  { id: "dress", wall: "e", x: 35, y: 17.4, length: 2.6, swing: "cw" },
  { id: "toilet-low", wall: "n", x: 31, y: 21.375, length: 2.4, swing: "ccw" },
];

/** Windows / balcony openings shown on the brochure outer walls. */
export const A1_WINDOWS: A1Window[] = [
  { id: "kit-1", x: 8.2, y: -0.18, w: 4.2, h: 0.36 },
  { id: "kit-2", x: 14.6, y: -0.18, w: 4.2, h: 0.36 },
  { id: "bed-ur", x: 37.4, y: -0.18, w: 5.6, h: 0.36 },
  { id: "util", x: 0.82, y: 3.2, w: 0.36, h: 3.4 },
  { id: "bed-ll-w", x: 4.82, y: 20.2, w: 0.36, h: 5.4 },
  { id: "bed-ll-n", x: 7.4, y: 29.7, w: 6.2, h: 0.36 },
  { id: "bed-lc-n", x: 19.6, y: 29.7, w: 6.4, h: 0.36 },
];

/** Cased opening between dining and living — no door leaf on the brochure. */
export const A1_OPENINGS = [
  { id: "dine-live", x: 23.375, y: 12.6, w: 11.625, h: 4.2 },
] as const;

export const A1_EXTENT = { x: 0, y: 0, w: 55.3, h: 34.875 };

/** Same wall runs as the A1 2D drawing. Units in feet. */
export type A1Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

export const A1_WALLS: A1Wall[] = [
  { x1: 1, y1: 0, x2: 47.5, y2: 0, outer: true },
  { x1: 47.5, y1: 0, x2: 47.5, y2: 29.875, outer: true },
  { x1: 16.125, y1: 29.875, x2: 47.5, y2: 29.875, outer: true },
  { x1: 16.125, y1: 29.875, x2: 16.125, y2: 34.875, outer: true, parapet: true },
  { x1: 0, y1: 34.875, x2: 16.125, y2: 34.875, outer: true, parapet: true },
  { x1: 0, y1: 16.875, x2: 0, y2: 34.875, outer: true, parapet: true },
  { x1: 0, y1: 16.875, x2: 1, y2: 16.875, outer: true, parapet: true },
  { x1: 1, y1: 0, x2: 1, y2: 16.875, outer: true },
  { x1: 5, y1: 0, x2: 5, y2: 29.875 },
  { x1: 5, y1: 12.875, x2: 11, y2: 12.875 },
  { x1: 11, y1: 12.875, x2: 11, y2: 16.875 },
  { x1: 11, y1: 16.875, x2: 5, y2: 16.875 },
  { x1: 5, y1: 16.875, x2: 29.5, y2: 16.875 },
  { x1: 16.125, y1: 16.875, x2: 16.125, y2: 29.875 },
  { x1: 29.5, y1: 16.875, x2: 29.5, y2: 29.875 },
  { x1: 35, y1: 12.5, x2: 35, y2: 29.875 },
  { x1: 29.5, y1: 21.375, x2: 35, y2: 21.375 },
  { x1: 23.375, y1: 0, x2: 23.375, y2: 6.5 },
  { x1: 27.625, y1: 0, x2: 27.625, y2: 8.75 },
  { x1: 33.125, y1: 0, x2: 33.125, y2: 12.5 },
  { x1: 23.375, y1: 6.5, x2: 27.625, y2: 6.5 },
  { x1: 27.625, y1: 8.75, x2: 33.125, y2: 8.75 },
  { x1: 33.125, y1: 12.5, x2: 47.5, y2: 12.5 },
  { x1: 0, y1: 16.875, x2: 5, y2: 16.875, parapet: true },
  { x1: 0, y1: 29.875, x2: 16.125, y2: 29.875, outer: true },
];

/** Same door gaps as the A1 2D drawing. */
export function splitA1Walls(walls: A1Wall[] = A1_WALLS, doors: A1Door[] = A1_DOORS): A1Wall[] {
  return walls.flatMap((wall) => {
    const horizontal = Math.abs(wall.y1 - wall.y2) < 0.05;
    const gaps = doors
      .map((door) => {
        if (horizontal && (door.wall === "n" || door.wall === "s") && Math.abs(door.y - wall.y1) < 0.12) {
          return { a: door.x, b: door.x + door.length };
        }
        if (!horizontal && (door.wall === "e" || door.wall === "w") && Math.abs(door.x - wall.x1) < 0.12) {
          return { a: door.y, b: door.y + door.length };
        }
        return null;
      })
      .filter((gap): gap is { a: number; b: number } => Boolean(gap))
      .sort((left, right) => left.a - right.a);

    if (!gaps.length) return [wall];

    const start = horizontal ? Math.min(wall.x1, wall.x2) : Math.min(wall.y1, wall.y2);
    const end = horizontal ? Math.max(wall.x1, wall.x2) : Math.max(wall.y1, wall.y2);
    const parts: A1Wall[] = [];
    let cursor = start;
    for (const gap of gaps) {
      if (gap.a - cursor > 0.15) {
        parts.push(
          horizontal
            ? { x1: cursor, y1: wall.y1, x2: gap.a, y2: wall.y2, outer: wall.outer, parapet: wall.parapet }
            : { x1: wall.x1, y1: cursor, x2: wall.x2, y2: gap.a, outer: wall.outer, parapet: wall.parapet },
        );
      }
      cursor = Math.max(cursor, gap.b);
    }
    if (end - cursor > 0.15) {
      parts.push(
        horizontal
          ? { x1: cursor, y1: wall.y1, x2: end, y2: wall.y2, outer: wall.outer, parapet: wall.parapet }
          : { x1: wall.x1, y1: cursor, x2: wall.x2, y2: end, outer: wall.outer, parapet: wall.parapet },
      );
    }
    return parts;
  });
}

function roomKind(kind: A1Room["kind"]): PlanRoom["kind"] {
  if (kind === "balcony") return "balcony";
  if (kind === "wet" || kind === "utility") return "wet";
  return "room";
}

function doorOpening(door: A1Door): PlanOpening {
  if (door.wall === "e" || door.wall === "w") {
    return {
      id: door.id,
      kind: "door",
      x: door.x - 0.7,
      y: door.y,
      w: 1.4,
      h: door.length,
    };
  }
  return {
    id: door.id,
    kind: "door",
    x: door.x,
    y: door.y - 0.7,
    w: door.length,
    h: 1.4,
  };
}

/** Same A1 geometry as the 2D architectural plan — not mirrored. */
export function a1ToFlatPlan(): FlatPlan {
  const rooms: PlanRoom[] = A1_ROOMS.map((room) => ({
    id: room.id,
    label: room.label,
    kind: roomKind(room.kind),
    x: room.x,
    y: room.y,
    w: room.w,
    h: room.h,
  }));

  const openings: PlanOpening[] = [
    ...A1_DOORS.map(doorOpening),
    ...A1_WINDOWS.map((item) => ({
      id: item.id,
      kind: "window" as const,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    })),
  ];

  const furniture: PlanFurnish[] = [
    { id: "counter", kind: "counter", x: 5.25, y: 1.1, w: 2.15, h: 10.4 },
    { id: "wc-dine", kind: "wc", x: 23.7, y: 0.45, w: 1.35, h: 2.5 },
    { id: "basin-dine", kind: "basin", x: 24.9, y: 4.85, w: 1.6, h: 1.15 },
    { id: "wc-ur", kind: "wc", x: 28.05, y: 0.45, w: 1.35, h: 2.5 },
    { id: "basin-ur", kind: "basin", x: 30.2, y: 0.45, w: 1.6, h: 1.15 },
    { id: "wc-low", kind: "wc", x: 30.9, y: 21.7, w: 1.35, h: 2.5 },
    { id: "basin-low", kind: "basin", x: 32.4, y: 21.7, w: 1.6, h: 1.15 },
  ];

  return {
    width: A1_EXTENT.w,
    height: A1_EXTENT.h,
    family: "3bhk-large",
    facing: "W",
    rooms,
    furniture,
    openings,
  };
}
