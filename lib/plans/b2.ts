/**
 * Typical-floor B2 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedroom 3 / 5' balcony)
 *   −x = west  (drawing / entrance / corridor)
 *   −y = north (top of drawing / 5'-9" wash)
 *   +y = south (bottom / 5' and 4' balconies)
 *
 * B2 is east of B1, across the corridor. Entrance is from the west
 * corridor into drawing/living. Dining is a separate room. Powder is
 * not a toilet. Corridor and AC ledge are outside B2.
 */

export const B2_META = {
  unit: "B2",
  type: "3BHK-E",
  sbuaSft: 1659,
  carpetSft: 965,
  balconySft: 103,
  floors: "B2 stack · typical floors 5–10",
} as const;

export function isB2Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 2;
}

export type B2Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B2Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B2Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B2Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const WASH_H = 5.75;
const KIT_S = 17.125;
const SOUTH = 34.125;
const EAST = 33.75;

/** Brochure room rectangles, feet. Origin is the west face of kitchen / drawing. */
export const B2_ROOMS: B2Room[] = [
  { id: "wash", label: "Wash", dim: "5'-9\" wide", kind: "utility", x: 0, y: 0, w: 7, h: WASH_H },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "7' × 11'-4½\"",
    kind: "room",
    x: 0,
    y: WASH_H,
    w: 7,
    h: 11.375,
  },
  { id: "toilet-1", label: "Toilet", dim: "8'-6\" × 5'", kind: "wet", x: 7, y: 0, w: 8.5, h: 5 },
  {
    id: "dining",
    label: "Dining",
    dim: "10'-4½\" × 12'",
    kind: "room",
    x: 7,
    y: 5.125,
    w: 10.375,
    h: 12,
  },
  { id: "powder", label: "Powder", dim: "4' × 7'-6\"", kind: "wet", x: 17.375, y: 5, w: 4, h: 7.5 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "12'-6\" × 12'-6\"",
    kind: "room",
    x: 21.375,
    y: 0,
    w: 12.375,
    h: 12.5,
  },
  {
    id: "drawing",
    label: "Drawing / Living",
    dim: "11' × 17'",
    kind: "room",
    x: 0,
    y: KIT_S,
    w: 11,
    h: 17,
  },
  { id: "hall-c", label: "", dim: null, kind: "room", x: 11, y: KIT_S, w: 10.75, h: 6 },
  { id: "hall-e", label: "", dim: null, kind: "room", x: 21.25, y: 12.5, w: 12.5, h: 5.625 },
  { id: "toilet-2", label: "Toilet", dim: "8'-4½\" × 4'-6\"", kind: "wet", x: 21.25, y: 18.125, w: 8.375, h: 4.5 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "10'-9\" × 11'",
    kind: "room",
    x: 11,
    y: 23.125,
    w: 10.75,
    h: 11,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "12' × 11'-6\"",
    kind: "room",
    x: 21.75,
    y: 22.625,
    w: 12,
    h: 11.5,
  },
  { id: "balc-sw", label: "Balcony", dim: "5' wide", kind: "balcony", x: 0, y: SOUTH, w: 11, h: 5 },
  { id: "balc-s", label: "Balcony", dim: "4' wide", kind: "balcony", x: 11, y: SOUTH, w: 10.75, h: 4 },
  { id: "balc-e", label: "Balcony", dim: "5' wide", kind: "balcony", x: EAST, y: 22.625, w: 5, h: 11.5 },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: -1.6, y: KIT_S, w: 1.6, h: 17 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: -7.8, y: 6, w: 6.2, h: 30 },
];

export const B2_DOORS: B2Door[] = [
  { id: "entry", wall: "w", x: 0, y: 22.2, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "s", x: 2.2, y: WASH_H, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "e", x: 7, y: 8.6, length: 2.5, swing: "cw" },
  { id: "toilet-1", wall: "s", x: 9.4, y: 5, length: 2.3, swing: "cw" },
  { id: "powder", wall: "s", x: 18.0, y: 12.5, length: 2.2, swing: "cw" },
  { id: "bed-1", wall: "s", x: 24.6, y: 12.5, length: 2.8, swing: "ccw" },
  { id: "toilet-2", wall: "n", x: 23.6, y: 18.125, length: 2.4, swing: "cw" },
  { id: "bed-2", wall: "n", x: 13.6, y: 23.125, length: 2.8, swing: "cw" },
  { id: "bed-3", wall: "n", x: 25.0, y: 22.625, length: 2.8, swing: "ccw" },
];

export const B2_WINDOWS: B2Window[] = [
  { id: "wash", x: 1.4, y: -0.18, w: 4.2, h: 0.36 },
  { id: "kit", x: -0.18, y: 8.4, w: 0.36, h: 5.2 },
  { id: "bed-1-n", x: 24.4, y: -0.18, w: 6.4, h: 0.36 },
  { id: "bed-1-e", x: 33.57, y: 3.0, w: 0.36, h: 6.2 },
  { id: "draw-s", x: 2.4, y: 33.94, w: 6.2, h: 0.36 },
  { id: "bed-2-s", x: 13.2, y: 33.94, w: 6.4, h: 0.36 },
  { id: "bed-3-s", x: 24.6, y: 33.94, w: 6.2, h: 0.36 },
];

export const B2_OPENINGS = [
  { id: "kit-din", x: 6.6, y: 7.4, w: 0.8, h: 6.2 },
  { id: "din-draw", x: 7.4, y: 16.8, w: 3.4, h: 0.8 },
  { id: "draw-balc", x: 2.2, y: 33.8, w: 6.6, h: 0.7 },
  { id: "bed2-balc", x: 13.2, y: 33.8, w: 6.4, h: 0.7 },
  { id: "bed3-balc", x: 33.5, y: 25.0, w: 0.7, h: 6.4 },
] as const;

export const B2_EXTENT = { x: -8, y: 0, w: 48.5, h: 41.2 };

export const B2_WALLS: B2Wall[] = [
  { x1: 0, y1: 0, x2: 7, y2: 0, outer: true },
  { x1: 7, y1: 0, x2: EAST, y2: 0, outer: true },
  { x1: EAST, y1: 0, x2: EAST, y2: 22.625, outer: true },
  { x1: EAST, y1: 22.625, x2: 38.75, y2: 22.625, outer: true, parapet: true },
  { x1: 38.75, y1: 22.625, x2: 38.75, y2: SOUTH, outer: true, parapet: true },
  { x1: EAST, y1: SOUTH, x2: 38.75, y2: SOUTH, outer: true, parapet: true },
  { x1: 21.75, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: 11, y1: SOUTH, x2: 21.75, y2: SOUTH, outer: true },
  { x1: 0, y1: SOUTH, x2: 11, y2: SOUTH, outer: true },
  { x1: 0, y1: SOUTH, x2: 0, y2: 39.125, outer: true, parapet: true },
  { x1: 11, y1: SOUTH, x2: 11, y2: 39.125, outer: true, parapet: true },
  { x1: 0, y1: 39.125, x2: 11, y2: 39.125, outer: true, parapet: true },
  { x1: 11, y1: SOUTH, x2: 11, y2: 38.125, outer: true, parapet: true },
  { x1: 21.75, y1: SOUTH, x2: 21.75, y2: 38.125, outer: true, parapet: true },
  { x1: 11, y1: 38.125, x2: 21.75, y2: 38.125, outer: true, parapet: true },
  { x1: 0, y1: 0, x2: 0, y2: SOUTH, outer: true },
  { x1: 7, y1: 0, x2: 7, y2: KIT_S },
  { x1: 0, y1: WASH_H, x2: 7, y2: WASH_H },
  { x1: 7, y1: 5, x2: 15.5, y2: 5 },
  { x1: 15.5, y1: 0, x2: 15.5, y2: 5 },
  { x1: 17.375, y1: 5, x2: 21.375, y2: 5 },
  { x1: 17.375, y1: 5, x2: 17.375, y2: 12.5 },
  { x1: 21.375, y1: 0, x2: 21.375, y2: 12.5 },
  { x1: 17.375, y1: 12.5, x2: EAST, y2: 12.5 },
  { x1: 11, y1: KIT_S, x2: 11, y2: SOUTH },
  { x1: 7, y1: KIT_S, x2: 21.25, y2: KIT_S },
  { x1: 21.25, y1: 12.5, x2: 21.25, y2: 22.625 },
  { x1: 21.25, y1: 18.125, x2: 29.625, y2: 18.125 },
  { x1: 29.625, y1: 18.125, x2: 29.625, y2: 22.625 },
  { x1: 21.75, y1: 22.625, x2: EAST, y2: 22.625 },
  { x1: 21.75, y1: 22.625, x2: 21.75, y2: SOUTH },
  { x1: 11, y1: 23.125, x2: 21.75, y2: 23.125 },
  { x1: -1.6, y1: KIT_S, x2: 0, y2: KIT_S, outer: true },
  { x1: -7.8, y1: 6, x2: -1.6, y2: 6, outer: true },
  { x1: -7.8, y1: 6, x2: -7.8, y2: 36, outer: true },
  { x1: -1.6, y1: 6, x2: -1.6, y2: 36, outer: true },
  { x1: -7.8, y1: 36, x2: -1.6, y2: 36, outer: true },
];

export function splitB2Walls(walls: B2Wall[] = B2_WALLS, doors: B2Door[] = B2_DOORS): B2Wall[] {
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
    const parts: B2Wall[] = [];
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
