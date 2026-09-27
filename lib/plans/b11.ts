/**
 * Typical-floor B11 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedroom 1 / toilet 3 / 5' balcony)
 *   −x = west  (drawing / entrance / AC ledge)
 *   −y = north (top of drawing / 4'-1½" wash)
 *   +y = south (bottom / 5' drawing balcony / bedrooms 2–3)
 *
 * B11 sits east of B10. Dining and puja stay separate. Three toilets
 * stay separate. Toilet 3 sits between bedroom 3 and the east balcony.
 * South 5' balcony is on the drawing. Corridor and AC ledge stay
 * outside. Room sizes are brochure labels. Puja has no brochure size.
 */

export const B11_META = {
  unit: "B11",
  type: "3BHK-E",
  sbuaSft: 1676,
  floors: "B11 stack · typical floors 2–10",
} as const;

export function isB11Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 11;
}

export type B11Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B11Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B11Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B11Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const WASH = 4 + 1.5 / 12;
const KIT_W = 8 + 4.5 / 12;
const KIT_H = 7.75;
const KIT_S = WASH + KIT_H;
const DIN_X = KIT_W;
const DIN_W = 10 + 9 / 12;
const DIN_Y = WASH;
const DIN_H = 11.5;
const DIN_E = DIN_X + DIN_W;
const T1_X = DIN_E;
const T1_W = 4;
const T1_H = 7 + 1.5 / 12;
const T2_X = T1_X + T1_W;
const T2_W = 6;
const T2_H = T1_H;
const BED1_X = T2_X + T2_W;
const BED1_W = 13;
const EAST_N = BED1_X + BED1_W;
const DRAW_Y = DIN_Y + DIN_H;
const DRAW_H = 11;
const SOUTH = DRAW_Y + DRAW_H;
const BED2_X = 15;
const BED2_W = 12;
const BED3_X = BED2_X + BED2_W;
const BED3_W = 12.5;
const T3_X = BED3_X + BED3_W;
const T3_W = 5;
const T3_H = T1_H;
const T3_S = DRAW_Y + T3_H;
const EAST_S = T3_X + T3_W;
const BALC_E = EAST_S + 5;
const BALC_S = SOUTH + 5;

/** Brochure room rectangles, feet. Origin is the west face of wash / kitchen / drawing. */
export const B11_ROOMS: B11Room[] = [
  { id: "wash", label: "Wash", dim: "4'-1½\" wide", kind: "utility", x: 0, y: 0, w: KIT_W, h: WASH },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "8'-4½\" × 7'-9\"",
    kind: "room",
    x: 0,
    y: WASH,
    w: KIT_W,
    h: KIT_H,
  },
  {
    id: "dining",
    label: "Dining",
    dim: "10'-9\" × 11'-6\"",
    kind: "room",
    x: DIN_X,
    y: DIN_Y,
    w: DIN_W,
    h: DIN_H,
  },
  { id: "puja", label: "Puja", dim: null, kind: "room", x: DIN_X, y: 7.7, w: 3.6, h: 4 },
  { id: "toilet-1", label: "Toilet", dim: "4' × 7'-1½\"", kind: "wet", x: T1_X, y: DIN_Y, w: T1_W, h: T1_H },
  { id: "toilet-2", label: "Toilet", dim: "6' × 7'-1½\"", kind: "wet", x: T2_X, y: DIN_Y, w: T2_W, h: T2_H },
  {
    id: "bed-1",
    label: "Bedroom",
    dim: "13' × 11'-6\"",
    kind: "room",
    x: BED1_X,
    y: DIN_Y,
    w: BED1_W,
    h: DIN_H,
  },
  { id: "kit-foyer", label: "", dim: null, kind: "room", x: 0, y: KIT_S, w: KIT_W, h: DRAW_Y - KIT_S },
  { id: "hall", label: "", dim: null, kind: "room", x: T1_X, y: DIN_Y + T1_H, w: T2_W + T1_W, h: DRAW_Y - (DIN_Y + T1_H) },
  {
    id: "drawing",
    label: "Drawing",
    dim: "15' × 11'",
    kind: "room",
    x: 0,
    y: DRAW_Y,
    w: 15,
    h: DRAW_H,
  },
  {
    id: "bed-2",
    label: "Bedroom",
    dim: "12' × 11'",
    kind: "room",
    x: BED2_X,
    y: DRAW_Y,
    w: BED2_W,
    h: DRAW_H,
  },
  {
    id: "bed-3",
    label: "Bedroom",
    dim: "12'-6\" × 11'",
    kind: "room",
    x: BED3_X,
    y: DRAW_Y,
    w: BED3_W,
    h: DRAW_H,
  },
  { id: "toilet-3", label: "Toilet", dim: "5' × 7'-1½\"", kind: "wet", x: T3_X, y: DRAW_Y, w: T3_W, h: T3_H },
  { id: "t3-south", label: "", dim: null, kind: "room", x: T3_X, y: T3_S, w: T3_W, h: SOUTH - T3_S },
  { id: "balc-s", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: SOUTH, w: 15, h: 5 },
  { id: "balc-e", label: "Balcony", dim: "5' wide", kind: "balcony", x: EAST_S, y: DRAW_Y, w: 5, h: DRAW_H },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: -1.6, y: DRAW_Y, w: 1.6, h: DRAW_H },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: -7.4, y: 12.4, w: 5.8, h: 16 },
];

export const B11_DOORS: B11Door[] = [
  { id: "entry", wall: "w", x: 0, y: 18.4, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "s", x: 2.8, y: WASH, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "e", x: KIT_W, y: 4.4, length: 2.5, swing: "cw" },
  { id: "puja", wall: "n", x: DIN_X + 0.7, y: 7.7, length: 2.1, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: T1_X + 0.8, y: DIN_Y + T1_H, length: 2.2, swing: "cw" },
  { id: "toilet-2", wall: "s", x: T2_X + 1.6, y: DIN_Y + T2_H, length: 2.3, swing: "ccw" },
  { id: "bed-1", wall: "s", x: BED1_X + 3.8, y: DRAW_Y, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "n", x: BED2_X + 3.6, y: DRAW_Y, length: 2.8, swing: "cw" },
  { id: "bed-3", wall: "n", x: BED3_X + 3.4, y: DRAW_Y, length: 2.8, swing: "ccw" },
  { id: "toilet-3", wall: "w", x: T3_X, y: DRAW_Y + 1.8, length: 2.4, swing: "cw" },
  { id: "balc-s", wall: "s", x: 5.2, y: SOUTH, length: 2.6, swing: "ccw" },
  { id: "balc-e", wall: "e", x: EAST_S, y: DRAW_Y + 3.4, length: 2.6, swing: "ccw" },
];

export const B11_WINDOWS: B11Window[] = [
  { id: "wash", x: 1.8, y: -0.18, w: 4.6, h: 0.36 },
  { id: "bed-1-n", x: BED1_X + 2.8, y: -0.18, w: 7.2, h: 0.36 },
  { id: "draw-s", x: 8.4, y: SOUTH - 0.18, w: 5.2, h: 0.36 },
  { id: "bed-2-s", x: BED2_X + 2.6, y: SOUTH - 0.18, w: 6.6, h: 0.36 },
  { id: "bed-3-s", x: BED3_X + 2.4, y: SOUTH - 0.18, w: 7.2, h: 0.36 },
];

export const B11_OPENINGS = [
  { id: "din-draw", x: 10.2, y: DRAW_Y - 0.4, w: 4.2, h: 0.8 },
] as const;

export const B11_EXTENT = { x: -8, y: -2, w: 62, h: 38 };

export const B11_WALLS: B11Wall[] = [
  { x1: 0, y1: 0, x2: KIT_W, y2: 0, outer: true },
  { x1: KIT_W, y1: 0, x2: KIT_W, y2: WASH, outer: true },
  { x1: KIT_W, y1: WASH, x2: EAST_N, y2: WASH, outer: true },
  { x1: EAST_N, y1: WASH, x2: EAST_N, y2: DRAW_Y, outer: true },
  { x1: EAST_N, y1: DRAW_Y, x2: EAST_S, y2: DRAW_Y, outer: true },
  { x1: EAST_S, y1: DRAW_Y, x2: BALC_E, y2: DRAW_Y, outer: true, parapet: true },
  { x1: BALC_E, y1: DRAW_Y, x2: BALC_E, y2: SOUTH, outer: true, parapet: true },
  { x1: EAST_S, y1: SOUTH, x2: BALC_E, y2: SOUTH, outer: true, parapet: true },
  { x1: 15, y1: SOUTH, x2: EAST_S, y2: SOUTH, outer: true },
  { x1: 0, y1: SOUTH, x2: 15, y2: SOUTH },
  { x1: 0, y1: SOUTH, x2: 0, y2: BALC_S, outer: true, parapet: true },
  { x1: 0, y1: BALC_S, x2: 15, y2: BALC_S, outer: true, parapet: true },
  { x1: 15, y1: SOUTH, x2: 15, y2: BALC_S, outer: true, parapet: true },
  { x1: 0, y1: 0, x2: 0, y2: SOUTH, outer: true },
  { x1: KIT_W, y1: WASH, x2: KIT_W, y2: 4.4 },
  { x1: KIT_W, y1: 6.9, x2: KIT_W, y2: KIT_S },
  { x1: 0, y1: WASH, x2: KIT_W, y2: WASH },
  { x1: 0, y1: KIT_S, x2: KIT_W, y2: KIT_S },
  { x1: DIN_X, y1: 7.7, x2: DIN_X + 3.6, y2: 7.7 },
  { x1: DIN_X + 3.6, y1: 7.7, x2: DIN_X + 3.6, y2: 11.7 },
  { x1: DIN_X, y1: 11.7, x2: DIN_X + 3.6, y2: 11.7 },
  { x1: T1_X, y1: DIN_Y, x2: T1_X, y2: DRAW_Y },
  { x1: T2_X, y1: DIN_Y, x2: T2_X, y2: DIN_Y + T2_H },
  { x1: BED1_X, y1: DIN_Y, x2: BED1_X, y2: DRAW_Y },
  { x1: T1_X, y1: DIN_Y + T1_H, x2: BED1_X, y2: DIN_Y + T1_H },
  { x1: 0, y1: DRAW_Y, x2: 10.2, y2: DRAW_Y },
  { x1: 14.4, y1: DRAW_Y, x2: EAST_S, y2: DRAW_Y },
  { x1: 15, y1: DRAW_Y, x2: 15, y2: SOUTH },
  { x1: BED3_X, y1: DRAW_Y, x2: BED3_X, y2: SOUTH },
  { x1: T3_X, y1: DRAW_Y, x2: T3_X, y2: T3_S },
  { x1: T3_X, y1: T3_S, x2: EAST_S, y2: T3_S },
  { x1: EAST_S, y1: DRAW_Y, x2: EAST_S, y2: SOUTH },
  { x1: -1.6, y1: DRAW_Y, x2: 0, y2: DRAW_Y, outer: true },
  { x1: -7.4, y1: 12.4, x2: -1.6, y2: 12.4, outer: true },
  { x1: -7.4, y1: 12.4, x2: -7.4, y2: 28.4, outer: true },
  { x1: -1.6, y1: 12.4, x2: -1.6, y2: SOUTH, outer: true },
  { x1: -7.4, y1: 28.4, x2: -1.6, y2: 28.4, outer: true },
];

export function splitB11Walls(walls: B11Wall[] = B11_WALLS, doors: B11Door[] = B11_DOORS): B11Wall[] {
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
    const parts: B11Wall[] = [];
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
