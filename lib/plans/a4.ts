/**
 * Typical-floor A4 (2BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (entrance / staircase lobby / lift)
 *   −x = west  (utility / 5' balcony / open side)
 *   −y = north (top of drawing)
 *   +y = south (bottom / living)
 *
 * A4 is on the western A-block row. A3 is immediately east, across
 * the lobby. Entrance is from the east circulation, not the balcony.
 * Staircase, lift and electrical shaft are building context only.
 * Room sizes are brochure labels only.
 */

export const A4_META = {
  unit: "A4",
  type: "2BHK-W",
  sbuaSft: 1278,
  carpetSft: 876,
  balconySft: 110,
  floors: "A4 stack · typical floors 5–10",
} as const;

export function isA4Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 4;
}

export type A4Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A4Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A4Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type A4Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

/** West face of kitchen / bedroom 1 (east of utility and balcony). */
const X0 = 5;

/** Brochure room rectangles, feet. */
export const A4_ROOMS: A4Room[] = [
  { id: "utility", label: "Utility", dim: "4' wide", kind: "utility", x: 1, y: 0, w: 4, h: 11.5 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "8' × 11'-6\"",
    kind: "room",
    x: X0,
    y: 0,
    w: 8,
    h: 11.5,
  },
  { id: "toilet-1", label: "Toilet", dim: "4' × 6'", kind: "wet", x: 13, y: 0, w: 4, h: 6 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "13'-9\" × 11'-6\"",
    kind: "room",
    x: 19,
    y: 0,
    w: 13.75,
    h: 11.5,
  },
  { id: "bed-2-wrap", label: "", dim: null, kind: "room", x: 17, y: 0, w: 2, h: 6 },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: 11.5, w: 5, h: 12 },
  {
    id: "living",
    label: "Living room",
    dim: "17' × 12'",
    kind: "room",
    x: 15.75,
    y: 11.5,
    w: 17,
    h: 12,
  },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "11' × 12'",
    kind: "room",
    x: X0,
    y: 11.5,
    w: 11,
    h: 12,
  },
  {
    id: "toilet-2",
    label: "Toilet",
    dim: "6' × 8½\"",
    kind: "wet",
    x: 17,
    y: 6,
    w: 6,
    h: 8.5,
  },
  { id: "puja", label: "Puja", dim: "3'-9\" × 6'-6\"", kind: "room", x: 16, y: 17, w: 3.75, h: 6.5 },
  { id: "lobby", label: "Staircase lobby", dim: null, kind: "corridor", x: 32.75, y: 0, w: 9, h: 11.5 },
  { id: "lift", label: "Lift", dim: null, kind: "corridor", x: 32.75, y: 11.5, w: 6.5, h: 8 },
  { id: "shaft", label: "Electrical shaft", dim: null, kind: "utility", x: 39.25, y: 11.5, w: 2.5, h: 8 },
  { id: "ac-south", label: "AC ledge", dim: null, kind: "utility", x: 15.75, y: 23.5, w: 17, h: 1.6 },
];

export const A4_DOORS: A4Door[] = [
  // North-edge entrance (corridor face); stairs sit in the south half toward A6.
  { id: "entry", wall: "e", x: 32.75, y: 1.6, length: 3.2, swing: "ccw", entrance: true },
  { id: "kitchen", wall: "e", x: 13, y: 8.1, length: 2.5, swing: "cw" },
  { id: "utility", wall: "w", x: X0, y: 3.8, length: 2.4, swing: "cw" },
  { id: "bed-1", wall: "e", x: 16, y: 18.6, length: 2.8, swing: "cw" },
  { id: "bed-2", wall: "s", x: 24.1, y: 11.5, length: 3, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: 13.7, y: 6, length: 2.2, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 18.2, y: 14.5, length: 2.5, swing: "cw" },
  { id: "puja", wall: "n", x: 16.7, y: 17, length: 2.2, swing: "ccw" },
];

export const A4_WINDOWS: A4Window[] = [
  { id: "kit", x: 6.6, y: -0.18, w: 4.4, h: 0.36 },
  { id: "bed-2", x: 22.6, y: -0.18, w: 6.4, h: 0.36 },
  { id: "util", x: 0.82, y: 2.6, w: 0.36, h: 5.2 },
  { id: "bed-1", x: 4.82, y: 14.4, w: 0.36, h: 5.6 },
];

/** Hall east of kitchen / south of toilet 1 — kitchen to living circulation. */
export const A4_OPENINGS = [
  { id: "hall", x: 13, y: 6, w: 4, h: 5.5 },
] as const;

export const A4_EXTENT = { x: 0, y: 0, w: 44.2, h: 26.4 };

export const A4_WALLS: A4Wall[] = [
  { x1: 1, y1: 0, x2: 32.75, y2: 0, outer: true },
  { x1: 32.75, y1: 0, x2: 32.75, y2: 23.5, outer: true },
  { x1: 16, y1: 23.5, x2: 32.75, y2: 23.5, outer: true },
  { x1: 5, y1: 23.5, x2: 16, y2: 23.5, outer: true },
  { x1: 0, y1: 23.5, x2: 5, y2: 23.5, outer: true, parapet: true },
  { x1: 0, y1: 11.5, x2: 0, y2: 23.5, outer: true, parapet: true },
  { x1: 0, y1: 11.5, x2: 1, y2: 11.5, outer: true, parapet: true },
  { x1: 1, y1: 0, x2: 1, y2: 11.5, outer: true },
  { x1: 5, y1: 0, x2: 5, y2: 23.5 },
  { x1: 13, y1: 0, x2: 13, y2: 11.5 },
  { x1: 17, y1: 0, x2: 17, y2: 6 },
  { x1: 13, y1: 6, x2: 17, y2: 6 },
  { x1: 17, y1: 6, x2: 17, y2: 14.5 },
  { x1: 23, y1: 6, x2: 23, y2: 14.5 },
  { x1: 17, y1: 14.5, x2: 23, y2: 14.5 },
  { x1: 5, y1: 11.5, x2: 16, y2: 11.5 },
  { x1: 23, y1: 11.5, x2: 32.75, y2: 11.5 },
  { x1: 16, y1: 11.5, x2: 16, y2: 23.5 },
  { x1: 16, y1: 17, x2: 19.75, y2: 17 },
  { x1: 19.75, y1: 17, x2: 19.75, y2: 23.5 },
  { x1: 32.75, y1: 0, x2: 41.75, y2: 0, outer: true },
  { x1: 41.75, y1: 0, x2: 41.75, y2: 19.5, outer: true },
  { x1: 32.75, y1: 11.5, x2: 41.75, y2: 11.5 },
  { x1: 39.25, y1: 11.5, x2: 39.25, y2: 19.5 },
  { x1: 32.75, y1: 19.5, x2: 41.75, y2: 19.5, outer: true },
  { x1: 15.75, y1: 23.5, x2: 15.75, y2: 25.1, outer: true, parapet: true },
  { x1: 32.75, y1: 23.5, x2: 32.75, y2: 25.1, outer: true, parapet: true },
  { x1: 15.75, y1: 25.1, x2: 32.75, y2: 25.1, outer: true, parapet: true },
];

export function splitA4Walls(walls: A4Wall[] = A4_WALLS, doors: A4Door[] = A4_DOORS): A4Wall[] {
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
    const parts: A4Wall[] = [];
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
