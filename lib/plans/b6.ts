/**
 * Typical-floor B6 (2BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (living / entrance / corridor)
 *   −x = west  (4' wash / 5' balcony / open side)
 *   −y = north (top of drawing / kitchen)
 *   +y = south (bottom / bedroom 2 / living)
 *
 * B6 is on the western B-block row, north of B5. Entrance is from the
 * east corridor into the living room. Corridor and AC ledge are outside B6.
 */

export const B6_META = {
  unit: "B6",
  type: "2BHK-W",
  sbuaSft: 1309,
  carpetSft: 806,
  balconySft: 96,
  floors: "B6 stack · typical floors 5–10",
} as const;

export function isB6Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 6;
}

export type B6Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B6Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B6Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B6Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

/** West face of kitchen / bedroom 2 (east of wash and balcony). */
const X0 = 4;

/** Brochure room rectangles, feet. */
export const B6_ROOMS: B6Room[] = [
  { id: "wash", label: "Wash", dim: "4' wide", kind: "utility", x: 0, y: 0, w: 4, h: 10.5 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "11'-6\" × 10'-6\"",
    kind: "room",
    x: X0,
    y: 0,
    w: 11.5,
    h: 10.5,
  },
  { id: "toilet-1", label: "Toilet", dim: "4' × 6'", kind: "wet", x: 15.5, y: 0, w: 4, h: 6 },
  { id: "toilet-2", label: "Toilet", dim: "7' × 6'", kind: "wet", x: 19.5, y: 0, w: 7, h: 6 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "14'-6\" × 10'-6\"",
    kind: "room",
    x: 26.5,
    y: 0,
    w: 14.5,
    h: 10.5,
  },
  { id: "hall", label: "", dim: null, kind: "room", x: 15.5, y: 6, w: 11, h: 4.5 },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: 10.5, w: 5, h: 10.5 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "13'-6\" × 10'-6\"",
    kind: "room",
    x: 5,
    y: 10.5,
    w: 13.5,
    h: 10.5,
  },
  { id: "puja", label: "Puja", dim: "3'-6\" × 6'-6\"", kind: "room", x: 18.5, y: 14.5, w: 3.5, h: 6.5 },
  {
    id: "living",
    label: "Living room",
    dim: "20' × 10'-6\"",
    kind: "room",
    x: 21,
    y: 10.5,
    w: 20,
    h: 10.5,
  },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: 41, y: 10.5, w: 1.6, h: 10.5 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 42.6, y: 4, w: 6.2, h: 18 },
];

export const B6_DOORS: B6Door[] = [
  { id: "entry", wall: "e", x: 41, y: 13.4, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "w", x: X0, y: 3.4, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "s", x: 8.2, y: 10.5, length: 2.6, swing: "cw" },
  { id: "toilet-1", wall: "s", x: 16.2, y: 6, length: 2.2, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 21.6, y: 6, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 30.2, y: 10.5, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "e", x: 18.5, y: 12.4, length: 2.8, swing: "cw" },
  { id: "puja", wall: "n", x: 19.1, y: 14.5, length: 2.2, swing: "ccw" },
];

export const B6_WINDOWS: B6Window[] = [
  { id: "kit", x: 7.2, y: -0.18, w: 5.4, h: 0.36 },
  { id: "wash", x: -0.18, y: 2.4, w: 0.36, h: 5.2 },
  { id: "bed-1", x: 30.4, y: -0.18, w: 6.8, h: 0.36 },
  { id: "bed-2", x: 4.82, y: 13.2, w: 0.36, h: 5.6 },
];

/** Hall south of the toilets — kitchen / living circulation. */
export const B6_OPENINGS = [
  { id: "hall-live", x: 21, y: 10.2, w: 5.4, h: 0.8 },
  { id: "kit-hall", x: 15.2, y: 6.4, w: 0.8, h: 3.8 },
] as const;

export const B6_EXTENT = { x: 0, y: 0, w: 50.2, h: 23.4 };

export const B6_WALLS: B6Wall[] = [
  { x1: 0, y1: 0, x2: 41, y2: 0, outer: true },
  { x1: 41, y1: 0, x2: 41, y2: 21, outer: true },
  { x1: 5, y1: 21, x2: 41, y2: 21, outer: true },
  { x1: 0, y1: 21, x2: 5, y2: 21, outer: true, parapet: true },
  { x1: 0, y1: 10.5, x2: 0, y2: 21, outer: true, parapet: true },
  { x1: 0, y1: 0, x2: 0, y2: 10.5, outer: true },
  { x1: 0, y1: 10.5, x2: 5, y2: 10.5, outer: true, parapet: true },
  { x1: X0, y1: 0, x2: X0, y2: 10.5 },
  { x1: 15.5, y1: 0, x2: 15.5, y2: 10.5 },
  { x1: 19.5, y1: 0, x2: 19.5, y2: 6 },
  { x1: 26.5, y1: 0, x2: 26.5, y2: 10.5 },
  { x1: 15.5, y1: 6, x2: 26.5, y2: 6 },
  { x1: 5, y1: 10.5, x2: 18.5, y2: 10.5 },
  { x1: 26.5, y1: 10.5, x2: 41, y2: 10.5 },
  { x1: 5, y1: 10.5, x2: 5, y2: 21 },
  { x1: 18.5, y1: 10.5, x2: 18.5, y2: 21 },
  { x1: 18.5, y1: 14.5, x2: 22, y2: 14.5 },
  { x1: 22, y1: 14.5, x2: 22, y2: 21 },
  { x1: 41, y1: 10.5, x2: 42.6, y2: 10.5, outer: true },
  { x1: 42.6, y1: 4, x2: 48.8, y2: 4, outer: true },
  { x1: 42.6, y1: 4, x2: 42.6, y2: 22, outer: true },
  { x1: 48.8, y1: 4, x2: 48.8, y2: 22, outer: true },
  { x1: 42.6, y1: 22, x2: 48.8, y2: 22, outer: true },
];

export function splitB6Walls(walls: B6Wall[] = B6_WALLS, doors: B6Door[] = B6_DOORS): B6Wall[] {
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
    const parts: B6Wall[] = [];
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
