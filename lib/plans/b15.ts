/**
 * Typical-floor B15 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedroom 3 / toilet 3 / 5' balcony)
 *   −x = west  (drawing / entrance / AC ledge)
 *   −y = north (top of drawing / 4' wash / 5' balcony)
 *   +y = south (bottom / drawing / bedrooms 2–3)
 *
 * B15 is the east-end B-block 3BHK. Dining, store and puja stay
 * separate. Three toilets stay separate. North and east 5' balconies
 * and the west AC ledge stay outside the apartment. Room sizes are
 * brochure labels.
 */

export const B15_META = {
  unit: "B15",
  type: "3BHK-E",
  sbuaSft: 1794,
  carpetSft: 1063,
  balconySft: 179,
  floors: "B15 stack · typical floors 5–10",
} as const;

export function isB15Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 15;
}

export type B15Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B15Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B15Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B15Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const WASH = 4;
const KIT_W = 10.625;
const KIT_S = 14;
const DIN_X = 10.625;
const DIN_W = 10;
const DIN_Y = 5;
const T1_X = 20.625;
const T2_X = 24.625;
const BED1_X = 29.25;
const EAST_N = 40.25;
const DRAW_Y = 18.5;
const DRAW_H = 12.25;
const SOUTH = 30.75;
const BED2_X = 15;
const BED3_X = 25;
const T3_X = 36.375;
const EAST_S = 41;
const BALC_E = 46;
const T3_S = 27;

/** Brochure room rectangles, feet. Origin is the west face of wash / kitchen / drawing. */
export const B15_ROOMS: B15Room[] = [
  { id: "wash", label: "Wash", dim: "4' wide", kind: "utility", x: 0, y: 0, w: KIT_W, h: WASH },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "10'-7½\" × 10'",
    kind: "room",
    x: 0,
    y: WASH,
    w: KIT_W,
    h: 10,
  },
  { id: "store", label: "Store", dim: "5' × 3'-6\"", kind: "room", x: 0, y: KIT_S, w: 5, h: 3.5 },
  {
    id: "dining",
    label: "Dining",
    dim: "10' × 13'",
    kind: "room",
    x: DIN_X,
    y: DIN_Y,
    w: DIN_W,
    h: 13,
  },
  { id: "puja", label: "Puja", dim: "4'-10½\" × 3'-6\"", kind: "room", x: 5.75, y: 14.25, w: 4.875, h: 3.5 },
  { id: "toilet-1", label: "Toilet", dim: "4' × 6'-6\"", kind: "wet", x: T1_X, y: DIN_Y, w: 4, h: 6.5 },
  { id: "toilet-2", label: "Toilet", dim: "4'-7½\" × 9'", kind: "wet", x: T2_X, y: DIN_Y, w: 4.625, h: 9 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "11' × 13'-6\"",
    kind: "room",
    x: BED1_X,
    y: DIN_Y,
    w: 11,
    h: 13.5,
  },
  { id: "balc-n", label: "Balcony", dim: "5' wide", kind: "balcony", x: DIN_X, y: 0, w: 29.625, h: 5 },
  { id: "t1-foyer", label: "", dim: null, kind: "room", x: T1_X, y: 11.5, w: 4, h: 2.5 },
  { id: "hall", label: "", dim: null, kind: "room", x: T1_X, y: 14, w: 8.625, h: 4.5 },
  {
    id: "drawing",
    label: "Drawing",
    dim: "15' × 12'-3\"",
    kind: "room",
    x: 0,
    y: DRAW_Y,
    w: 15,
    h: DRAW_H,
  },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "10' × 12'-3\"",
    kind: "room",
    x: BED2_X,
    y: DRAW_Y,
    w: 10,
    h: DRAW_H,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "11'-4½\" × 12'-3\"",
    kind: "room",
    x: BED3_X,
    y: DRAW_Y,
    w: 11.375,
    h: DRAW_H,
  },
  { id: "toilet-3", label: "Toilet", dim: "4'-7½\" × 8'-6\"", kind: "wet", x: T3_X, y: DRAW_Y, w: 4.625, h: 8.5 },
  { id: "bed-3-alcove", label: "", dim: null, kind: "room", x: T3_X, y: T3_S, w: 4.625, h: SOUTH - T3_S },
  { id: "balc-e", label: "Balcony", dim: "5' wide", kind: "balcony", x: EAST_S, y: DRAW_Y, w: 5, h: DRAW_H },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: -1.6, y: DRAW_Y, w: 1.6, h: DRAW_H },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: -7.4, y: 16, w: 5.8, h: 16.5 },
];

export const B15_DOORS: B15Door[] = [
  { id: "entry", wall: "w", x: 0, y: 21.4, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "s", x: 3.8, y: WASH, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "e", x: KIT_W, y: 8.2, length: 2.6, swing: "cw" },
  { id: "store", wall: "s", x: 1.2, y: 17.5, length: 2.2, swing: "cw" },
  { id: "puja", wall: "n", x: 6.6, y: 14.25, length: 2.2, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: 21.2, y: 11.5, length: 2.2, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 25.4, y: 14, length: 2.3, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 31.4, y: 18.5, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "n", x: 17.4, y: DRAW_Y, length: 2.8, swing: "cw" },
  { id: "bed-3", wall: "n", x: 27.6, y: DRAW_Y, length: 2.8, swing: "ccw" },
  { id: "toilet-3", wall: "w", x: T3_X, y: 20.4, length: 2.4, swing: "cw" },
  { id: "din-balc", wall: "n", x: 13.2, y: DIN_Y, length: 6.4, swing: "cw" },
  { id: "bed1-balc", wall: "n", x: 31.4, y: DIN_Y, length: 6.8, swing: "ccw" },
  { id: "balc-e", wall: "e", x: EAST_S, y: 27.2, length: 2.6, swing: "ccw" },
];

export const B15_WINDOWS: B15Window[] = [
  { id: "wash", x: 2.8, y: -0.18, w: 5.0, h: 0.36 },
  { id: "bed-1-n", x: 31.4, y: -0.18, w: 6.8, h: 0.36 },
  { id: "draw-s", x: 3.2, y: 30.57, w: 8.4, h: 0.36 },
  { id: "draw-w", x: -0.18, y: 25.6, w: 0.36, h: 3.4 },
  { id: "bed-2-s", x: 17.2, y: 30.57, w: 5.8, h: 0.36 },
  { id: "bed-3-s", x: 27.4, y: 30.57, w: 6.2, h: 0.36 },
];

export const B15_OPENINGS = [
  { id: "din-draw", x: 11.2, y: 17.85, w: 3.6, h: 0.9 },
  { id: "din-balc", x: 13.2, y: 4.7, w: 6.4, h: 0.7 },
  { id: "bed1-balc", x: 31.4, y: 4.7, w: 6.8, h: 0.7 },
] as const;

export const B15_EXTENT = { x: -8, y: -2, w: 56, h: 36 };

export const B15_WALLS: B15Wall[] = [
  { x1: 0, y1: 0, x2: KIT_W, y2: 0, outer: true },
  { x1: KIT_W, y1: 0, x2: EAST_N, y2: 0, outer: true, parapet: true },
  { x1: EAST_N, y1: 0, x2: EAST_N, y2: DRAW_Y, outer: true },
  { x1: EAST_N, y1: DRAW_Y, x2: EAST_S, y2: DRAW_Y, outer: true },
  { x1: EAST_S, y1: DRAW_Y, x2: BALC_E, y2: DRAW_Y, outer: true, parapet: true },
  { x1: BALC_E, y1: DRAW_Y, x2: BALC_E, y2: SOUTH, outer: true, parapet: true },
  { x1: EAST_S, y1: SOUTH, x2: BALC_E, y2: SOUTH, outer: true, parapet: true },
  { x1: 0, y1: SOUTH, x2: EAST_S, y2: SOUTH, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: SOUTH, outer: true },
  { x1: KIT_W, y1: 0, x2: KIT_W, y2: 8.2 },
  { x1: KIT_W, y1: 10.8, x2: KIT_W, y2: 17.75 },
  { x1: 0, y1: WASH, x2: KIT_W, y2: WASH },
  { x1: 0, y1: KIT_S, x2: 5, y2: KIT_S },
  { x1: 5, y1: KIT_S, x2: 5, y2: 17.5 },
  { x1: 0, y1: 17.5, x2: 5, y2: 17.5 },
  { x1: DIN_X, y1: DIN_Y, x2: EAST_N, y2: DIN_Y },
  { x1: T1_X, y1: DIN_Y, x2: T1_X, y2: DRAW_Y },
  { x1: T2_X, y1: DIN_Y, x2: T2_X, y2: 14 },
  { x1: BED1_X, y1: DIN_Y, x2: BED1_X, y2: 18.5 },
  { x1: T1_X, y1: 11.5, x2: T2_X, y2: 11.5 },
  { x1: T2_X, y1: 14, x2: BED1_X, y2: 14 },
  { x1: 5.75, y1: 14.25, x2: 10.625, y2: 14.25 },
  { x1: 5.75, y1: 14.25, x2: 5.75, y2: 17.75 },
  { x1: 5.75, y1: 17.75, x2: 10.625, y2: 17.75 },
  { x1: DIN_X, y1: 18, x2: 11.2, y2: 18 },
  { x1: 14.8, y1: 18, x2: BED1_X, y2: 18 },
  { x1: 0, y1: DRAW_Y, x2: 11.2, y2: DRAW_Y },
  { x1: 14.8, y1: DRAW_Y, x2: EAST_S, y2: DRAW_Y },
  { x1: 15, y1: DRAW_Y, x2: 15, y2: SOUTH },
  { x1: 25, y1: DRAW_Y, x2: 25, y2: SOUTH },
  { x1: T3_X, y1: DRAW_Y, x2: T3_X, y2: T3_S },
  { x1: T3_X, y1: T3_S, x2: EAST_S, y2: T3_S },
  { x1: BED1_X, y1: 18.5, x2: EAST_N, y2: 18.5 },
  { x1: EAST_S, y1: DRAW_Y, x2: EAST_S, y2: SOUTH },
  { x1: -1.6, y1: DRAW_Y, x2: 0, y2: DRAW_Y, outer: true },
  { x1: -7.4, y1: 16, x2: -1.6, y2: 16, outer: true },
  { x1: -7.4, y1: 16, x2: -7.4, y2: 32.5, outer: true },
  { x1: -1.6, y1: 16, x2: -1.6, y2: SOUTH, outer: true },
  { x1: -7.4, y1: 32.5, x2: -1.6, y2: 32.5, outer: true },
];

export function splitB15Walls(walls: B15Wall[] = B15_WALLS, doors: B15Door[] = B15_DOORS): B15Wall[] {
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
    const parts: B15Wall[] = [];
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
