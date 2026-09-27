/**
 * Typical-floor B4 (2BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedroom 2 / 5' balcony)
 *   −x = west  (living / entrance / corridor)
 *   −y = north (top of drawing / 4' wash)
 *   +y = south (bottom / living / puja)
 *
 * B4 is east of B3, across the corridor. Entrance is from the west
 * corridor into the living room. Lift, shaft and staircase are north
 * of B4 and stay outside the apartment. Room sizes are brochure labels.
 */

export const B4_META = {
  unit: "B4",
  type: "2BHK-E",
  sbuaSft: 1206,
  carpetSft: 734,
  balconySft: 99,
  floors: "B4 stack · typical floors 5–10",
} as const;

export function isB4Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 4;
}

export type B4Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B4Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B4Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B4Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const MID = 11;
const SOUTH = 22.25;
const EAST = 34;

/** Brochure room rectangles, feet. Origin is the west face of kitchen / living. */
export const B4_ROOMS: B4Room[] = [
  { id: "wash", label: "Wash", dim: "4' wide", kind: "utility", x: 0, y: 0, w: 10, h: 4 },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "10' × 7'",
    kind: "room",
    x: 0,
    y: 4,
    w: 10,
    h: 7,
  },
  { id: "toilet-1", label: "Toilet", dim: "4'½\"×6'", kind: "wet", x: 10, y: 0, w: 4.5, h: 6 },
  { id: "toilet-2", label: "Toilet", dim: "6' × 7'-3\"", kind: "wet", x: 14.5, y: 0, w: 6, h: 7.25 },
  { id: "hall", label: "", dim: null, kind: "room", x: 10, y: 6, w: 10.5, h: 5 },
  { id: "circ", label: "", dim: null, kind: "room", x: 18, y: MID, w: 3.75, h: 5.25 },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "13'-6\" × 11'",
    kind: "room",
    x: 20.5,
    y: 0,
    w: 13.5,
    h: 11,
  },
  {
    id: "living",
    label: "Living room",
    dim: "18' × 11'-3\"",
    kind: "room",
    x: 0,
    y: MID,
    w: 18,
    h: 11.25,
  },
  { id: "puja", label: "Puja", dim: "3'-9\" × 6'", kind: "room", x: 18, y: 16.25, w: 3.75, h: 6 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "12'-6\" × 10'-10½\"",
    kind: "room",
    x: 21.75,
    y: 11.375,
    w: 12.25,
    h: 10.875,
  },
  { id: "balc-e", label: "Balcony", dim: "5' wide", kind: "balcony", x: EAST, y: 11.375, w: 5, h: 10.875 },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: -1.6, y: MID, w: 1.6, h: 11.25 },
  { id: "corridor", label: "Common corridor", dim: null, kind: "corridor", x: -7.6, y: 6, w: 6, h: 18 },
  { id: "lobby-n", label: "", dim: null, kind: "corridor", x: 0.3, y: -10.2, w: 33.9, h: 10.2 },
  { id: "lift", label: "", dim: null, kind: "room", x: 0.3, y: -8.6, w: 6.4, h: 6.4 },
  { id: "shaft", label: "", dim: null, kind: "utility", x: 16.2, y: -8, w: 4.6, h: 5.6 },
  { id: "stairs", label: "", dim: null, kind: "room", x: 24, y: -10.2, w: 10.2, h: 10.2 },
];

export const B4_DOORS: B4Door[] = [
  { id: "entry", wall: "w", x: 0, y: 14.6, length: 3.2, swing: "ccw", entrance: true },
  { id: "wash", wall: "s", x: 3.6, y: 4, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "n", x: 3.8, y: MID, length: 2.6, swing: "cw" },
  { id: "toilet-1", wall: "s", x: 11.0, y: 6, length: 2.3, swing: "cw" },
  { id: "toilet-2", wall: "s", x: 16.2, y: 7.25, length: 2.4, swing: "ccw" },
  { id: "bed-1", wall: "s", x: 24.2, y: MID, length: 2.8, swing: "ccw" },
  { id: "puja", wall: "n", x: 18.6, y: 16.25, length: 2.2, swing: "ccw" },
  { id: "bed-2", wall: "w", x: 21.75, y: 13.4, length: 2.8, swing: "cw" },
];

export const B4_WINDOWS: B4Window[] = [
  { id: "wash", x: 2.4, y: -0.18, w: 5.2, h: 0.36 },
  { id: "bed-1", x: 23.6, y: -0.18, w: 6.8, h: 0.36 },
  { id: "bed-2", x: 33.82, y: 13.8, w: 0.36, h: 6.2 },
];

export const B4_OPENINGS = [
  { id: "kit-live", x: 9.6, y: 7.2, w: 0.8, h: 3.6 },
  { id: "hall-live", x: 10.2, y: 10.7, w: 6.4, h: 0.8 },
  { id: "bed2-balc", x: 33.7, y: 13.8, w: 0.7, h: 6.2 },
] as const;

export const B4_EXTENT = { x: -8, y: -11, w: 49, h: 35.4 };

export const B4_WALLS: B4Wall[] = [
  { x1: 0, y1: 0, x2: EAST, y2: 0, outer: true },
  { x1: EAST, y1: 0, x2: EAST, y2: 11.375, outer: true },
  { x1: EAST, y1: 11.375, x2: 39, y2: 11.375, outer: true, parapet: true },
  { x1: 39, y1: 11.375, x2: 39, y2: SOUTH, outer: true, parapet: true },
  { x1: EAST, y1: SOUTH, x2: 39, y2: SOUTH, outer: true, parapet: true },
  { x1: 0, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: SOUTH, outer: true },
  { x1: 10, y1: 0, x2: 10, y2: MID },
  { x1: 0, y1: 4, x2: 10, y2: 4 },
  { x1: 14.5, y1: 0, x2: 14.5, y2: 7.25 },
  { x1: 20.5, y1: 0, x2: 20.5, y2: MID },
  { x1: 10, y1: 6, x2: 14.5, y2: 6 },
  { x1: 14.5, y1: 7.25, x2: 20.5, y2: 7.25 },
  { x1: 0, y1: MID, x2: 10, y2: MID },
  { x1: 10, y1: MID, x2: 20.5, y2: MID },
  { x1: 21.75, y1: MID, x2: EAST, y2: MID },
  { x1: 18, y1: 16.25, x2: 21.75, y2: 16.25 },
  { x1: 18, y1: 16.25, x2: 18, y2: SOUTH },
  { x1: 21.75, y1: 11.375, x2: 21.75, y2: SOUTH },
  { x1: -1.6, y1: MID, x2: 0, y2: MID, outer: true },
  { x1: -7.6, y1: 6, x2: -1.6, y2: 6, outer: true },
  { x1: -7.6, y1: 6, x2: -7.6, y2: 24, outer: true },
  { x1: -1.6, y1: 6, x2: -1.6, y2: 24, outer: true },
  { x1: -7.6, y1: 24, x2: -1.6, y2: 24, outer: true },
  { x1: 0.3, y1: -10.2, x2: 24, y2: -10.2, outer: true },
  { x1: 0.3, y1: -10.2, x2: 0.3, y2: -8.6, outer: true },
  { x1: 0.3, y1: -8.6, x2: 6.7, y2: -8.6, outer: true },
  { x1: 0.3, y1: -8.6, x2: 0.3, y2: 0, outer: true },
  { x1: 6.7, y1: -8.6, x2: 6.7, y2: 0, outer: true },
  { x1: 16.2, y1: -8, x2: 20.8, y2: -8, outer: true },
  { x1: 16.2, y1: -8, x2: 16.2, y2: 0, outer: true },
  { x1: 20.8, y1: -8, x2: 20.8, y2: 0, outer: true },
  { x1: 24, y1: -10.2, x2: 34.2, y2: -10.2, outer: true },
  { x1: 24, y1: -10.2, x2: 24, y2: 0, outer: true },
  { x1: 34.2, y1: -10.2, x2: 34.2, y2: 0, outer: true },
];

export function splitB4Walls(walls: B4Wall[] = B4_WALLS, doors: B4Door[] = B4_DOORS): B4Wall[] {
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
    const parts: B4Wall[] = [];
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
