/**
 * Typical-floor A8 (3BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (drawing / entrance / staircase lobby)
 *   −x = west  (utility / 5' balcony / open side)
 *   −y = north (top of drawing / kitchen)
 *   +y = south (bottom / bedrooms)
 *
 * A8 is on the western A-block row. Entrance is from the east lobby
 * into the drawing room. Staircase lobby and corridor are outside A8.
 * Puja has no readable brochure dimension — drawn without a size label.
 */

export const A8_META = {
  unit: "A8",
  type: "3BHK-W",
  sbuaSft: 1650,
  carpetSft: 1022,
  balconySft: 140,
  floors: "A8 stack · typical floors 5–10",
} as const;

export function isA8Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "A" && Number(input.unit) === 8;
}

export type A8Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type A8Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type A8Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type A8Wall = {
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
export const A8_ROOMS: A8Room[] = [
  { id: "utility", label: "Utility", dim: "4' wide", kind: "utility", x: 1, y: 0, w: 4, h: 18 },
  {
    id: "kitchen",
    label: "Kitchen / Dining",
    dim: "10' × 18'",
    kind: "room",
    x: X0,
    y: 0,
    w: 10,
    h: 18,
  },
  { id: "toilet-1", label: "Toilet", dim: "4' × 6'", kind: "wet", x: 15, y: 0, w: 4, h: 6 },
  { id: "toilet-2", label: "Toilet", dim: "4'-9\" × 7'-9\"", kind: "wet", x: 19, y: 0, w: 4.75, h: 7.75 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "13' × 11'-6\"",
    kind: "room",
    x: 23.75,
    y: 0,
    w: 13,
    h: 11.5,
  },
  {
    id: "drawing",
    label: "Drawing",
    dim: "11'-3\" × 14'-7½\"",
    kind: "room",
    x: 25.5,
    y: 11.5,
    w: 11.25,
    h: 14.625,
  },
  { id: "puja", label: "Puja", dim: null, kind: "room", x: X0, y: 14.5, w: 5, h: 3.5 },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: 18, w: 5, h: 13 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "10' × 13'",
    kind: "room",
    x: X0,
    y: 18,
    w: 10,
    h: 13,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "10'-6\" × 13'",
    kind: "room",
    x: 15,
    y: 18,
    w: 10.5,
    h: 13,
  },
  { id: "toilet-3", label: "Toilet", dim: "11'-3\" × 4'-6\"", kind: "wet", x: 25.5, y: 26.125, w: 11.25, h: 4.5 },
  { id: "lobby", label: "Staircase lobby", dim: null, kind: "corridor", x: 36.75, y: 0, w: 8.5, h: 14.5 },
  { id: "corridor", label: "", dim: null, kind: "corridor", x: 45.25, y: 6, w: 5, h: 20 },
];

export const A8_DOORS: A8Door[] = [
  // East wall of the drawing, at the south edge of the staircase lobby.
  { id: "entry", wall: "e", x: 36.75, y: 11.7, length: 2.8, swing: "ccw", entrance: true },
  // South end of the utility, just north of the puja — opens into the kitchen.
  { id: "utility", wall: "w", x: X0, y: 12, length: 2.4, swing: "cw" },
  // East side of the puja, swinging into the kitchen. Not into bedroom 2.
  { id: "puja", wall: "w", x: 10, y: 15.1, length: 2.2, swing: "cw" },
  { id: "toilet-1", wall: "s", x: 15.7, y: 6, length: 2.2, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 20.2, y: 7.75, length: 2.3, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 28.2, y: 11.5, length: 3, swing: "ccw" },
  // East of the puja, into the dining side of the kitchen — not through the puja.
  { id: "bed-2", wall: "n", x: 11.2, y: 18, length: 2.6, swing: "cw" },
  { id: "bed-3", wall: "n", x: 16.2, y: 18, length: 2.6, swing: "ccw" },
  { id: "toilet-3", wall: "n", x: 28.6, y: 26.125, length: 2.5, swing: "cw" },
  // West wall of bedroom 2, near its north end, into the 5' balcony.
  { id: "balcony", wall: "w", x: X0, y: 19.2, length: 2.6, swing: "cw" },
];

export const A8_WINDOWS: A8Window[] = [
  { id: "kit", x: 6.8, y: -0.18, w: 5.2, h: 0.36 },
  { id: "bed-1", x: 26.6, y: -0.18, w: 6.2, h: 0.36 },
  { id: "util", x: 0.82, y: 4.2, w: 0.36, h: 6.2 },
  { id: "bed-2", x: 4.82, y: 23, w: 0.36, h: 5.2 },
  { id: "bed-3", x: 17.4, y: 30.82, w: 6.2, h: 0.36 },
];

/** Open floor east of the kitchen and west of the drawing, south of the north toilets. */
export const A8_OPENINGS = [
  { id: "hall", x: 15, y: 6, w: 10.5, h: 12 },
] as const;

export const A8_EXTENT = { x: 0, y: 0, w: 52.5, h: 33.2 };

export const A8_WALLS: A8Wall[] = [
  { x1: 1, y1: 0, x2: 36.75, y2: 0, outer: true },
  { x1: 36.75, y1: 0, x2: 36.75, y2: 30.625, outer: true },
  { x1: 25.5, y1: 30.625, x2: 36.75, y2: 30.625, outer: true },
  { x1: 5, y1: 31, x2: 25.5, y2: 31, outer: true },
  { x1: 0, y1: 31, x2: 5, y2: 31, outer: true, parapet: true },
  { x1: 0, y1: 18, x2: 0, y2: 31, outer: true, parapet: true },
  { x1: 0, y1: 18, x2: 1, y2: 18, outer: true, parapet: true },
  { x1: 1, y1: 0, x2: 1, y2: 18, outer: true },
  { x1: 5, y1: 0, x2: 5, y2: 31 },
  { x1: 1, y1: 18, x2: 5, y2: 18 },
  { x1: 15, y1: 0, x2: 15, y2: 6 },
  { x1: 15, y1: 18, x2: 15, y2: 31 },
  { x1: 19, y1: 0, x2: 19, y2: 6 },
  { x1: 23.75, y1: 0, x2: 23.75, y2: 11.5 },
  { x1: 15, y1: 6, x2: 19, y2: 6 },
  { x1: 19, y1: 7.75, x2: 23.75, y2: 7.75 },
  { x1: 23.75, y1: 11.5, x2: 36.75, y2: 11.5 },
  { x1: 5, y1: 18, x2: 25.5, y2: 18 },
  { x1: 5, y1: 14.5, x2: 10, y2: 14.5 },
  { x1: 10, y1: 14.5, x2: 10, y2: 18 },
  { x1: 25.5, y1: 18, x2: 25.5, y2: 31 },
  { x1: 25.5, y1: 26.125, x2: 36.75, y2: 26.125 },
  { x1: 36.75, y1: 0, x2: 45.25, y2: 0, outer: true },
  { x1: 45.25, y1: 0, x2: 45.25, y2: 14.5, outer: true },
  { x1: 36.75, y1: 14.5, x2: 45.25, y2: 14.5, outer: true },
];

export function splitA8Walls(walls: A8Wall[] = A8_WALLS, doors: A8Door[] = A8_DOORS): A8Wall[] {
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
    const parts: A8Wall[] = [];
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
