/**
 * Typical-floor A10 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedrooms / 4'-6" balcony / lobby)
 *   −x = west  (A9 / kitchen / drawing)
 *   −y = north (top of drawing / 5' utility / 6' balcony)
 *   +y = south (bottom / common corridor / entrance)
 *
 * A10 is the east end unit of the A9–A10 pair. Entrance is from the
 * south corridor into the drawing room. Lift, lobby and corridor are
 * outside A10. Puja has no readable brochure dimension.
 */

export const A10_META = {
  unit: "A10",
  type: "3BHK-E",
  sbuaSft: 1620,
  carpetSft: 968,
  balconySft: 143,
  floors: "A10 stack · typical floors 5–10",
} as const;

export function isA10Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 10;
}

export type A10Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A10Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A10Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type A10Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

/** Brochure room rectangles, feet. Origin is the north-west utility corner. */
export const A10_ROOMS: A10Room[] = [
  { id: "utility", label: "Utility", dim: "5' wide", kind: "utility", x: 0, y: 0, w: 10, h: 5 },
  { id: "balc-n", label: "Balcony", dim: "6' wide", kind: "balcony", x: 10, y: 0, w: 10, h: 6 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "10' × 8'-3\"",
    kind: "room",
    x: 0,
    y: 5,
    w: 10,
    h: 8.25,
  },
  { id: "puja", label: "Puja", dim: null, kind: "room", x: 6.3, y: 10.4, w: 3.5, h: 3.4 },
  {
    id: "living",
    label: "Living / Dining",
    dim: "10' × 18'-3\"",
    kind: "room",
    x: 10,
    y: 6,
    w: 10,
    h: 18.875,
  },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "13' × 11'",
    kind: "room",
    x: 20,
    y: 0,
    w: 13,
    h: 11,
  },
  { id: "toilet-1", label: "Toilet", dim: "8'-6\" × 4'-6\"", kind: "wet", x: 20, y: 11, w: 8.5, h: 4.5 },
  { id: "balc-e", label: "Balcony", dim: "4'-6\" wide", kind: "balcony", x: 28.5, y: 11, w: 4.5, h: 4.5 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "10' × 11'-7½\"",
    kind: "room",
    x: 0,
    y: 13.25,
    w: 10,
    h: 11.625,
  },
  { id: "toilet-2", label: "Toilet", dim: "6' × 4'", kind: "wet", x: 20, y: 15.5, w: 6, h: 4 },
  { id: "toilet-3", label: "Toilet", dim: "5' × 8'-7½\"", kind: "wet", x: 28, y: 15.875, w: 5, h: 8.625 },
  {
    id: "drawing",
    label: "Drawing",
    dim: "15'-6\" × 10'-7½\"",
    kind: "room",
    x: 0,
    y: 24.875,
    w: 15.5,
    h: 10.625,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "12'-6\" × 10'-3\"",
    kind: "room",
    x: 15.5,
    y: 24.875,
    w: 12.5,
    h: 10.625,
  },
  { id: "hall-se", label: "", dim: null, kind: "room", x: 28, y: 24.5, w: 5, h: 11 },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: 28, y: 35.5, w: 5, h: 1.6 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: -8, y: 35.5, w: 50, h: 6.5 },
  { id: "lift", label: "Lift", dim: null, kind: "corridor", x: -7.6, y: 36.8, w: 6.2, h: 4.8 },
  { id: "lobby", label: "Lobby", dim: null, kind: "corridor", x: 34.4, y: 8, w: 11.2, h: 22 },
];

export const A10_DOORS: A10Door[] = [
  { id: "entry", wall: "s", x: 2.4, y: 35.5, length: 3.2, swing: "cw", entrance: true },
  { id: "utility", wall: "s", x: 3.4, y: 5, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "e", x: 10, y: 7.4, length: 2.6, swing: "cw" },
  { id: "puja", wall: "e", x: 9.8, y: 10.8, length: 2.1, swing: "ccw" },
  { id: "bed-1", wall: "w", x: 20, y: 6.6, length: 2.8, swing: "ccw" },
  { id: "toilet-1", wall: "w", x: 20, y: 12.1, length: 2.3, swing: "cw" },
  { id: "bed-2", wall: "e", x: 10, y: 16.4, length: 2.8, swing: "cw" },
  { id: "toilet-2", wall: "w", x: 20, y: 16.3, length: 2.2, swing: "cw" },
  { id: "toilet-3", wall: "w", x: 28, y: 17.6, length: 2.4, swing: "ccw" },
  { id: "bed-3", wall: "n", x: 18.6, y: 24.875, length: 2.8, swing: "cw" },
];

export const A10_WINDOWS: A10Window[] = [
  { id: "util", x: 2.2, y: -0.18, w: 5.4, h: 0.36 },
  { id: "kit", x: -0.18, y: 6.4, w: 0.36, h: 4.6 },
  { id: "bed-1-n", x: 23.2, y: -0.18, w: 6.4, h: 0.36 },
  { id: "bed-1-e", x: 32.82, y: 2.2, w: 0.36, h: 5.6 },
  { id: "bed-2", x: -0.18, y: 15.8, w: 0.36, h: 6.2 },
  { id: "bed-3", x: 18.4, y: 35.32, w: 6.2, h: 0.36 },
];

/** Living to drawing, and living to the north balcony. */
export const A10_OPENINGS = [
  { id: "kit-live", x: 9.5, y: 6.2, w: 1.2, h: 6.4 },
  { id: "live-draw", x: 10.2, y: 24.4, w: 5, h: 1.1 },
  { id: "live-balc", x: 12.2, y: 5.55, w: 5.6, h: 0.9 },
] as const;

export const A10_EXTENT = { x: -8, y: -2, w: 56, h: 46 };

export const A10_WALLS: A10Wall[] = [
  { x1: 0, y1: 0, x2: 33, y2: 0, outer: true },
  { x1: 33, y1: 0, x2: 33, y2: 35.5, outer: true },
  { x1: 0, y1: 35.5, x2: 33, y2: 35.5, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: 35.5, outer: true },
  { x1: 10, y1: 0, x2: 10, y2: 6, parapet: true },
  { x1: 20, y1: 0, x2: 20, y2: 6 },
  { x1: 0, y1: 5, x2: 10, y2: 5 },
  { x1: 10, y1: 6, x2: 20, y2: 6, parapet: true },
  { x1: 10, y1: 5, x2: 10, y2: 13.25 },
  { x1: 0, y1: 13.25, x2: 10, y2: 13.25 },
  { x1: 10, y1: 13.25, x2: 10, y2: 24.875 },
  { x1: 20, y1: 6, x2: 20, y2: 24.875 },
  { x1: 20, y1: 11, x2: 33, y2: 11 },
  { x1: 20, y1: 15.5, x2: 28.5, y2: 15.5 },
  { x1: 28.5, y1: 11, x2: 28.5, y2: 15.5, parapet: true },
  { x1: 20, y1: 19.5, x2: 26, y2: 19.5 },
  { x1: 26, y1: 15.5, x2: 26, y2: 19.5 },
  { x1: 28, y1: 15.875, x2: 28, y2: 24.5 },
  { x1: 28, y1: 24.5, x2: 33, y2: 24.5 },
  { x1: 0, y1: 24.875, x2: 20, y2: 24.875 },
  { x1: 15.5, y1: 24.875, x2: 15.5, y2: 35.5 },
  { x1: 28, y1: 24.5, x2: 28, y2: 35.5 },
  { x1: 6.3, y1: 10.4, x2: 9.8, y2: 10.4 },
  { x1: 6.3, y1: 10.4, x2: 6.3, y2: 13.8 },
  { x1: 6.3, y1: 13.8, x2: 9.8, y2: 13.8 },
  { x1: 9.8, y1: 10.4, x2: 9.8, y2: 13.8 },
  { x1: -8, y1: 42, x2: 42, y2: 42, outer: true },
  { x1: -8, y1: 35.5, x2: -8, y2: 42, outer: true },
  { x1: -7.6, y1: 36.8, x2: -1.4, y2: 36.8, outer: true },
  { x1: -7.6, y1: 36.8, x2: -7.6, y2: 41.6, outer: true },
  { x1: -1.4, y1: 36.8, x2: -1.4, y2: 41.6, outer: true },
  { x1: -7.6, y1: 41.6, x2: -1.4, y2: 41.6, outer: true },
  { x1: 34.4, y1: 8, x2: 45.6, y2: 8, outer: true },
  { x1: 34.4, y1: 8, x2: 34.4, y2: 30, outer: true },
  { x1: 45.6, y1: 8, x2: 45.6, y2: 30, outer: true },
  { x1: 34.4, y1: 30, x2: 45.6, y2: 30, outer: true },
];

export function splitA10Walls(walls: A10Wall[] = A10_WALLS, doors: A10Door[] = A10_DOORS): A10Wall[] {
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
    const parts: A10Wall[] = [];
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
