/**
 * Typical-floor A7 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedrooms / 5' balcony / open side)
 *   −x = west  (common corridor / entrance)
 *   −y = north (top of drawing / kitchen)
 *   +y = south (bottom / living)
 *
 * A7 sits east of the A8 corridor. Entrance is from the west corridor
 * into living/drawing. Lift is outside A7 to the north-west.
 * Kitchen and dining stay separate rooms, open to each other.
 * Puja has no readable brochure dimension — drawn without a size label.
 */

export const A7_META = {
  unit: "A7",
  type: "3BHK-E",
  sbuaSft: 1711,
  carpetSft: 1082,
  balconySft: 120,
  floors: "A7 stack · typical floors 5–10",
} as const;

export function isA7Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 7;
}

export type A7Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A7Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A7Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type A7Wall = {
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
export const A7_ROOMS: A7Room[] = [
  { id: "lift", label: "Lift", dim: null, kind: "corridor", x: 0.4, y: -7.4, w: 6.2, h: 6.2 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 0, y: 0, w: 6.2, h: 26 },
  { id: "ac-ledge", label: "", dim: "2'-9\"", kind: "utility", x: 5.05, y: 10, w: 2.75, h: 16 },
  { id: "utility", label: "Utility", dim: "4'-3\" wide", kind: "utility", x: X0, y: 0, w: 4.25, h: 4.5 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "9'-6\" × 10'",
    kind: "room",
    x: X0 + 4.25,
    y: 0,
    w: 9.5,
    h: 10,
  },
  { id: "puja", label: "Puja", dim: null, kind: "room", x: X0 + 4.25, y: 0, w: 3.5, h: 3.5 },
  {
    id: "dining",
    label: "Dining",
    dim: "9'-6\" × 15'-10½\"",
    kind: "room",
    x: X0 + 13.75,
    y: 0,
    w: 9.5,
    h: 15.875,
  },
  { id: "toilet-1", label: "Toilet", dim: "4'-7½\" × 9'", kind: "wet", x: X0 + 23.25, y: 0, w: 4.625, h: 9 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "14'-4½\" × 11'",
    kind: "room",
    x: X0 + 27.875,
    y: 0,
    w: 14.375,
    h: 11,
  },
  { id: "toilet-2", label: "Toilet", dim: "9' × 4'-6\"", kind: "wet", x: X0 + 27.875, y: 11, w: 9, h: 4.5 },
  {
    id: "living",
    label: "Living / Drawing",
    dim: "12' × 15'",
    kind: "room",
    x: X0,
    y: 10,
    w: 12,
    h: 15,
  },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "10'-6\" × 12'-6\"",
    kind: "room",
    x: X0 + 12,
    y: 12.5,
    w: 10.5,
    h: 12.5,
  },
  { id: "toilet-3", label: "Toilet", dim: "4'-1½\" × 8'", kind: "wet", x: X0 + 22.5, y: 12.5, w: 4.125, h: 8 },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "11' × 12'-6\"",
    kind: "room",
    x: X0 + 26.625,
    y: 12.5,
    w: 11,
    h: 12.5,
  },
  { id: "balc-e", label: "Balcony", dim: "5' wide", kind: "balcony", x: X0 + 36.875, y: 11, w: 5.375, h: 14 },
];

export const A7_DOORS: A7Door[] = [
  { id: "entry", wall: "w", x: X0, y: 16.2, length: 3.2, swing: "cw", entrance: true },
  { id: "utility", wall: "s", x: X0 + 0.9, y: 4.5, length: 2.3, swing: "cw" },
  { id: "kitchen", wall: "s", x: X0 + 6.4, y: 10, length: 2.5, swing: "cw" },
  { id: "puja", wall: "s", x: X0 + 4.85, y: 3.5, length: 2.1, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: X0 + 24.1, y: 9, length: 2.3, swing: "cw" },
  { id: "bed-1", wall: "s", x: X0 + 30.4, y: 11, length: 3, swing: "cw" },
  { id: "toilet-2", wall: "w", x: X0 + 27.875, y: 12.2, length: 2.4, swing: "cw" },
  { id: "bed-2", wall: "n", x: X0 + 14.4, y: 12.5, length: 2.8, swing: "ccw" },
  { id: "toilet-3", wall: "n", x: X0 + 23.2, y: 12.5, length: 2.3, swing: "ccw" },
  { id: "bed-3", wall: "n", x: X0 + 29.2, y: 12.5, length: 2.8, swing: "cw" },
];

export const A7_WINDOWS: A7Window[] = [
  { id: "kit", x: X0 + 6.2, y: -0.18, w: 4.4, h: 0.36 },
  { id: "dining", x: X0 + 15.4, y: -0.18, w: 5.2, h: 0.36 },
  { id: "bed-1-n", x: X0 + 30.8, y: -0.18, w: 6.4, h: 0.36 },
  { id: "bed-3-e", x: X0 + 37.45, y: 15.2, w: 0.36, h: 6.2 },
  { id: "util", x: X0 - 0.18, y: 0.4, w: 0.36, h: 3.4 },
  { id: "bed-2", x: X0 + 14.2, y: 24.82, w: 5.4, h: 0.36 },
];

/** Kitchen to dining (no wall), and living to the dining hall. */
export const A7_OPENINGS = [
  { id: "kit-dine", x: X0 + 12.5, y: 0.4, w: 2.5, h: 9.2 },
  { id: "dine-live", x: X0 + 12, y: 10, w: 1.8, h: 5.4 },
] as const;

export const A7_EXTENT = { x: 0, y: -8.2, w: 52.8, h: 35.6 };

export const A7_WALLS: A7Wall[] = [
  { x1: X0, y1: 0, x2: X0 + 42.25, y2: 0, outer: true },
  { x1: X0 + 42.25, y1: 0, x2: X0 + 42.25, y2: 11, outer: true },
  { x1: X0 + 42.25, y1: 11, x2: X0 + 42.25, y2: 25, outer: true, parapet: true },
  { x1: X0 + 42.25, y1: 11, x2: X0 + 47.25, y2: 11, outer: true, parapet: true },
  { x1: X0 + 47.25, y1: 11, x2: X0 + 47.25, y2: 25, outer: true, parapet: true },
  { x1: X0 + 37.625, y1: 25, x2: X0 + 47.25, y2: 25, outer: true, parapet: true },
  { x1: X0, y1: 25, x2: X0 + 37.625, y2: 25, outer: true },
  { x1: X0, y1: 0, x2: X0, y2: 25, outer: true },
  { x1: X0 + 4.25, y1: 0, x2: X0 + 4.25, y2: 4.5 },
  { x1: X0, y1: 4.5, x2: X0 + 4.25, y2: 4.5 },
  { x1: X0 + 4.25, y1: 0, x2: X0 + 7.75, y2: 0 },
  { x1: X0 + 7.75, y1: 0, x2: X0 + 7.75, y2: 3.5 },
  { x1: X0 + 4.25, y1: 3.5, x2: X0 + 7.75, y2: 3.5 },
  { x1: X0 + 23.25, y1: 0, x2: X0 + 23.25, y2: 15.875 },
  { x1: X0 + 27.875, y1: 0, x2: X0 + 27.875, y2: 15.5 },
  { x1: X0 + 23.25, y1: 9, x2: X0 + 27.875, y2: 9 },
  { x1: X0 + 27.875, y1: 11, x2: X0 + 42.25, y2: 11 },
  { x1: X0 + 27.875, y1: 15.5, x2: X0 + 36.875, y2: 15.5 },
  { x1: X0, y1: 10, x2: X0 + 13.75, y2: 10 },
  { x1: X0 + 13.75, y1: 15.875, x2: X0 + 23.25, y2: 15.875 },
  { x1: X0 + 12, y1: 10, x2: X0 + 12, y2: 25 },
  { x1: X0 + 22.5, y1: 12.5, x2: X0 + 22.5, y2: 25 },
  { x1: X0 + 26.625, y1: 12.5, x2: X0 + 26.625, y2: 25 },
  { x1: X0 + 12, y1: 12.5, x2: X0 + 37.625, y2: 12.5 },
  { x1: X0 + 37.625, y1: 11, x2: X0 + 37.625, y2: 25 },
  { x1: 0.4, y1: -7.4, x2: 6.6, y2: -7.4, outer: true },
  { x1: 0.4, y1: -7.4, x2: 0.4, y2: -1.2, outer: true },
  { x1: 6.6, y1: -7.4, x2: 6.6, y2: -1.2, outer: true },
  { x1: 0.4, y1: -1.2, x2: 6.6, y2: -1.2, outer: true },
  { x1: 0, y1: 0, x2: 6.2, y2: 0, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: 26, outer: true },
  { x1: 6.2, y1: 0, x2: 6.2, y2: 10 },
  { x1: 0, y1: 26, x2: 6.2, y2: 26, outer: true },
];

export function splitA7Walls(walls: A7Wall[] = A7_WALLS, doors: A7Door[] = A7_DOORS): A7Wall[] {
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
    const parts: A7Wall[] = [];
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
