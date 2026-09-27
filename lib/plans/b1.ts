/**
 * Typical-floor B1 (3BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (living / entrance / corridor)
 *   −x = west  (4' wash / kitchen / open side)
 *   −y = north (top of drawing / kitchen)
 *   +y = south (bottom / 6' balcony)
 *
 * B1 is the southernmost unit on the western B-block row, south of B3.
 * Entrance is from the east corridor into the living room. AC ledge and
 * corridor are outside B1. Room sizes are brochure labels only.
 */

export const B1_META = {
  unit: "B1",
  type: "3BHK-W",
  sbuaSft: 1620,
  carpetSft: 1000,
  balconySft: 138,
  floors: "B1 stack · typical floors 4–10",
} as const;

export function isB1Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 1;
}

export type B1Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B1Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B1Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B1Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

/** West face of kitchen / bedroom 2 (east of wash). */
const X0 = 4;
const EAST = 40.625;
const MID = 14.125;
const SOUTH = 26.125;

/** Brochure room rectangles, feet. */
export const B1_ROOMS: B1Room[] = [
  { id: "wash", label: "Wash", dim: "4' wide", kind: "utility", x: 0, y: 0, w: 4, h: MID },
  {
    id: "kitchen",
    label: "Kitchen / Dining",
    dim: "13'-10½\" × 14'-1½\"",
    kind: "room",
    x: X0,
    y: 0,
    w: 13.875,
    h: MID,
  },
  { id: "toilet-1", label: "Toilet", dim: "4' × 7'-4½\"", kind: "wet", x: 17.875, y: 0, w: 4, h: 7.375 },
  { id: "toilet-2", label: "Toilet", dim: "6' × 7'-4½\"", kind: "wet", x: 21.875, y: 0, w: 6, h: 7.375 },
  { id: "hall", label: "", dim: null, kind: "room", x: 17.875, y: 7.375, w: 10.375, h: 6.75 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "12'-9\" × 11'-6\"",
    kind: "room",
    x: 27.875,
    y: 0,
    w: 12.75,
    h: 11.5,
  },
  {
    id: "living",
    label: "Living room",
    dim: "12'-4½\" × 15'",
    kind: "room",
    x: 28.25,
    y: 11.5,
    w: 12.375,
    h: 14.625,
  },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "9' × 12'",
    kind: "room",
    x: X0,
    y: MID,
    w: 9,
    h: 12,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "11' × 12'",
    kind: "room",
    x: 13,
    y: MID,
    w: 11,
    h: 12,
  },
  { id: "toilet-3", label: "Toilet", dim: "4'-3\" × 9'", kind: "wet", x: 24, y: MID, w: 4.25, h: 9 },
  { id: "hall-se", label: "", dim: null, kind: "room", x: 24, y: 23.125, w: 4.25, h: 3 },
  { id: "balc-s", label: "Balcony", dim: "6' wide", kind: "balcony", x: X0, y: SOUTH, w: 9, h: 6 },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: EAST, y: 11.5, w: 1.6, h: 14.625 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 42.225, y: 4, w: 6.2, h: 24 },
];

export const B1_DOORS: B1Door[] = [
  { id: "entry", wall: "e", x: EAST, y: 16.6, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "w", x: X0, y: 4.2, length: 2.4, swing: "cw" },
  { id: "toilet-1", wall: "s", x: 18.6, y: 7.375, length: 2.3, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 23.5, y: 7.375, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 31.2, y: 11.5, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "n", x: 6.6, y: MID, length: 2.6, swing: "cw" },
  { id: "bed-3", wall: "n", x: 16.2, y: MID, length: 2.8, swing: "ccw" },
  { id: "toilet-3", wall: "n", x: 25.0, y: MID, length: 2.3, swing: "cw" },
];

export const B1_WINDOWS: B1Window[] = [
  { id: "kit", x: 7.4, y: -0.18, w: 6.2, h: 0.36 },
  { id: "wash", x: -0.18, y: 3.8, w: 0.36, h: 6.4 },
  { id: "bed-1", x: 30.6, y: -0.18, w: 6.8, h: 0.36 },
  { id: "bed-2", x: 3.82, y: 16.6, w: 0.36, h: 5.8 },
  { id: "bed-3", x: 15.4, y: 25.94, w: 6.2, h: 0.36 },
];

/** Kitchen to hall, and hall to living. */
export const B1_OPENINGS = [
  { id: "kit-hall", x: 17.5, y: 8.4, w: 0.8, h: 5.4 },
  { id: "hall-live", x: 27.7, y: 11.2, w: 5.4, h: 0.9 },
  { id: "live-se", x: 27.9, y: 23.0, w: 0.8, h: 3.1 },
] as const;

export const B1_EXTENT = { x: 0, y: 0, w: 49.2, h: 34.2 };

export const B1_WALLS: B1Wall[] = [
  { x1: 0, y1: 0, x2: EAST, y2: 0, outer: true },
  { x1: EAST, y1: 0, x2: EAST, y2: SOUTH, outer: true },
  { x1: 13, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: X0, y1: SOUTH, x2: 13, y2: SOUTH, outer: true },
  { x1: X0, y1: SOUTH, x2: X0, y2: 32.125, outer: true, parapet: true },
  { x1: 13, y1: SOUTH, x2: 13, y2: 32.125, outer: true, parapet: true },
  { x1: X0, y1: 32.125, x2: 13, y2: 32.125, outer: true, parapet: true },
  { x1: 0, y1: 0, x2: 0, y2: MID, outer: true },
  { x1: 0, y1: MID, x2: X0, y2: MID, outer: true },
  { x1: X0, y1: MID, x2: X0, y2: SOUTH, outer: true },
  { x1: X0, y1: 0, x2: X0, y2: MID },
  { x1: 17.875, y1: 0, x2: 17.875, y2: MID },
  { x1: 21.875, y1: 0, x2: 21.875, y2: 7.375 },
  { x1: 27.875, y1: 0, x2: 27.875, y2: 11.5 },
  { x1: 17.875, y1: 7.375, x2: 27.875, y2: 7.375 },
  { x1: 27.875, y1: 11.5, x2: EAST, y2: 11.5 },
  { x1: X0, y1: MID, x2: 28.25, y2: MID },
  { x1: 13, y1: MID, x2: 13, y2: SOUTH },
  { x1: 24, y1: MID, x2: 24, y2: SOUTH },
  { x1: 28.25, y1: 11.5, x2: 28.25, y2: SOUTH },
  { x1: 24, y1: 23.125, x2: 28.25, y2: 23.125 },
  { x1: EAST, y1: 11.5, x2: 42.225, y2: 11.5, outer: true },
  { x1: 42.225, y1: 4, x2: 48.425, y2: 4, outer: true },
  { x1: 42.225, y1: 4, x2: 42.225, y2: 28, outer: true },
  { x1: 48.425, y1: 4, x2: 48.425, y2: 28, outer: true },
  { x1: 42.225, y1: 28, x2: 48.425, y2: 28, outer: true },
];

export function splitB1Walls(walls: B1Wall[] = B1_WALLS, doors: B1Door[] = B1_DOORS): B1Wall[] {
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
    const parts: B1Wall[] = [];
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
