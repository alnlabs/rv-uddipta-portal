/**
 * Typical-floor B3 (2BHK-W) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (living / entrance / staircase lobby)
 *   −x = west  (4' wash / 5' balcony / open side)
 *   −y = north (top of drawing / kitchen)
 *   +y = south (bottom / bedroom 2 / living)
 *
 * B3 is on the western B-block row, south of B5, immediately west of the
 * staircase lobby. Entrance is from the east lobby into the living room.
 * Lobby and corridor are outside B3. Brochure table: 2BHK-W, not 3BHK.
 * Room sizes are brochure labels only.
 */

export const B3_META = {
  unit: "B3",
  type: "2BHK-W",
  sbuaSft: 1160,
  carpetSft: 686,
  balconySft: 115,
  floors: "B3 stack · typical floors 4–10",
} as const;

export function isB3Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 3;
}

export type B3Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B3Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B3Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B3Wall = {
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
export const B3_ROOMS: B3Room[] = [
  { id: "wash", label: "Wash", dim: "4' wide", kind: "utility", x: 0, y: 0, w: 4, h: 13 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "7' × 13'",
    kind: "room",
    x: X0,
    y: 0,
    w: 7,
    h: 13,
  },
  { id: "toilet-1", label: "Toilet", dim: "4' × 6'", kind: "wet", x: 11, y: 0, w: 4, h: 6 },
  { id: "toilet-2", label: "Toilet", dim: "4'-3\" × 8'-6\"", kind: "wet", x: 15, y: 0, w: 4.25, h: 8.5 },
  { id: "hall", label: "", dim: null, kind: "room", x: 11, y: 6, w: 8.25, h: 7 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "11' × 13'",
    kind: "room",
    x: 19.25,
    y: 0,
    w: 11,
    h: 13,
  },
  { id: "balc-w", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: 13, w: 5, h: 12 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "10'-7½\" × 12'",
    kind: "room",
    x: 5,
    y: 13,
    w: 10.625,
    h: 12,
  },
  {
    id: "living",
    label: "Living room",
    dim: "16' × 12'",
    kind: "room",
    x: 14.25,
    y: 13,
    w: 16,
    h: 12,
  },
  { id: "puja", label: "Puja", dim: "3'-6\" × 6'-6\"", kind: "room", x: X0, y: 6.5, w: 3.5, h: 6.5 },
  { id: "lobby", label: "Staircase lobby", dim: null, kind: "corridor", x: 30.25, y: 0, w: 9.5, h: 18 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: 39.75, y: 6, w: 5.2, h: 20 },
];

export const B3_DOORS: B3Door[] = [
  { id: "entry", wall: "e", x: 30.25, y: 16.2, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "w", x: X0, y: 3.2, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "s", x: 7.0, y: 13, length: 2.6, swing: "cw" },
  { id: "puja", wall: "e", x: 7.5, y: 8.4, length: 2.2, swing: "ccw" },
  { id: "toilet-1", wall: "s", x: 11.7, y: 6, length: 2.3, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 16.1, y: 8.5, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 22.2, y: 13, length: 2.8, swing: "ccw" },
  { id: "bed-2", wall: "n", x: 7.6, y: 13, length: 2.8, swing: "cw" },
];

export const B3_WINDOWS: B3Window[] = [
  { id: "kit", x: 6.4, y: -0.18, w: 3.4, h: 0.36 },
  { id: "wash", x: -0.18, y: 3.4, w: 0.36, h: 5.4 },
  { id: "bed-1", x: 21.8, y: -0.18, w: 5.6, h: 0.36 },
  { id: "bed-2", x: 4.82, y: 15.8, w: 0.36, h: 5.8 },
];

/** Hall south of the toilets — kitchen / living circulation. */
export const B3_OPENINGS = [
  { id: "hall-live", x: 15.625, y: 12.7, w: 4.8, h: 0.8 },
  { id: "kit-hall", x: 10.7, y: 8.2, w: 0.8, h: 4.4 },
] as const;

export const B3_EXTENT = { x: 0, y: 0, w: 45.8, h: 27.2 };

export const B3_WALLS: B3Wall[] = [
  { x1: 0, y1: 0, x2: 30.25, y2: 0, outer: true },
  { x1: 30.25, y1: 0, x2: 30.25, y2: 25, outer: true },
  { x1: 5, y1: 25, x2: 30.25, y2: 25, outer: true },
  { x1: 0, y1: 25, x2: 5, y2: 25, outer: true, parapet: true },
  { x1: 0, y1: 13, x2: 0, y2: 25, outer: true, parapet: true },
  { x1: 0, y1: 0, x2: 0, y2: 13, outer: true },
  { x1: 0, y1: 13, x2: 5, y2: 13, outer: true, parapet: true },
  { x1: X0, y1: 0, x2: X0, y2: 13 },
  { x1: 11, y1: 0, x2: 11, y2: 13 },
  { x1: 15, y1: 0, x2: 15, y2: 8.5 },
  { x1: 19.25, y1: 0, x2: 19.25, y2: 13 },
  { x1: 11, y1: 6, x2: 19.25, y2: 6 },
  { x1: 15, y1: 8.5, x2: 19.25, y2: 8.5 },
  { x1: 5, y1: 13, x2: 15.625, y2: 13 },
  { x1: 19.25, y1: 13, x2: 30.25, y2: 13 },
  { x1: 5, y1: 13, x2: 5, y2: 25 },
  { x1: 15.625, y1: 13, x2: 15.625, y2: 25 },
  { x1: X0, y1: 6.5, x2: 7.5, y2: 6.5 },
  { x1: 7.5, y1: 6.5, x2: 7.5, y2: 13 },
  { x1: 30.25, y1: 0, x2: 39.75, y2: 0, outer: true },
  { x1: 39.75, y1: 0, x2: 39.75, y2: 6, outer: true },
  { x1: 30.25, y1: 18, x2: 39.75, y2: 18, outer: true },
  { x1: 39.75, y1: 6, x2: 44.95, y2: 6, outer: true },
  { x1: 39.75, y1: 6, x2: 39.75, y2: 26, outer: true },
  { x1: 44.95, y1: 6, x2: 44.95, y2: 26, outer: true },
  { x1: 39.75, y1: 26, x2: 44.95, y2: 26, outer: true },
];

export function splitB3Walls(walls: B3Wall[] = B3_WALLS, doors: B3Door[] = B3_DOORS): B3Wall[] {
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
    const parts: B3Wall[] = [];
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
