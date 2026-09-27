/**
 * Typical-floor B8 (2BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedroom 1 / 4' balcony / bedroom 2)
 *   −x = west  (living / kitchen / puja)
 *   −y = north (top of drawing / 5' wash / balcony)
 *   +y = south (bottom / living / south corridor / entrance)
 *
 * B8 is east of B7. The typical plate and area table are 2BHK-E —
 * two bedrooms, not three. The 11'-7½" × 19'-10½" living occupies
 * the whole west side, including the south-west sofa end. Puja has
 * no brochure dimension. South corridor and entrance stay outside
 * the apartment. Room sizes are brochure labels.
 */

export const B8_META = {
  unit: "B8",
  type: "2BHK-E",
  sbuaSft: 1174,
  carpetSft: 704,
  balconySft: 106,
  floors: "B8 stack · typical floors 5–10",
} as const;

export function isB8Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 8;
}

export type B8Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B8Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B8Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B8Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const WASH = 5;
const KIT_S = 15.75;
const LIVE_W = 11.625;
const LIVE_H = 19.875;
const SOUTH = 35.625;
const BED1_X = 7;
const EAST = 18;
const BED2_Y = 23.125;
const T2_Y = 18.625;

/** Brochure room rectangles, feet. Origin is the west face of wash / kitchen / living. */
export const B8_ROOMS: B8Room[] = [
  { id: "wash", label: "Wash", dim: "5' wide", kind: "utility", x: 0, y: 0, w: 7, h: WASH },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "7' × 10'-9\"",
    kind: "room",
    x: 0,
    y: WASH,
    w: 7,
    h: 10.75,
  },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "11' × 13'",
    kind: "room",
    x: BED1_X,
    y: 4,
    w: 11,
    h: 13,
  },
  { id: "balc-n", label: "Balcony", dim: "4' wide", kind: "balcony", x: BED1_X, y: 0, w: 11, h: 4 },
  { id: "toilet-1", label: "Toilet", dim: "4'-3\" × 9'", kind: "wet", x: BED1_X, y: 8, w: 4.25, h: 9 },
  { id: "hall", label: "", dim: null, kind: "room", x: BED1_X, y: 17, w: 4.25, h: 1.625 },
  {
    id: "living",
    label: "Living room",
    dim: "11'-7½\" × 19'-10½\"",
    kind: "room",
    x: 0,
    y: KIT_S,
    w: LIVE_W,
    h: LIVE_H,
  },
  { id: "puja", label: "Puja", dim: null, kind: "room", x: 0, y: 16.1, w: 3.1, h: 3.4 },
  { id: "toilet-2", label: "Toilet", dim: "7' × 4'-6\"", kind: "wet", x: 11, y: T2_Y, w: 7, h: 4.5 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "11' × 12'-6\"",
    kind: "room",
    x: BED1_X,
    y: BED2_Y,
    w: 11,
    h: 12.5,
  },
  { id: "corridor-s", label: "Common corridor", dim: null, kind: "corridor", x: -2.5, y: SOUTH, w: 23, h: 6 },
];

export const B8_DOORS: B8Door[] = [
  { id: "entry", wall: "s", x: 2.1, y: SOUTH, length: 3.1, swing: "ccw", entrance: true },
  { id: "wash", wall: "s", x: 2.2, y: WASH, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "n", x: 2.4, y: KIT_S, length: 2.5, swing: "cw" },
  { id: "puja", wall: "e", x: 3.1, y: 16.5, length: 2.2, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 12.4, y: 17, length: 2.8, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: 7.4, y: 17, length: 2.3, swing: "cw" },
  { id: "toilet-2", wall: "w", x: 11, y: 19.4, length: 2.4, swing: "cw" },
  { id: "bed-2", wall: "n", x: 12.6, y: BED2_Y, length: 2.8, swing: "ccw" },
];

export const B8_WINDOWS: B8Window[] = [
  { id: "wash", x: 1.3, y: -0.18, w: 4.4, h: 0.36 },
  { id: "bed-1-n", x: 9.2, y: -0.18, w: 6.6, h: 0.36 },
  { id: "bed-2-s", x: 9.4, y: 35.44, w: 6.4, h: 0.36 },
];

export const B8_OPENINGS = [
  { id: "kit-live", x: 2.2, y: 15.35, w: 3.2, h: 0.8 },
  { id: "bed1-balc", x: 9.2, y: 3.7, w: 6.6, h: 0.7 },
  { id: "entry", x: 2.0, y: 34.9, w: 3.4, h: 0.8 },
] as const;

export const B8_EXTENT = { x: -4, y: -2, w: 24, h: 46.5 };

export const B8_WALLS: B8Wall[] = [
  { x1: 0, y1: 0, x2: 7, y2: 0, outer: true },
  { x1: 7, y1: 0, x2: EAST, y2: 0, outer: true, parapet: true },
  { x1: EAST, y1: 0, x2: EAST, y2: SOUTH, outer: true },
  { x1: 0, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: SOUTH, outer: true },
  { x1: 7, y1: 0, x2: 7, y2: 17 },
  { x1: 7, y1: BED2_Y, x2: 7, y2: SOUTH },
  { x1: 0, y1: WASH, x2: 7, y2: WASH },
  { x1: 7, y1: 4, x2: EAST, y2: 4 },
  { x1: 7, y1: 8, x2: 11.25, y2: 8 },
  { x1: 11.25, y1: 8, x2: 11.25, y2: 17 },
  { x1: 7, y1: 17, x2: EAST, y2: 17 },
  { x1: 0, y1: KIT_S, x2: 7, y2: KIT_S },
  { x1: 3.1, y1: 16.1, x2: 3.1, y2: 19.5 },
  { x1: 0, y1: 16.1, x2: 3.1, y2: 16.1 },
  { x1: 0, y1: 19.5, x2: 3.1, y2: 19.5 },
  { x1: 11, y1: T2_Y, x2: EAST, y2: T2_Y },
  { x1: 11, y1: T2_Y, x2: 11, y2: BED2_Y },
  { x1: 11, y1: BED2_Y, x2: EAST, y2: BED2_Y },
  { x1: -2.5, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: -2.5, y1: SOUTH, x2: -2.5, y2: 41.625, outer: true },
  { x1: EAST, y1: SOUTH, x2: EAST, y2: 41.625, outer: true },
  { x1: -2.5, y1: 41.625, x2: EAST, y2: 41.625, outer: true },
];

export function splitB8Walls(walls: B8Wall[] = B8_WALLS, doors: B8Door[] = B8_DOORS): B8Wall[] {
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
    const parts: B8Wall[] = [];
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
