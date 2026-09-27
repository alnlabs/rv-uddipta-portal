/**
 * Typical-floor A6 (3BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (living / entrance / A5 corridor)
 *   −x = west  (utility / 5' balcony / open side)
 *   −y = north (top of drawing / kitchen)
 *   +y = south (bottom / bedrooms)
 *
 * A6 is on the western A-block row. A5 is immediately east, across
 * the corridor. Entrance is from the east circulation into living/drawing.
 * Room sizes are brochure labels only. No invented east balcony.
 */

export const A6_META = {
  unit: "A6",
  type: "3BHK-W",
  sbuaSft: 1815,
  carpetSft: 1157,
  balconySft: 120,
  floors: "A6 stack · typical floors 5–10",
} as const;

export function isA6Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 6;
}

export type A6Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A6Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A6Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type A6Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

/** West face of kitchen / bedroom 2 (east of utility and balcony). */
const X0 = 5;

/** Brochure room rectangles, feet. */
export const A6_ROOMS: A6Room[] = [
  { id: "utility", label: "Utility", dim: "4' wide", kind: "utility", x: 1, y: 0, w: 4, h: 15.375 },
  {
    id: "kitchen",
    label: "Kitchen / Dining",
    dim: "17'-6\" × 15'-4½\"",
    kind: "room",
    x: X0,
    y: 0,
    w: 17.5,
    h: 15.375,
  },
  { id: "toilet-1", label: "Toilet", dim: "4'-3\" × 7'-3\"", kind: "wet", x: 22.5, y: 0, w: 4.25, h: 7.25 },
  { id: "toilet-2", label: "Toilet", dim: "6'-3\" × 7'-3\"", kind: "wet", x: 26.75, y: 0, w: 6.25, h: 7.25 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "14'-6\" × 11'",
    kind: "room",
    x: 33,
    y: 0,
    w: 14.5,
    h: 11,
  },
  {
    id: "living",
    label: "Living / Drawing",
    dim: "13'-1½\" × 15'-4½\"",
    kind: "room",
    x: 34.375,
    y: 11,
    w: 13.125,
    h: 15.375,
  },
  { id: "puja", label: "Puja", dim: "6' × 3'-6\"", kind: "room", x: X0, y: 11.875, w: 6, h: 3.5 },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: 15.375, w: 5, h: 11 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "11'-6\" × 11'",
    kind: "room",
    x: X0,
    y: 15.375,
    w: 11.5,
    h: 11,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "13' × 11'",
    kind: "room",
    x: 16.5,
    y: 15.375,
    w: 13,
    h: 11,
  },
  { id: "toilet-3", label: "Toilet", dim: "9' × 4'-6\"", kind: "wet", x: 29.5, y: 11, w: 9, h: 4.5 },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: 47.5, y: 0, w: 1.6, h: 26.375 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 49.1, y: 7, w: 6.2, h: 20 },
];

export const A6_DOORS: A6Door[] = [
  { id: "entry", wall: "e", x: 47.5, y: 18.4, length: 3.2, swing: "ccw", entrance: true },
  { id: "utility", wall: "w", x: X0, y: 4.2, length: 2.5, swing: "cw" },
  { id: "puja", wall: "n", x: 6.4, y: 11.875, length: 2.3, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: 23.2, y: 7.25, length: 2.3, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 28.1, y: 7.25, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 36.2, y: 11, length: 3, swing: "ccw" },
  { id: "bed-2", wall: "n", x: 7.6, y: 15.375, length: 2.8, swing: "cw" },
  { id: "bed-3", wall: "n", x: 20.2, y: 15.375, length: 3, swing: "ccw" },
  { id: "toilet-3", wall: "n", x: 32.2, y: 11, length: 2.5, swing: "cw" },
];

export const A6_WINDOWS: A6Window[] = [
  { id: "kit", x: 8.4, y: -0.18, w: 5.2, h: 0.36 },
  { id: "bed-1", x: 36.4, y: -0.18, w: 6.4, h: 0.36 },
  { id: "util", x: 0.82, y: 3.2, w: 0.36, h: 6.2 },
  { id: "bed-2", x: 4.82, y: 17.6, w: 0.36, h: 5.6 },
  { id: "bed-3", x: 19.2, y: 26.2, w: 6.4, h: 0.36 },
];

/** Hall south of the north toilets — kitchen/dining to living. */
export const A6_OPENINGS = [
  { id: "hall", x: 22.5, y: 7.25, w: 11.875, h: 8.125 },
] as const;

export const A6_EXTENT = { x: 0, y: 0, w: 57.5, h: 28.6 };

export const A6_WALLS: A6Wall[] = [
  { x1: 1, y1: 0, x2: 47.5, y2: 0, outer: true },
  { x1: 47.5, y1: 0, x2: 47.5, y2: 26.375, outer: true },
  { x1: 16.5, y1: 26.375, x2: 47.5, y2: 26.375, outer: true },
  { x1: 5, y1: 26.375, x2: 16.5, y2: 26.375, outer: true },
  { x1: 0, y1: 26.375, x2: 5, y2: 26.375, outer: true, parapet: true },
  { x1: 0, y1: 15.375, x2: 0, y2: 26.375, outer: true, parapet: true },
  { x1: 0, y1: 15.375, x2: 1, y2: 15.375, outer: true, parapet: true },
  { x1: 1, y1: 0, x2: 1, y2: 15.375, outer: true },
  { x1: 5, y1: 0, x2: 5, y2: 26.375 },
  { x1: 22.5, y1: 0, x2: 22.5, y2: 15.375 },
  { x1: 26.75, y1: 0, x2: 26.75, y2: 7.25 },
  { x1: 33, y1: 0, x2: 33, y2: 11 },
  { x1: 22.5, y1: 7.25, x2: 33, y2: 7.25 },
  { x1: 33, y1: 11, x2: 47.5, y2: 11 },
  { x1: 5, y1: 15.375, x2: 29.5, y2: 15.375 },
  { x1: 5, y1: 11.875, x2: 11, y2: 11.875 },
  { x1: 11, y1: 11.875, x2: 11, y2: 15.375 },
  { x1: 16.5, y1: 15.375, x2: 16.5, y2: 26.375 },
  { x1: 29.5, y1: 11, x2: 29.5, y2: 26.375 },
  { x1: 29.5, y1: 11, x2: 38.5, y2: 11 },
  { x1: 38.5, y1: 11, x2: 38.5, y2: 15.5 },
  { x1: 29.5, y1: 15.5, x2: 38.5, y2: 15.5 },
  { x1: 49.1, y1: 7, x2: 55.3, y2: 7, outer: true },
  { x1: 55.3, y1: 7, x2: 55.3, y2: 27, outer: true },
  { x1: 49.1, y1: 7, x2: 49.1, y2: 27 },
  { x1: 49.1, y1: 27, x2: 55.3, y2: 27, outer: true },
];

export function splitA6Walls(walls: A6Wall[] = A6_WALLS, doors: A6Door[] = A6_DOORS): A6Wall[] {
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
    const parts: A6Wall[] = [];
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
