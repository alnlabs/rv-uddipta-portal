/**
 * Typical-floor B13 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedroom 1 / 4' balcony · bedroom 3 / 5' balcony)
 *   −x = west  (drawing / entrance / AC ledge)
 *   −y = north (top of drawing / 4' wash)
 *   +y = south (bottom / drawing / bedrooms 2–3)
 *
 * B13 sits east of B12. Dining and puja stay separate. Three toilets
 * stay separate. North-east 4' balcony and south-east 5' balcony stay
 * outside the apartment. No store. Room sizes are brochure labels.
 * Puja has no brochure size.
 */

export const B13_META = {
  unit: "B13",
  type: "3BHK-E",
  sbuaSft: 1624,
  floors: "B13 stack · typical floors 2–10",
} as const;

export function isB13Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 13;
}

export type B13Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B13Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B13Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B13Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const WASH = 4;
const KIT_W = 10 + 4.5 / 12;
const KIT_H = 7.75;
const KIT_S = WASH + KIT_H;
const DIN_X = KIT_W;
const DIN_W = 10.625;
const DIN_Y = WASH;
const DIN_H = 11.375;
const DIN_E = DIN_X + DIN_W;
const T1_X = DIN_E;
const T2_X = T1_X + 4;
const BED1_X = T2_X + 6;
const BED1_W = 13.5;
const EAST_N = BED1_X + BED1_W;
const DRAW_Y = DIN_Y + DIN_H;
const DRAW_H = 11;
const SOUTH = DRAW_Y + DRAW_H;
const BED2_X = 16;
const BED2_W = 12;
const T3_X = BED2_X + BED2_W;
const T3_W = 4.375;
const T3_H = 6.625;
const T3_S = DRAW_Y + T3_H;
const BED3_X = T3_X + T3_W;
const BED3_W = 12.75;
const EAST_S = BED3_X + BED3_W;
const BALC_SE = EAST_S + 5;
const BALC_NE = EAST_N + 4;

/** Brochure room rectangles, feet. Origin is the west face of wash / kitchen / drawing. */
export const B13_ROOMS: B13Room[] = [
  { id: "wash", label: "Wash", dim: "4' wide", kind: "utility", x: 0, y: 0, w: KIT_W, h: WASH },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "10'-4½\" × 7'-9\"",
    kind: "room",
    x: 0,
    y: WASH,
    w: KIT_W,
    h: KIT_H,
  },
  {
    id: "dining",
    label: "Dining",
    dim: "10'-7½\" × 11'-4½\"",
    kind: "room",
    x: DIN_X,
    y: DIN_Y,
    w: DIN_W,
    h: DIN_H,
  },
  { id: "puja", label: "Puja", dim: null, kind: "room", x: DIN_X, y: 7.85, w: 3.75, h: 3.9 },
  { id: "toilet-1", label: "Toilet", dim: "4' × 7'", kind: "wet", x: T1_X, y: DIN_Y, w: 4, h: 7 },
  { id: "toilet-2", label: "Toilet", dim: "6' × 7'", kind: "wet", x: T2_X, y: DIN_Y, w: 6, h: 7 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "13'-6\" × 11'-4½\"",
    kind: "room",
    x: BED1_X,
    y: DIN_Y,
    w: BED1_W,
    h: DIN_H,
  },
  { id: "balc-ne", label: "Balcony", dim: "4' wide", kind: "balcony", x: EAST_N, y: DIN_Y, w: 4, h: DIN_H },
  { id: "kit-foyer", label: "", dim: null, kind: "room", x: 0, y: KIT_S, w: KIT_W, h: DRAW_Y - KIT_S },
  { id: "hall", label: "", dim: null, kind: "room", x: T1_X, y: 11, w: 10, h: DRAW_Y - 11 },
  {
    id: "drawing",
    label: "Drawing",
    dim: "16' × 11'",
    kind: "room",
    x: 0,
    y: DRAW_Y,
    w: 16,
    h: DRAW_H,
  },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "12' × 11'",
    kind: "room",
    x: BED2_X,
    y: DRAW_Y,
    w: BED2_W,
    h: DRAW_H,
  },
  { id: "toilet-3", label: "Toilet", dim: "4'-4½\" × 6'-7½\"", kind: "wet", x: T3_X, y: DRAW_Y, w: T3_W, h: T3_H },
  { id: "t3-south", label: "", dim: null, kind: "utility", x: T3_X, y: T3_S, w: T3_W, h: SOUTH - T3_S },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "12'-9\" × 11'",
    kind: "room",
    x: BED3_X,
    y: DRAW_Y,
    w: BED3_W,
    h: DRAW_H,
  },
  { id: "balc-se", label: "Balcony", dim: "5' wide", kind: "balcony", x: EAST_S, y: DRAW_Y, w: 5, h: DRAW_H },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: -1.6, y: DRAW_Y, w: 1.6, h: DRAW_H },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: -7.4, y: 13.2, w: 5.8, h: 14.8 },
];

export const B13_DOORS: B13Door[] = [
  { id: "entry", wall: "w", x: 0, y: 17.6, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "s", x: 3.8, y: WASH, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "e", x: KIT_W, y: 4.4, length: 2.6, swing: "cw" },
  { id: "puja", wall: "n", x: DIN_X + 0.7, y: 7.85, length: 2.1, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: T1_X + 0.7, y: 11, length: 2.2, swing: "cw" },
  { id: "toilet-2", wall: "s", x: T2_X + 1.5, y: 11, length: 2.3, swing: "ccw" },
  { id: "bed-1", wall: "s", x: BED1_X + 2.4, y: DRAW_Y, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "n", x: BED2_X + 3.2, y: DRAW_Y, length: 2.8, swing: "cw" },
  { id: "bed-3", wall: "n", x: BED3_X + 3.2, y: DRAW_Y, length: 2.8, swing: "ccw" },
  { id: "toilet-3", wall: "n", x: T3_X + 1.1, y: DRAW_Y, length: 2.2, swing: "cw" },
  { id: "balc-ne", wall: "e", x: EAST_N, y: 7.4, length: 2.6, swing: "ccw" },
  { id: "balc-se", wall: "e", x: EAST_S, y: 18.6, length: 2.6, swing: "ccw" },
];

export const B13_WINDOWS: B13Window[] = [
  { id: "wash", x: 2.8, y: -0.18, w: 4.8, h: 0.36 },
  { id: "draw-s", x: 3.4, y: SOUTH - 0.18, w: 8.6, h: 0.36 },
  { id: "draw-w", x: -0.18, y: 21.4, w: 0.36, h: 3.2 },
  { id: "bed-2-s", x: BED2_X + 2.4, y: SOUTH - 0.18, w: 6.8, h: 0.36 },
  { id: "bed-3-s", x: BED3_X + 2.6, y: SOUTH - 0.18, w: 6.8, h: 0.36 },
];

export const B13_OPENINGS = [
  { id: "din-draw", x: 11.8, y: DRAW_Y - 0.4, w: 3.8, h: 0.8 },
] as const;

export const B13_EXTENT = { x: -8, y: -2, w: 62, h: 32 };

export const B13_WALLS: B13Wall[] = [
  { x1: 0, y1: 0, x2: KIT_W, y2: 0, outer: true },
  { x1: KIT_W, y1: 0, x2: KIT_W, y2: WASH, outer: true },
  { x1: KIT_W, y1: WASH, x2: EAST_N, y2: WASH, outer: true },
  { x1: EAST_N, y1: WASH, x2: BALC_NE, y2: WASH, outer: true, parapet: true },
  { x1: BALC_NE, y1: WASH, x2: BALC_NE, y2: DRAW_Y, outer: true, parapet: true },
  { x1: EAST_N, y1: DRAW_Y, x2: BALC_NE, y2: DRAW_Y, outer: true, parapet: true },
  { x1: EAST_S, y1: DRAW_Y, x2: BALC_SE, y2: DRAW_Y, outer: true, parapet: true },
  { x1: BALC_SE, y1: DRAW_Y, x2: BALC_SE, y2: SOUTH, outer: true, parapet: true },
  { x1: EAST_S, y1: SOUTH, x2: BALC_SE, y2: SOUTH, outer: true, parapet: true },
  { x1: 0, y1: SOUTH, x2: EAST_S, y2: SOUTH, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: SOUTH, outer: true },
  { x1: KIT_W, y1: WASH, x2: KIT_W, y2: 4.4 },
  { x1: KIT_W, y1: 7.0, x2: KIT_W, y2: KIT_S },
  { x1: 0, y1: WASH, x2: KIT_W, y2: WASH },
  { x1: 0, y1: KIT_S, x2: KIT_W, y2: KIT_S },
  { x1: DIN_X, y1: 7.85, x2: DIN_X + 3.75, y2: 7.85 },
  { x1: DIN_X + 3.75, y1: 7.85, x2: DIN_X + 3.75, y2: 11.75 },
  { x1: DIN_X, y1: 11.75, x2: DIN_X + 3.75, y2: 11.75 },
  { x1: T1_X, y1: DIN_Y, x2: T1_X, y2: DRAW_Y },
  { x1: T2_X, y1: DIN_Y, x2: T2_X, y2: 11 },
  { x1: BED1_X, y1: DIN_Y, x2: BED1_X, y2: DRAW_Y },
  { x1: T1_X, y1: 11, x2: BED1_X, y2: 11 },
  { x1: EAST_N, y1: DIN_Y, x2: EAST_N, y2: DRAW_Y },
  { x1: 0, y1: DRAW_Y, x2: 11.8, y2: DRAW_Y },
  { x1: 15.6, y1: DRAW_Y, x2: EAST_S, y2: DRAW_Y },
  { x1: BED2_X, y1: DRAW_Y, x2: BED2_X, y2: SOUTH },
  { x1: T3_X, y1: DRAW_Y, x2: T3_X, y2: SOUTH },
  { x1: BED3_X, y1: DRAW_Y, x2: BED3_X, y2: SOUTH },
  { x1: T3_X, y1: T3_S, x2: BED3_X, y2: T3_S },
  { x1: EAST_S, y1: DRAW_Y, x2: EAST_S, y2: SOUTH },
  { x1: EAST_N, y1: DRAW_Y, x2: EAST_S, y2: DRAW_Y, outer: true },
  { x1: -1.6, y1: DRAW_Y, x2: 0, y2: DRAW_Y, outer: true },
  { x1: -7.4, y1: 13.2, x2: -1.6, y2: 13.2, outer: true },
  { x1: -7.4, y1: 13.2, x2: -7.4, y2: 28, outer: true },
  { x1: -1.6, y1: 13.2, x2: -1.6, y2: SOUTH, outer: true },
  { x1: -7.4, y1: 28, x2: -1.6, y2: 28, outer: true },
];

export function splitB13Walls(walls: B13Wall[] = B13_WALLS, doors: B13Door[] = B13_DOORS): B13Wall[] {
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
    const parts: B13Wall[] = [];
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
