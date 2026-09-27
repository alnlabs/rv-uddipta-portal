/**
 * Typical-floor A2 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (external / toilet 3 / 5' balcony)
 *   −x = west  (common corridor / A1)
 *   −y = north (top of drawing / kitchen balcony)
 *   +y = south (bottom / 5' living balcony)
 *
 * A2 sits immediately east of A1. Entrance is from the west corridor.
 * Room sizes are brochure labels only.
 */

export const A2_META = {
  unit: "A2",
  type: "3BHK-E",
  sbuaSft: 1738,
  carpetSft: 1020,
  balconySft: 212,
  floors: "A2 stack · typical floors 4–10",
} as const;

export function isA2Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 2;
}

export type A2Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A2Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A2Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type A2Wall = {
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
export const A2_ROOMS: A2Room[] = [
  { id: "balc-kit", label: "Balcony", dim: "4'-4½\" wide", kind: "balcony", x: X0, y: 0, w: 10.625, h: 4.375 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "10'-7½\" × 8'",
    kind: "room",
    x: X0,
    y: 4.375,
    w: 10.625,
    h: 8,
  },
  { id: "puja", label: "Puja", dim: "4'-9\" × 4'", kind: "room", x: X0, y: 12.375, w: 4.75, h: 4 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "10' × 12'",
    kind: "room",
    x: X0 + 10.625,
    y: 4.375,
    w: 10,
    h: 12,
  },
  {
    id: "toilet-1",
    label: "Toilet",
    dim: "4' × 7'-10½\"",
    kind: "wet",
    x: X0 + 20.625,
    y: 4.375,
    w: 4,
    h: 7.875,
  },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "13' × 12'",
    kind: "room",
    x: X0 + 24.625,
    y: 4.375,
    w: 13,
    h: 12,
  },
  {
    id: "living",
    label: "Drawing / Living",
    dim: "20' × 10'-6\"",
    kind: "room",
    x: X0,
    y: 16.375,
    w: 20,
    h: 10.5,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "12'-4½\" × 10'-3\"",
    kind: "room",
    x: X0 + 20,
    y: 16.375,
    w: 12.375,
    h: 10.5,
  },
  {
    id: "toilet-2",
    label: "Toilet",
    dim: "10' × 4'-3\"",
    kind: "wet",
    x: X0 + 32.375,
    y: 16.375,
    w: 4.25,
    h: 10.5,
  },
  {
    id: "toilet-3",
    label: "Toilet",
    dim: "6' × 6'-7½\"",
    kind: "wet",
    x: X0 + 36.625,
    y: 20.25,
    w: 6,
    h: 6.625,
  },
  { id: "balc-s", label: "Balcony", dim: "5' wide", kind: "balcony", x: X0, y: 26.875, w: 32.375, h: 5 },
  {
    id: "balc-e",
    label: "Balcony",
    dim: "5' wide",
    kind: "balcony",
    x: X0 + 42.625,
    y: 16.375,
    w: 5,
    h: 15.5,
  },
  { id: "ac-ledge", label: "AC ledge", dim: null, kind: "utility", x: 6.2, y: 4.375, w: 1.6, h: 22.5 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 0, y: 10, w: 6.2, h: 20 },
];

export const A2_DOORS: A2Door[] = [
  { id: "entry", wall: "w", x: X0, y: 19.5, length: 3.2, swing: "cw", entrance: true },
  { id: "kitchen", wall: "s", x: X0 + 5.3, y: 12.375, length: 2.5, swing: "cw" },
  { id: "puja", wall: "s", x: X0 + 1.1, y: 16.375, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: X0 + 12.8, y: 16.375, length: 3, swing: "cw" },
  { id: "toilet-1", wall: "s", x: X0 + 21.3, y: 12.25, length: 2.3, swing: "cw" },
  { id: "bed-2", wall: "s", x: X0 + 26.0, y: 16.375, length: 3, swing: "ccw" },
  { id: "bed-3", wall: "n", x: X0 + 22.6, y: 16.375, length: 3, swing: "cw" },
  { id: "toilet-2", wall: "w", x: X0 + 32.375, y: 18.1, length: 2.4, swing: "cw" },
  { id: "toilet-3", wall: "n", x: X0 + 37.8, y: 20.25, length: 2.4, swing: "ccw" },
];

export const A2_WINDOWS: A2Window[] = [
  { id: "kit", x: X0 + 3.1, y: 4.19, w: 4.4, h: 0.36 },
  { id: "bed-1", x: X0 + 12.9, y: 4.19, w: 5.4, h: 0.36 },
  { id: "bed-2", x: X0 + 28.2, y: 4.19, w: 6.2, h: 0.36 },
  { id: "living", x: X0 + 5.8, y: 26.7, w: 8.2, h: 0.36 },
  { id: "bed-3", x: X0 + 23.2, y: 26.7, w: 6.4, h: 0.36 },
];

/** Open south of kitchen, east of puja — living/kitchen connection on the brochure. */
export const A2_OPENINGS = [
  { id: "kit-live", x: X0 + 4.75, y: 12.375, w: 5.875, h: 4 },
] as const;

export const A2_EXTENT = { x: 0, y: 0, w: 56.5, h: 33 };

export const A2_WALLS: A2Wall[] = [
  { x1: X0, y1: 0, x2: X0 + 10.625, y2: 0, outer: true, parapet: true },
  { x1: X0 + 10.625, y1: 0, x2: X0 + 10.625, y2: 4.375, outer: true, parapet: true },
  { x1: X0 + 10.625, y1: 4.375, x2: X0 + 37.625, y2: 4.375, outer: true },
  { x1: X0 + 37.625, y1: 4.375, x2: X0 + 37.625, y2: 16.375, outer: true },
  { x1: X0 + 37.625, y1: 16.375, x2: X0 + 42.625, y2: 16.375, outer: true },
  { x1: X0 + 42.625, y1: 16.375, x2: X0 + 47.625, y2: 16.375, outer: true, parapet: true },
  { x1: X0 + 47.625, y1: 16.375, x2: X0 + 47.625, y2: 31.875, outer: true, parapet: true },
  { x1: X0 + 32.375, y1: 31.875, x2: X0 + 47.625, y2: 31.875, outer: true, parapet: true },
  { x1: X0 + 32.375, y1: 26.875, x2: X0 + 32.375, y2: 31.875, outer: true, parapet: true },
  { x1: X0, y1: 31.875, x2: X0 + 32.375, y2: 31.875, outer: true, parapet: true },
  { x1: X0, y1: 26.875, x2: X0, y2: 31.875, outer: true, parapet: true },
  { x1: X0, y1: 0, x2: X0, y2: 26.875, outer: true },
  { x1: X0, y1: 12.375, x2: X0 + 10.625, y2: 12.375 },
  { x1: X0 + 4.75, y1: 12.375, x2: X0 + 4.75, y2: 16.375 },
  { x1: X0, y1: 16.375, x2: X0 + 32.375, y2: 16.375 },
  { x1: X0 + 10.625, y1: 4.375, x2: X0 + 10.625, y2: 16.375 },
  { x1: X0 + 20.625, y1: 4.375, x2: X0 + 20.625, y2: 16.375 },
  { x1: X0 + 24.625, y1: 4.375, x2: X0 + 24.625, y2: 16.375 },
  { x1: X0 + 20.625, y1: 12.25, x2: X0 + 24.625, y2: 12.25 },
  { x1: X0 + 20, y1: 16.375, x2: X0 + 20, y2: 26.875 },
  { x1: X0 + 32.375, y1: 16.375, x2: X0 + 32.375, y2: 26.875 },
  { x1: X0 + 36.625, y1: 16.375, x2: X0 + 36.625, y2: 26.875 },
  { x1: X0 + 36.625, y1: 20.25, x2: X0 + 42.625, y2: 20.25 },
  { x1: X0 + 42.625, y1: 16.375, x2: X0 + 42.625, y2: 31.875 },
  { x1: X0, y1: 26.875, x2: X0 + 32.375, y2: 26.875, outer: true },
  { x1: X0 + 36.625, y1: 26.875, x2: X0 + 47.625, y2: 26.875, outer: true },
];

export function splitA2Walls(walls: A2Wall[] = A2_WALLS, doors: A2Door[] = A2_DOORS): A2Wall[] {
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
    const parts: A2Wall[] = [];
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
