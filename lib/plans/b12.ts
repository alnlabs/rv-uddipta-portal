/**
 * Typical-floor B12 (2BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (living / entrance / corridor / lift / stair)
 *   −x = west  (utility / kitchen / 5' balcony)
 *   −y = north (top of drawing / utility)
 *   +y = south (bottom / bedroom 2 / toilet 2)
 *
 * B12 sits west of B13. The typical plate is 2BHK-W — two bedrooms,
 * two toilets. No puja, no store, one 5' balcony. The 10'-6" × 19'-6"
 * living is the tall east room, not a third bedroom. Lift, stair and
 * corridor stay outside the apartment. Room sizes are brochure labels.
 */

export const B12_META = {
  unit: "B12",
  type: "2BHK-W",
  sbuaSft: 1369,
  floors: "B12 stack · typical floors 2–10",
} as const;

export function isB12Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 12;
}

export type B12Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B12Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B12Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B12Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const UTIL = 4.25;
const KIT_W = 7;
const KIT_H = 10.25;
const KIT_S = UTIL + KIT_H;
const T1_X = 7;
const T1_W = 4.5;
const T1_H = 8.25;
const T1_Y = UTIL;
const T1_S = T1_Y + T1_H;
const BED1_X = T1_X + T1_W;
const BED1_W = 10.5;
const BED1_H = 14.625;
const EAST = BED1_X + BED1_W;
const LIVE_Y = BED1_H;
const LIVE_H = 19.5;
const LIVE_S = LIVE_Y + LIVE_H;
const DIN_W = 12.25;
const DIN_H = 11;
const DIN_S = KIT_S + DIN_H;
const BED2_W = 11 + 10.5 / 12;
const BED2_H = 12.5;
const SOUTH = DIN_S + BED2_H;
const T2_W = 9;
const T2_H = 4.5;
const T2_X = DIN_W;
const T2_Y = LIVE_S;
const BALC_W = 5;

/** Brochure room rectangles, feet. Origin is the west face of utility / kitchen. */
export const B12_ROOMS: B12Room[] = [
  { id: "utility", label: "Utility", dim: "4'-3\" wide", kind: "utility", x: 0, y: 0, w: KIT_W, h: UTIL },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "7' × 10'-3\"",
    kind: "room",
    x: 0,
    y: UTIL,
    w: KIT_W,
    h: KIT_H,
  },
  { id: "toilet-1", label: "Toilet", dim: "4'-6\" × 8'-3\"", kind: "wet", x: T1_X, y: T1_Y, w: T1_W, h: T1_H },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "10'-6\" × 14'-7½\"",
    kind: "room",
    x: BED1_X,
    y: 0,
    w: BED1_W,
    h: BED1_H,
  },
  { id: "t1-north", label: "", dim: null, kind: "room", x: T1_X, y: 0, w: T1_W, h: T1_Y },
  { id: "hall", label: "", dim: null, kind: "room", x: T1_X, y: T1_S, w: T1_W, h: KIT_S - T1_S },
  {
    id: "dining",
    label: "Dining",
    dim: "12'-3\" × 11'",
    kind: "room",
    x: 0,
    y: KIT_S,
    w: DIN_W,
    h: DIN_H,
  },
  {
    id: "living",
    label: "Living / Drawing",
    dim: "10'-6\" × 19'-6\"",
    kind: "room",
    x: BED1_X,
    y: LIVE_Y,
    w: BED1_W,
    h: LIVE_H,
  },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "11'-10½\" × 12'-6\"",
    kind: "room",
    x: 0,
    y: DIN_S,
    w: BED2_W,
    h: BED2_H,
  },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: -BALC_W, y: DIN_S, w: BALC_W, h: BED2_H },
  { id: "toilet-2", label: "Toilet", dim: "9' × 4'-6\"", kind: "wet", x: T2_X, y: T2_Y, w: T2_W, h: T2_H },
  { id: "t2-east", label: "", dim: null, kind: "room", x: T2_X + T2_W, y: T2_Y, w: EAST - (T2_X + T2_W), h: T2_H },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: EAST, y: 8, w: 6.6, h: 28 },
  { id: "lift", label: "Lift", dim: null, kind: "corridor", x: EAST + 0.5, y: 9.2, w: 5.6, h: 6.2 },
  { id: "stairs", label: "Staircase", dim: null, kind: "corridor", x: EAST + 0.5, y: 22.4, w: 5.6, h: 12.4 },
];

export const B12_DOORS: B12Door[] = [
  { id: "entry", wall: "e", x: EAST, y: 19.6, length: 3.2, swing: "cw", entrance: true },
  { id: "utility", wall: "s", x: 2.2, y: UTIL, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "s", x: 2.1, y: KIT_S, length: 2.6, swing: "cw" },
  { id: "toilet-1", wall: "s", x: T1_X + 1.1, y: T1_S, length: 2.2, swing: "cw" },
  { id: "bed-1", wall: "s", x: BED1_X + 3.4, y: LIVE_Y, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "n", x: 3.6, y: DIN_S, length: 2.8, swing: "cw" },
  { id: "toilet-2", wall: "n", x: T2_X + 2.8, y: T2_Y, length: 2.4, swing: "ccw" },
  { id: "balc-w", wall: "w", x: 0, y: DIN_S + 4.2, length: 2.6, swing: "ccw" },
];

export const B12_WINDOWS: B12Window[] = [
  { id: "util", x: 1.4, y: -0.18, w: 4.2, h: 0.36 },
  { id: "kit-w", x: -0.18, y: 6.4, w: 0.36, h: 5.2 },
  { id: "bed-1-n", x: BED1_X + 2.2, y: -0.18, w: 6.2, h: 0.36 },
  { id: "bed-2-s", x: 2.4, y: SOUTH - 0.18, w: 6.8, h: 0.36 },
  { id: "live-s", x: T2_X + T2_W + 0.15, y: T2_Y + T2_H - 0.18, w: 1.2, h: 0.36 },
];

export const B12_OPENINGS = [
  { id: "din-live", x: 11.3, y: LIVE_Y + 3.2, w: 0.8, h: 6.4 },
] as const;

export const B12_EXTENT = { x: -7, y: -2, w: 40, h: 44 };

export const B12_WALLS: B12Wall[] = [
  { x1: 0, y1: 0, x2: EAST, y2: 0, outer: true },
  { x1: EAST, y1: 0, x2: EAST, y2: LIVE_S + T2_H, outer: true },
  { x1: 0, y1: SOUTH, x2: BED2_W, y2: SOUTH, outer: true },
  { x1: BED2_W, y1: T2_Y + T2_H, x2: EAST, y2: T2_Y + T2_H, outer: true },
  { x1: BED2_W, y1: SOUTH, x2: BED2_W, y2: T2_Y + T2_H, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: DIN_S, outer: true },
  { x1: -BALC_W, y1: DIN_S, x2: 0, y2: DIN_S, outer: true, parapet: true },
  { x1: -BALC_W, y1: DIN_S, x2: -BALC_W, y2: SOUTH, outer: true, parapet: true },
  { x1: -BALC_W, y1: SOUTH, x2: 0, y2: SOUTH, outer: true, parapet: true },
  { x1: 0, y1: DIN_S, x2: 0, y2: SOUTH },
  { x1: 0, y1: UTIL, x2: KIT_W, y2: UTIL },
  { x1: KIT_W, y1: 0, x2: KIT_W, y2: KIT_S },
  { x1: 0, y1: KIT_S, x2: DIN_W, y2: KIT_S },
  { x1: T1_X, y1: T1_Y, x2: T1_X + T1_W, y2: T1_Y },
  { x1: T1_X + T1_W, y1: 0, x2: T1_X + T1_W, y2: T1_S },
  { x1: T1_X, y1: T1_S, x2: T1_X + T1_W, y2: T1_S },
  { x1: BED1_X, y1: LIVE_Y, x2: EAST, y2: LIVE_Y },
  { x1: BED1_X, y1: KIT_S, x2: BED1_X, y2: LIVE_Y + 3.2 },
  { x1: BED1_X, y1: LIVE_Y + 9.6, x2: BED1_X, y2: DIN_S },
  { x1: 0, y1: DIN_S, x2: BED2_W, y2: DIN_S },
  { x1: BED2_W, y1: DIN_S, x2: BED2_W, y2: SOUTH },
  { x1: T2_X, y1: T2_Y, x2: T2_X + T2_W, y2: T2_Y },
  { x1: T2_X, y1: T2_Y, x2: T2_X, y2: T2_Y + T2_H },
  { x1: T2_X + T2_W, y1: T2_Y, x2: T2_X + T2_W, y2: T2_Y + T2_H },
  { x1: EAST, y1: 8, x2: EAST + 6.6, y2: 8, outer: true },
  { x1: EAST + 6.6, y1: 8, x2: EAST + 6.6, y2: 36, outer: true },
  { x1: EAST, y1: 36, x2: EAST + 6.6, y2: 36, outer: true },
  { x1: EAST + 0.5, y1: 9.2, x2: EAST + 6.1, y2: 9.2 },
  { x1: EAST + 0.5, y1: 9.2, x2: EAST + 0.5, y2: 15.4 },
  { x1: EAST + 6.1, y1: 9.2, x2: EAST + 6.1, y2: 15.4 },
  { x1: EAST + 0.5, y1: 15.4, x2: EAST + 6.1, y2: 15.4 },
  { x1: EAST + 0.5, y1: 22.4, x2: EAST + 6.1, y2: 22.4 },
  { x1: EAST + 0.5, y1: 22.4, x2: EAST + 0.5, y2: 34.8 },
  { x1: EAST + 6.1, y1: 22.4, x2: EAST + 6.1, y2: 34.8 },
  { x1: EAST + 0.5, y1: 34.8, x2: EAST + 6.1, y2: 34.8 },
];

export function splitB12Walls(walls: B12Wall[] = B12_WALLS, doors: B12Door[] = B12_DOORS): B12Wall[] {
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
    const parts: B12Wall[] = [];
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
