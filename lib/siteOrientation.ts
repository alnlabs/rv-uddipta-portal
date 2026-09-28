/**
 * Real-world directions for the community 3D site.
 *
 * World axes are unchanged: +X, +Y up, +Z.
 * The compound gate sits on the −X wall (see SITE.compound.bounds.west
 * and COMPOUND_GATE). That wall is EAST.
 *
 * Canonical compass (looking north / +Z):
 *   N up, E right (gate), S down, W left.
 *
 * Standing at the gate looking into the site (west / +X), north is
 * right-hand +Z (A1–B11 facade).
 */
export const SITE_ORIENTATION = {
  gateDirection: "E",
  east: { x: -1, z: 0 },
  west: { x: 1, z: 0 },
  north: { x: 0, z: 1 },
  south: { x: 0, z: -1 },
} as const;

export const CARDINAL_LABEL = {
  N: "N",
  E: "E",
  S: "S",
  W: "W",
} as const;

export const CARDINALS = [
  { id: CARDINAL_LABEL.N, ...SITE_ORIENTATION.north },
  { id: CARDINAL_LABEL.E, ...SITE_ORIENTATION.east },
  { id: CARDINAL_LABEL.S, ...SITE_ORIENTATION.south },
  { id: CARDINAL_LABEL.W, ...SITE_ORIENTATION.west },
] as const;

export type CardinalId = (typeof CARDINALS)[number]["id"];

/** Face / intercardinal marks derived from SITE_ORIENTATION (n = north, e = east). */
export const SITE_FACE_MARKS = [
  { abbr: "n", dx: SITE_ORIENTATION.north.x, dz: SITE_ORIENTATION.north.z },
  { abbr: "e", dx: SITE_ORIENTATION.east.x, dz: SITE_ORIENTATION.east.z },
  { abbr: "s", dx: SITE_ORIENTATION.south.x, dz: SITE_ORIENTATION.south.z },
  { abbr: "w", dx: SITE_ORIENTATION.west.x, dz: SITE_ORIENTATION.west.z },
  {
    abbr: "ne",
    dx: SITE_ORIENTATION.north.x + SITE_ORIENTATION.east.x,
    dz: SITE_ORIENTATION.north.z + SITE_ORIENTATION.east.z,
  },
  {
    abbr: "nw",
    dx: SITE_ORIENTATION.north.x + SITE_ORIENTATION.west.x,
    dz: SITE_ORIENTATION.north.z + SITE_ORIENTATION.west.z,
  },
  {
    abbr: "se",
    dx: SITE_ORIENTATION.south.x + SITE_ORIENTATION.east.x,
    dz: SITE_ORIENTATION.south.z + SITE_ORIENTATION.east.z,
  },
  {
    abbr: "sw",
    dx: SITE_ORIENTATION.south.x + SITE_ORIENTATION.west.x,
    dz: SITE_ORIENTATION.south.z + SITE_ORIENTATION.west.z,
  },
] as const;

export function cardinalIdForDir(dirX: number, dirZ: number): CardinalId {
  let best: CardinalId = CARDINAL_LABEL.N;
  let bestDot = Number.NEGATIVE_INFINITY;
  for (const item of CARDINALS) {
    const dot = item.x * dirX + item.z * dirZ;
    if (dot > bestDot) {
      bestDot = dot;
      best = item.id;
    }
  }
  return best;
}

/**
 * Clockwise degrees from screen-up for a world XZ direction.
 * Screen-up is the flattened look (toward the orbit target).
 * Screen-right is (−lookZ, lookX), the Y-up camera right.
 */
export function cardinalScreenAngleDeg(
  dirX: number,
  dirZ: number,
  lookX: number,
  lookZ: number,
): number {
  const rightX = -lookZ;
  const rightZ = lookX;
  const sx = dirX * rightX + dirZ * rightZ;
  const sy = dirX * lookX + dirZ * lookZ;
  return (Math.atan2(sx, sy) * 180) / Math.PI;
}
