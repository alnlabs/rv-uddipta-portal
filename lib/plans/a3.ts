/**
 * Typical-floor A3 (2BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedrooms / 5' balcony / open side)
 *   −x = west  (common corridor / entrance)
 *   −y = north (top of drawing / kitchen)
 *   +y = south (bottom / living)
 *
 * A3 sits north of A2, east of the A4 lobby corridor. Entrance is from
 * the west corridor into the living room. Room sizes are brochure labels.
 */

export const A3_META = {
  unit: "A3",
  type: "2BHK-E",
  sbuaSft: 1338,
  carpetSft: 812,
  balconySft: 109,
  floors: "A3 stack · typical floors 4–10",
} as const;

export function isA3Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 3;
}

export type A3Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A3Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A3Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type A3Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

/** West face of the apartment (east of the AC ledge). */
const X0 = 7.8;

/** Brochure room rectangles, feet. */
export const A3_ROOMS: A3Room[] = [
  { id: "utility", label: "Utility", dim: "4' wide", kind: "utility", x: X0, y: 0, w: 4, h: 11 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "8' × 11'",
    kind: "room",
    x: X0 + 4,
    y: 0,
    w: 8,
    h: 11,
  },
  { id: "toilet-1", label: "Toilet", dim: "4'-3\" × 7'-3\"", kind: "wet", x: X0 + 12, y: 0, w: 4.25, h: 7.25 },
  { id: "toilet-2", label: "Toilet", dim: "6' × 7'-3\"", kind: "wet", x: X0 + 16.25, y: 0, w: 6, h: 7.25 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "15' × 11'",
    kind: "room",
    x: X0 + 22.25,
    y: 0,
    w: 15,
    h: 11,
  },
  {
    id: "living",
    label: "Living room",
    dim: "20'-3\" × 11'",
    kind: "room",
    x: X0,
    y: 11,
    w: 20.25,
    h: 11,
  },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "13' × 11'",
    kind: "room",
    x: X0 + 24.25,
    y: 11,
    w: 13,
    h: 11,
  },
  { id: "puja", label: "Puja", dim: "4'-9\" × 6'-7½\"", kind: "room", x: X0 + 20.25, y: 15.375, w: 4.75, h: 6.625 },
  { id: "balc-e", label: "Balcony", dim: "5' wide", kind: "balcony", x: X0 + 37.25, y: 11, w: 5, h: 11 },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: 6.2, y: 0, w: 1.6, h: 22 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 0, y: 8, w: 6.2, h: 16 },
];

export const A3_DOORS: A3Door[] = [
  { id: "entry", wall: "w", x: X0, y: 14.3, length: 3.2, swing: "cw", entrance: true },
  { id: "kitchen", wall: "s", x: X0 + 5.4, y: 11, length: 2.5, swing: "cw" },
  { id: "utility", wall: "w", x: X0 + 4, y: 3.6, length: 2.4, swing: "cw" },
  { id: "toilet-1", wall: "s", x: X0 + 12.7, y: 7.25, length: 2.3, swing: "cw" },
  { id: "toilet-2", wall: "s", x: X0 + 17.6, y: 7.25, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: X0 + 23.4, y: 11, length: 3, swing: "cw" },
  { id: "bed-2", wall: "w", x: X0 + 24.25, y: 12.6, length: 2.8, swing: "cw" },
  { id: "puja", wall: "w", x: X0 + 20.25, y: 16.6, length: 2.3, swing: "ccw" },
];

export const A3_WINDOWS: A3Window[] = [
  { id: "kit", x: X0 + 5.4, y: -0.18, w: 4.4, h: 0.36 },
  { id: "bed-1-n", x: X0 + 25.8, y: -0.18, w: 6.4, h: 0.36 },
  { id: "bed-1-e", x: X0 + 37.07, y: 2.4, w: 0.36, h: 5.4 },
  { id: "bed-2-e", x: X0 + 37.07, y: 13.4, w: 0.36, h: 5.4 },
  { id: "util", x: X0 - 0.18, y: 2.6, w: 0.36, h: 5.2 },
];

/** Hall north of puja — living to bedroom circulation. */
export const A3_OPENINGS = [
  { id: "hall", x: X0 + 20.25, y: 11, w: 4, h: 4.375 },
] as const;

export const A3_EXTENT = { x: 0, y: 0, w: 52.2, h: 24.2 };

export const A3_WALLS: A3Wall[] = [
  { x1: X0, y1: 0, x2: X0 + 37.25, y2: 0, outer: true },
  { x1: X0 + 37.25, y1: 0, x2: X0 + 37.25, y2: 22, outer: true },
  { x1: X0 + 37.25, y1: 11, x2: X0 + 42.25, y2: 11, outer: true, parapet: true },
  { x1: X0 + 42.25, y1: 11, x2: X0 + 42.25, y2: 22, outer: true, parapet: true },
  { x1: X0 + 37.25, y1: 22, x2: X0 + 42.25, y2: 22, outer: true, parapet: true },
  { x1: X0, y1: 22, x2: X0 + 37.25, y2: 22, outer: true },
  { x1: X0, y1: 0, x2: X0, y2: 22, outer: true },
  { x1: X0 + 4, y1: 0, x2: X0 + 4, y2: 11 },
  { x1: X0 + 12, y1: 0, x2: X0 + 12, y2: 11 },
  { x1: X0 + 16.25, y1: 0, x2: X0 + 16.25, y2: 7.25 },
  { x1: X0 + 22.25, y1: 0, x2: X0 + 22.25, y2: 11 },
  { x1: X0 + 12, y1: 7.25, x2: X0 + 22.25, y2: 7.25 },
  { x1: X0, y1: 11, x2: X0 + 20.25, y2: 11 },
  { x1: X0 + 22.25, y1: 11, x2: X0 + 37.25, y2: 11 },
  { x1: X0 + 20.25, y1: 15.375, x2: X0 + 25, y2: 15.375 },
  { x1: X0 + 20.25, y1: 15.375, x2: X0 + 20.25, y2: 22 },
  { x1: X0 + 24.25, y1: 11, x2: X0 + 24.25, y2: 15.375 },
  { x1: X0 + 25, y1: 15.375, x2: X0 + 25, y2: 22 },
];

export function splitA3Walls(walls: A3Wall[] = A3_WALLS, doors: A3Door[] = A3_DOORS): A3Wall[] {
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
    const parts: A3Wall[] = [];
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
