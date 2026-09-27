/**
 * Typical-floor B7 (3BHK-E) from the RV Uddiipta brochure typical plate.
 * Drawing axes match the community 3D compass — apartment is not rotated:
 *   +x = east  (bedroom 1 / 4'-6" balcony / toilet stack)
 *   −x = west  (living / kitchen / west corridor)
 *   −y = north (top of drawing / 5'-6" wash / balcony)
 *   +y = south (bottom / bedrooms 2–3 / south corridor / entrance)
 *
 * B7 is east of B6. Common corridors run west and south of the flat.
 * The double-door entrance is on the south side of the living, at the
 * lower-central wall facing the south corridor. West/south corridors
 * and the AC ledge stay outside B7. Room sizes are brochure labels.
 * Dining stays a separate zone. Three toilets stay separate.
 */

export const B7_META = {
  unit: "B7",
  type: "3BHK-E",
  sbuaSft: 1474,
  carpetSft: 881,
  balconySft: 147,
  floors: "B7 stack · typical floors 5–10",
} as const;

export function isB7Unit(input: { wing?: string; unit?: number | string }) {
  return input.wing === "B" && Number(input.unit) === 7;
}

export type B7Room = {
  id: string
  label: string
  dim: string | null
  kind: "room" | "wet" | "balcony" | "utility" | "corridor"
  x: number
  y: number
  w: number
  h: number
};

export type B7Door = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type B7Window = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type B7Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

const WASH = 5.5;
const KIT_S = 13.5;
const LIVE_S = 24.5;
const SOUTH = 34.5;
const LIVE_E = 16.25;
const EAST = 28.875;
const T_W = 8.5;
const T1_S = 19.5;
const T2_S = 23.5;

/** Brochure room rectangles, feet. Origin is the west face of wash / kitchen / living. */
export const B7_ROOMS: B7Room[] = [
  { id: "wash", label: "Wash", dim: "5'-6\" wide", kind: "utility", x: 0, y: 0, w: 7, h: WASH },
  {
    id: "kitchen",
    label: "Kitchen",
    dim: "7' × 8'",
    kind: "room",
    x: 0,
    y: WASH,
    w: 7,
    h: 8,
  },
  {
    id: "dining",
    label: "Dining",
    dim: "9'-3\" × 9'",
    kind: "room",
    x: 7,
    y: 4.5,
    w: 9.25,
    h: 9,
  },
  {
    id: "bed-1",
    label: "Bedroom 1",
    dim: "12'-7½\" × 10'-6\"",
    kind: "room",
    x: LIVE_E,
    y: 4.5,
    w: 12.625,
    h: 10.5,
  },
  { id: "balc-n", label: "Balcony", dim: "4'-6\" wide", kind: "balcony", x: LIVE_E, y: 0, w: 12.625, h: 4.5 },
  { id: "toilet-1", label: "Toilet", dim: "8'-6\" × 4'-6\"", kind: "wet", x: LIVE_E, y: 15, w: T_W, h: 4.5 },
  { id: "toilet-2", label: "Toilet", dim: "8'-6\" × 4'", kind: "wet", x: LIVE_E, y: T1_S, w: T_W, h: 4 },
  { id: "hall-e", label: "", dim: null, kind: "room", x: 24.75, y: 15, w: 4.125, h: 9.5 },
  {
    id: "living",
    label: "Living room",
    dim: "16'-3\" × 11'",
    kind: "room",
    x: 0,
    y: KIT_S,
    w: LIVE_E,
    h: 11,
  },
  { id: "hall-s", label: "", dim: null, kind: "room", x: LIVE_E, y: T2_S, w: T_W, h: 1 },
  {
    id: "bed-2",
    label: "Bedroom 2",
    dim: "11' × 10'",
    kind: "room",
    x: 0,
    y: LIVE_S,
    w: 11,
    h: 10,
  },
  {
    id: "bed-3",
    label: "Bedroom 3",
    dim: "13' × 10'",
    kind: "room",
    x: 11,
    y: LIVE_S,
    w: 13,
    h: 10,
  },
  { id: "toilet-3", label: "Toilet", dim: "4'-6\" × 10'", kind: "wet", x: 24, y: LIVE_S, w: 4.875, h: 10 },
  { id: "ac-ledge", label: "", dim: null, kind: "utility", x: -1.6, y: KIT_S, w: 1.6, h: 21 },
  { id: "corridor-w", label: "Common corridor", dim: null, kind: "corridor", x: -7.6, y: 8, w: 6, h: 32.5 },
  { id: "corridor-s", label: "Common corridor", dim: null, kind: "corridor", x: -7.6, y: SOUTH, w: 38.1, h: 6 },
];

export const B7_DOORS: B7Door[] = [
  { id: "entry-l", wall: "w", x: 0, y: 21.2, length: 1.65, swing: "ccw", entrance: true },
  { id: "entry-r", wall: "w", x: 0, y: 22.85, length: 1.65, swing: "cw" },
  { id: "wash", wall: "s", x: 2.2, y: WASH, length: 2.4, swing: "cw" },
  { id: "kitchen", wall: "e", x: 7, y: 8.2, length: 2.5, swing: "cw" },
  { id: "bed-1", wall: "s", x: 17.2, y: 15, length: 2.8, swing: "ccw" },
  { id: "toilet-1", wall: "w", x: LIVE_E, y: 15.6, length: 2.3, swing: "cw" },
  { id: "toilet-2", wall: "w", x: LIVE_E, y: 20.1, length: 2.3, swing: "ccw" },
  { id: "toilet-3", wall: "w", x: 24, y: 27.4, length: 2.4, swing: "cw" },
  { id: "bed-2", wall: "n", x: 3.6, y: LIVE_S, length: 2.8, swing: "cw" },
  { id: "bed-3", wall: "n", x: 14.4, y: LIVE_S, length: 2.8, swing: "ccw" },
];

export const B7_WINDOWS: B7Window[] = [
  { id: "wash", x: 1.3, y: -0.18, w: 4.4, h: 0.36 },
  { id: "bed-1-n", x: 18.4, y: -0.18, w: 7.2, h: 0.36 },
  { id: "bed-2-s", x: 2.0, y: 34.32, w: 6.4, h: 0.36 },
  { id: "bed-3-s", x: 13.6, y: 34.32, w: 7.2, h: 0.36 },
];

export const B7_OPENINGS = [
  { id: "kit-din", x: 6.6, y: 7.8, w: 0.8, h: 4.4 },
  { id: "din-live", x: 7.4, y: 13.1, w: 6.8, h: 0.8 },
  { id: "bed1-balc", x: 18.4, y: 4.2, w: 7.2, h: 0.7 },
] as const;

export const B7_EXTENT = { x: -8, y: -2, w: 42, h: 44 };

export const B7_WALLS: B7Wall[] = [
  { x1: 0, y1: 0, x2: 7, y2: 0, outer: true },
  { x1: 7, y1: 0, x2: 7, y2: 4.5, outer: true },
  { x1: 7, y1: 4.5, x2: LIVE_E, y2: 4.5, outer: true },
  { x1: LIVE_E, y1: 0, x2: EAST, y2: 0, outer: true, parapet: true },
  { x1: EAST, y1: 0, x2: EAST, y2: 4.5, outer: true, parapet: true },
  { x1: EAST, y1: 4.5, x2: EAST, y2: SOUTH, outer: true },
  { x1: 0, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: 0, y1: 0, x2: 0, y2: SOUTH, outer: true },
  { x1: 7, y1: 0, x2: 7, y2: KIT_S },
  { x1: 0, y1: WASH, x2: 7, y2: WASH },
  { x1: 7, y1: 4.5, x2: 7, y2: KIT_S },
  { x1: LIVE_E, y1: 4.5, x2: LIVE_E, y2: LIVE_S },
  { x1: LIVE_E, y1: 4.5, x2: EAST, y2: 4.5 },
  { x1: LIVE_E, y1: 15, x2: 24.75, y2: 15 },
  { x1: LIVE_E, y1: T1_S, x2: 24.75, y2: T1_S },
  { x1: LIVE_E, y1: T2_S, x2: 24.75, y2: T2_S },
  { x1: 24.75, y1: 15, x2: 24.75, y2: LIVE_S },
  { x1: 0, y1: LIVE_S, x2: EAST, y2: LIVE_S },
  { x1: 11, y1: LIVE_S, x2: 11, y2: SOUTH },
  { x1: 24, y1: LIVE_S, x2: 24, y2: SOUTH },
  { x1: -1.6, y1: KIT_S, x2: 0, y2: KIT_S, outer: true },
  { x1: -7.6, y1: 8, x2: -1.6, y2: 8, outer: true },
  { x1: -7.6, y1: 8, x2: -7.6, y2: 40.5, outer: true },
  { x1: -1.6, y1: 8, x2: -1.6, y2: SOUTH, outer: true },
  { x1: -7.6, y1: SOUTH, x2: EAST, y2: SOUTH, outer: true },
  { x1: EAST, y1: SOUTH, x2: EAST, y2: 40.5, outer: true },
  { x1: -7.6, y1: 40.5, x2: EAST, y2: 40.5, outer: true },
];

export function splitB7Walls(walls: B7Wall[] = B7_WALLS, doors: B7Door[] = B7_DOORS): B7Wall[] {
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
    const parts: B7Wall[] = [];
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
