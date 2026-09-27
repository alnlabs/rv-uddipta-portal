/**
 * Typical-floor B10 (2BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (living / entrance / corridor)
 *   −x = west  (4' wash / 5' balcony)
 *   −y = north (top of drawing / wash / kitchen)
 *   +y = south (bottom / bedroom 2 / living)
 *
 * B10 sits west of B11 on the south B-block row. Two bedrooms, two
 * toilets, dedicated puja. No dining, no store. Wash sits north of
 * the kitchen. Corridor and AC ledge stay outside. Room sizes are
 * brochure labels.
 */

export const B10_META = {
  unit: "B10",
  type: "2BHK-W",
  sbuaSft: 1333,
  floors: "B10 stack · typical floors 2–10",
} as const;

export function isB10Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 10;
}

export type B10Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B10Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B10Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B10Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const WASH = 4;
const KIT_W = 9.5;
const KIT_H = 11;
const KIT_S = WASH + KIT_H;
const T1_X = KIT_W;
const T1_W = 4.5;
const T1_H = 6;
const T2_X = T1_X + T1_W;
const T2_W = 6.5;
const T2_H = 7.25;
const BED1_X = T2_X + T2_W;
const BED1_W = 13.5;
const EAST = BED1_X + BED1_W;
const DRAW_Y = KIT_S;
const DRAW_H = 11.5;
const SOUTH = DRAW_Y + DRAW_H;
const BED2_W = 10;
const PUJA_X = BED2_W;
const PUJA_W = 3.5;
const PUJA_H = 6;
const LIVE_X = PUJA_X + PUJA_W;
const LIVE_W = 20;

/** Brochure room rectangles, feet. Origin is the west face of wash / kitchen / bedroom 2. */
export const B10_ROOMS: B10Room[] = [
  { id: "wash", label: "Wash", dim: "4' wide", kind: "utility", x: 0, y: 0, w: KIT_W, h: WASH },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "9'-6\" × 11'",
    kind: "room",
    x: 0,
    y: WASH,
    w: KIT_W,
    h: KIT_H,
  },
  { id: "toilet-1", label: "Toilet", dim: "4'-6\" × 6'", kind: "wet", x: T1_X, y: WASH, w: T1_W, h: T1_H },
  { id: "toilet-2", label: "Toilet", dim: "6'-6\" × 7'-3\"", kind: "wet", x: T2_X, y: WASH, w: T2_W, h: T2_H },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "13'-6\" × 11'",
    kind: "room",
    x: BED1_X,
    y: WASH,
    w: BED1_W,
    h: KIT_H,
  },
  { id: "hall", label: "", dim: null, kind: "room", x: T1_X, y: WASH + T1_H, w: T2_X + T2_W - T1_X, h: DRAW_Y - (WASH + T1_H) },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "10' × 11'-6\"",
    kind: "room",
    x: 0,
    y: DRAW_Y,
    w: BED2_W,
    h: DRAW_H,
  },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: -5, y: DRAW_Y, w: 5, h: DRAW_H },
  { id: "puja", label: "Puja", dim: "3'-6\" × 6'", kind: "room", x: PUJA_X, y: DRAW_Y, w: PUJA_W, h: PUJA_H },
  { id: "puja-south", label: "", dim: null, kind: "room", x: PUJA_X, y: DRAW_Y + PUJA_H, w: PUJA_W, h: DRAW_H - PUJA_H },
  {
    id: "living",
    label: "Living room",
    dim: "20' × 11'-6\"",
    kind: "room",
    x: LIVE_X,
    y: DRAW_Y,
    w: EAST - LIVE_X,
    h: DRAW_H,
  },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: EAST, y: DRAW_Y, w: 1.6, h: DRAW_H },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: EAST + 1.6, y: 8, w: 6.2, h: 20 },
];

export const B10_DOORS: B10Door[] = [
  { id: "entry", wall: "e", x: EAST, y: 18.2, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "s", x: 3.4, y: WASH, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "s", x: 3.2, y: DRAW_Y, length: 2.6, swing: "cw" },
  { id: "toilet-1", wall: "s", x: T1_X + 1.1, y: WASH + T1_H, length: 2.2, swing: "cw" },
  { id: "toilet-2", wall: "s", x: T2_X + 1.8, y: WASH + T2_H, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: BED1_X + 4.2, y: DRAW_Y, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "e", x: BED2_W, y: DRAW_Y + 2.4, length: 2.8, swing: "cw" },
  { id: "puja", wall: "n", x: PUJA_X + 0.6, y: DRAW_Y, length: 2.2, swing: "ccw" },
  { id: "balc-w", wall: "w", x: 0, y: DRAW_Y + 3.8, length: 2.6, swing: "ccw" },
];

export const B10_WINDOWS: B10Window[] = [
  { id: "wash", x: 2.4, y: -0.18, w: 4.8, h: 0.36 },
  { id: "bed-1-n", x: BED1_X + 3.2, y: -0.18, w: 7.2, h: 0.36 },
  { id: "bed-2-s", x: 2.2, y: SOUTH - 0.18, w: 5.6, h: 0.36 },
  { id: "live-s", x: LIVE_X + 5.2, y: SOUTH - 0.18, w: 9.4, h: 0.36 },
];

export const B10_OPENINGS = [
  { id: "kit-hall", x: KIT_W - 0.15, y: 10.2, w: 0.7, h: 4.2 },
  { id: "hall-live", x: 16.4, y: DRAW_Y - 0.35, w: 5.2, h: 0.7 },
] as const;

export const B10_EXTENT = { x: -7, y: -2, w: 50, h: 32 };

export const B10_WALLS: B10Wall[] = [
  { x1: 0, y1: 0, x2: KIT_W, y2: 0, outer: true },
  { x1: KIT_W, y1: 0, x2: KIT_W, y2: WASH, outer: true },
  { x1: KIT_W, y1: WASH, x2: EAST, y2: WASH, outer: true },
  { x1: EAST, y1: WASH, x2: EAST, y2: SOUTH, outer: true },
  { x1: 5, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: 0, y1: SOUTH, x2: 5, y2: SOUTH, outer: true, parapet: true },
  { x1: 0, y1: 0, x2: 0, y2: DRAW_Y, outer: true },
  { x1: -5, y1: DRAW_Y, x2: 0, y2: DRAW_Y, outer: true, parapet: true },
  { x1: -5, y1: DRAW_Y, x2: -5, y2: SOUTH, outer: true, parapet: true },
  { x1: -5, y1: SOUTH, x2: 0, y2: SOUTH, outer: true, parapet: true },
  { x1: 0, y1: DRAW_Y, x2: 0, y2: SOUTH },
  { x1: 0, y1: WASH, x2: KIT_W, y2: WASH },
  { x1: KIT_W, y1: WASH, x2: KIT_W, y2: DRAW_Y },
  { x1: 0, y1: DRAW_Y, x2: BED1_X, y2: DRAW_Y },
  { x1: BED1_X, y1: DRAW_Y, x2: EAST, y2: DRAW_Y },
  { x1: T1_X, y1: WASH, x2: T1_X + T1_W, y2: WASH },
  { x1: T2_X, y1: WASH, x2: T2_X, y2: WASH + T2_H },
  { x1: T1_X, y1: WASH + T1_H, x2: T2_X, y2: WASH + T1_H },
  { x1: T2_X, y1: WASH + T2_H, x2: BED1_X, y2: WASH + T2_H },
  { x1: BED1_X, y1: WASH, x2: BED1_X, y2: DRAW_Y },
  { x1: BED2_W, y1: DRAW_Y, x2: BED2_W, y2: SOUTH },
  { x1: LIVE_X, y1: DRAW_Y, x2: LIVE_X, y2: DRAW_Y + PUJA_H },
  { x1: PUJA_X, y1: DRAW_Y + PUJA_H, x2: LIVE_X, y2: DRAW_Y + PUJA_H },
  { x1: EAST, y1: DRAW_Y, x2: EAST + 1.6, y2: DRAW_Y, outer: true },
  { x1: EAST + 1.6, y1: 8, x2: EAST + 7.8, y2: 8, outer: true },
  { x1: EAST + 1.6, y1: 8, x2: EAST + 1.6, y2: 28, outer: true },
  { x1: EAST + 7.8, y1: 8, x2: EAST + 7.8, y2: 28, outer: true },
  { x1: EAST + 1.6, y1: 28, x2: EAST + 7.8, y2: 28, outer: true },
];

export function splitB10Walls(walls: B10Wall[] = B10_WALLS, doors: B10Door[] = B10_DOORS): B10Wall[] {
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
    const parts: B10Wall[] = [];
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
