/**
 * Masterplan massing (brochure roof plan).
 *
 * South facade, west → east:
 *   A1 A2 | clubhouse | B1 B2 | courtyard | B10 B11
 *
 * Clubhouse podium covers A2, A3, B1, and B3 (floors 1–3).
 *
 * Rows south → north:
 *   0  A1 A2 B1 B2 B10 B11
 *   1  A4 A3 B3 B4 B12 B13
 *   2  A6 A5 B5        B14
 *   3  A8 A7 B6 B7 B8 B9 B15
 *   4  A9 A10                 (no B on this row)
 *
 * Dark roof strips are corridor / lift cores between towers.
 * North = −Z, west = −X.
 *
 * First-load screen map (camera from south looking north):
 *   screen left  = east  = wing A  = compound gate side
 *   screen right = west  = wing B
 *   screen bottom = north (near / A1–B11 facade)
 *   screen top    = south (far / A9–A10)
 * Compound CW labels use this screen map (not raw −X/−Z).
 */

const UNIT = 2.12;
const CORR = 1.05;
const BAY = UNIT + CORR;
const GAP_AB = 4.6;
const GAP_COURT = 6.4;
const GAP_CAB_A7 = 1.9;
const CAB_WIDTH = 1.02;

const X = {
  A_W: 0,
  A_E: BAY,
  B_W: BAY + UNIT + GAP_AB,
  B_W2: BAY + UNIT + GAP_AB + BAY,
  B_EW: BAY + UNIT + GAP_AB + BAY + UNIT + GAP_COURT,
  B_EE: BAY + UNIT + GAP_AB + BAY + UNIT + GAP_COURT + BAY,
} as const;

const X_B8 = (X.B_W2 + X.B_EW) / 2;
const B12_WEST = 0.72;

const Z = {
  0: 0,
  1: -BAY,
  2: -BAY * 2,
  3: -BAY * 3,
  4: -BAY * 3 - UNIT - GAP_CAB_A7 - CAB_WIDTH,
} as const;

export const UNIT_FOOTPRINT: Record<string, [number, number]> = {
  A1: [X.A_W, Z[0]],
  A2: [X.A_E, Z[0]],
  A3: [X.A_E, Z[1]],
  A4: [X.A_W, Z[1]],
  A5: [X.A_E, Z[2]],
  A6: [X.A_W, Z[2]],
  A7: [X.A_E, Z[3]],
  A8: [X.A_W, Z[3]],
  A9: [X.A_W, Z[4]],
  A10: [X.A_E, Z[4]],
  B1: [X.B_W, Z[0]],
  B2: [X.B_W2, Z[0]],
  B3: [X.B_W, Z[1]],
  B4: [X.B_W2, Z[1]],
  B5: [X.B_W, Z[2]],
  B6: [X.B_W, Z[3]],
  B7: [X.B_W2, Z[3]],
  B8: [X_B8, Z[3]],
  B9: [X.B_EW, Z[3]],
  B10: [X.B_EW - B12_WEST / 2, Z[0]],
  B11: [X.B_EE, Z[0]],
  B12: [X.B_EW - B12_WEST, Z[1]],
  B13: [X.B_EE, Z[1]],
  B14: [X.B_EE, Z[2]],
  B15: [X.B_EE, Z[3]],
};

export const FOOTPRINT_IDS = Object.keys(UNIT_FOOTPRINT);

export const FLOOR_COUNT = 10;
export const FLOOR_HEIGHT = 1.08;
/** Open stilt / parking level under floor 1 — apartments sit on pillars. */
export const STILT_HEIGHT = FLOOR_HEIGHT;
export const UNIT_SIZE: [number, number, number] = [UNIT, 0.92, UNIT];

/** Slab underside Y for a residential floor (floor 1 sits atop the stilt). */
export function floorBaseY(floor: number) {
  return STILT_HEIGHT + (floor - 1) * FLOOR_HEIGHT;
}

/** Top of the building massing (roof of floor 10). */
export function buildingTopY() {
  return STILT_HEIGHT + FLOOR_COUNT * FLOOR_HEIGHT;
}

const UNIT_PLAN: Record<string, [number, number]> = {
  B10: [UNIT + B12_WEST, UNIT],
};

export function unitPlanSize(id: string): [number, number] {
  return UNIT_PLAN[id] ?? [UNIT, UNIT];
}

export function unitBoxSize(
  wing: string,
  unit: number,
): [number, number, number] {
  const [w, d] = unitPlanSize(`${wing}${unit}`);
  return [w, UNIT_SIZE[1], d];
}

/** Pillars + transfer slabs for the open stilt level under floor 1. */
export const STILT_STRUCTURE = (() => {
  const pillarR = 0.11;
  const slabH = 0.14;
  const inset = 0.32;
  const pillars: {
    id: string;
    position: [number, number, number];
    radius: number;
    height: number;
  }[] = [];
  const slabs: {
    id: string;
    position: [number, number, number];
    size: [number, number, number];
  }[] = [];
  for (const id of FOOTPRINT_IDS) {
    const [x, z] = UNIT_FOOTPRINT[id];
    const [w, d] = unitPlanSize(id);
    slabs.push({
      id,
      position: [x, STILT_HEIGHT - slabH / 2, z],
      size: [w + 0.08, slabH, d + 0.08],
    });
    const corners: [number, number][] = [
      [x - w / 2 + inset, z - d / 2 + inset],
      [x + w / 2 - inset, z - d / 2 + inset],
      [x - w / 2 + inset, z + d / 2 - inset],
      [x + w / 2 - inset, z + d / 2 - inset],
    ];
    corners.forEach(([px, pz], index) => {
      pillars.push({
        id: `${id}-${index}`,
        position: [px, STILT_HEIGHT / 2, pz],
        radius: pillarR,
        height: STILT_HEIGHT,
      });
    });
  }
  return { pillars, slabs, height: STILT_HEIGHT };
})();

function halfX(id: string) {
  return unitPlanSize(id)[0] / 2;
}

function halfZ(id: string) {
  return unitPlanSize(id)[1] / 2;
}

const CORRIDOR_LINE = 0.1;
const WALL_T = 0.07;
const WALL_OPEN = 0.02;

type Corridor = { id: string; x: number; z: number; size: [number, number] };

function aisleSpan(left: string, right: string): [number, number] {
  const lx = UNIT_FOOTPRINT[left][0];
  const rx = UNIT_FOOTPRINT[right][0];
  const westId = lx <= rx ? left : right;
  const eastId = lx <= rx ? right : left;
  return [
    UNIT_FOOTPRINT[westId][0] + halfX(westId),
    UNIT_FOOTPRINT[eastId][0] - halfX(eastId),
  ];
}

function aisleX(left: string, right: string) {
  const [west, east] = aisleSpan(left, right);
  return (west + east) / 2;
}

function aisleWidth(left: string, right: string) {
  const [west, east] = aisleSpan(left, right);
  return Math.max(east - west, CORRIDOR_LINE);
}

function aisleRun(
  id: string,
  southLeft: string,
  southRight: string,
  northLeft: string,
  northRight: string,
  southStop: "face" | "center" = "face",
  northStop: "face" | "south" | "center" = "face",
): Corridor {
  const southCenter = Math.max(
    UNIT_FOOTPRINT[southLeft][1],
    UNIT_FOOTPRINT[southRight][1],
  );
  const southZ = southStop === "center" ? southCenter : southCenter + UNIT / 2;
  const northCenter = Math.min(
    UNIT_FOOTPRINT[northLeft][1],
    UNIT_FOOTPRINT[northRight][1],
  );
  const northZ =
    northStop === "south"
      ? northCenter + UNIT / 2
      : northStop === "center"
        ? northCenter
        : northCenter - UNIT / 2;
  const [southWest, southEast] = aisleSpan(southLeft, southRight);
  const [northWest, northEast] = aisleSpan(northLeft, northRight);
  const west = Math.max(southWest, northWest);
  const east = Math.min(southEast, northEast);
  const width = Math.max(east - west, CORRIDOR_LINE);
  const x = (west + east) / 2;
  return {
    id,
    x,
    z: (southZ + northZ) / 2,
    size: [width, Math.max(southZ - northZ, CORRIDOR_LINE)],
  };
}

function aisleExtendNorth(
  id: string,
  fromLeft: string,
  fromRight: string,
  northId: string,
  aisleLeft = fromLeft,
  aisleRight = fromRight,
): Corridor {
  const southZ =
    Math.min(UNIT_FOOTPRINT[fromLeft][1], UNIT_FOOTPRINT[fromRight][1]) - UNIT / 2;
  // Stop at the target unit's west/east (center Z), not past its north face.
  const northZ = UNIT_FOOTPRINT[northId][1];
  return {
    id,
    x: aisleX(aisleLeft, aisleRight),
    z: (southZ + northZ) / 2,
    size: [
      aisleWidth(aisleLeft, aisleRight),
      Math.max(southZ - northZ, CORRIDOR_LINE),
    ],
  };
}

function gapEW(id: string, left: string, right: string): Corridor {
  const [ax, az] = UNIT_FOOTPRINT[left];
  const [bx, bz] = UNIT_FOOTPRINT[right];
  const west = Math.min(ax, bx) + UNIT / 2;
  const east = Math.max(ax, bx) - UNIT / 2;
  return {
    id,
    x: (west + east) / 2,
    z: (az + bz) / 2,
    size: [Math.max(east - west, CORRIDOR_LINE), UNIT * 0.5],
  };
}

function aToBFromGap(
  aSouth: string,
  aNorth: string,
  bLeft: string,
  bRight: string,
): Corridor[] {
  const west = aisleX("A8", "A7");
  const east = aisleX(bLeft, bRight);
  const widthB = aisleWidth(bLeft, bRight);
  const a7North = UNIT_FOOTPRINT[aSouth][1] - UNIT / 2;
  const abSouth = a7North - GAP_CAB_A7;
  const abNorth = abSouth - CAB_WIDTH;
  const gapZ = Math.max(abSouth - abNorth, CORRIDOR_LINE);
  const zGap = (abSouth + abNorth) / 2;
  const zB = (UNIT_FOOTPRINT[bLeft][1] + UNIT_FOOTPRINT[bRight][1]) / 2;
  const abEast = east + widthB / 2;
  return [
    {
      id: "cAB",
      x: (west + abEast) / 2,
      z: zGap,
      size: [Math.max(abEast - west, CORRIDOR_LINE), gapZ],
    },
    {
      id: "cABj",
      x: east,
      z: (abNorth + zB) / 2,
      size: [widthB, Math.max(zB - abNorth, CORRIDOR_LINE)],
    },
  ];
}

function northFromCorridor(
  id: string,
  from: Corridor,
  target: string,
  aisleLeft: string,
  aisleRight: string,
  hug: "aisle" | "right" = "aisle",
): Corridor {
  const southZ = from.z - from.size[1] / 2 + 0.08;
  const northZ = UNIT_FOOTPRINT[target][1];
  if (hug === "right") {
    const east = UNIT_FOOTPRINT[aisleRight][0] - halfX(aisleRight) - 0.38;
    const width = 1.33;
    return {
      id,
      x: east - width / 2,
      z: (southZ + northZ) / 2,
      size: [width, Math.max(southZ - northZ, CORRIDOR_LINE)],
    };
  }
  return {
    id,
    x: aisleX(aisleLeft, aisleRight),
    z: (southZ + northZ) / 2,
    size: [
      aisleWidth(aisleLeft, aisleRight),
      Math.max(southZ - northZ, CORRIDOR_LINE),
    ],
  };
}

function westFromCorridorToUnit(
  id: string,
  from: Corridor,
  target: string,
): Corridor {
  const [tx, tz] = UNIT_FOOTPRINT[target];
  const west = tx + halfX(target);
  const east = from.x - from.size[0] / 2 + 0.08;
  const width = from.size[0];
  const south = tz + halfZ(target);
  const north = south - width;
  return {
    id,
    x: (west + east) / 2,
    z: (south + north) / 2,
    size: [
      Math.max(east - west, CORRIDOR_LINE),
      Math.max(south - north, CORRIDOR_LINE),
    ],
  };
}

function joinCorridorNEToUnitSW(
  id: string,
  from: Corridor,
  target: string,
): Corridor {
  const [tx, tz] = UNIT_FOOTPRINT[target];
  const west = from.x + from.size[0] / 2 - 0.08;
  const east = tx - halfX(target);
  const north = from.z - from.size[1] / 2;
  const south = tz + halfZ(target);
  return {
    id,
    x: (west + east) / 2,
    z: (south + north) / 2,
    size: [
      Math.max(east - west, CORRIDOR_LINE),
      Math.max(south - north, CORRIDOR_LINE),
    ],
  };
}

const cB5 = gapEW("cB5", "B5", "B14");
const cBe = aisleRun("cBe", "B10", "B11", "B12", "B13");
const cB58 = northFromCorridor("cB58", cB5, "B8", "B7", "B8", "right");
const cB59 = northFromCorridor("cB59", cB5, "B9", "B8", "B9", "right");

export const CORRIDORS: Corridor[] = [
  aisleRun("cA", "A1", "A2", "A9", "A10", "face", "center"),
  aisleRun("cBw", "B1", "B2", "B6", "B7", "center"),
  cBe,
  westFromCorridorToUnit("cBe12", cBe, "B12"),
  aisleExtendNorth("cBeN", "B12", "B13", "B15", "B9", "B15"),
  ...aToBFromGap("A7", "A10", "B6", "B7"),
  cB5,
  cB58,
  joinCorridorNEToUnitSW("cB58j", cB58, "B8"),
  cB59,
  joinCorridorNEToUnitSW("cB59j", cB59, "B9"),
];

function boxOf(c: Corridor) {
  return {
    x0: c.x - c.size[0] / 2,
    x1: c.x + c.size[0] / 2,
    z0: c.z - c.size[1] / 2,
    z1: c.z + c.size[1] / 2,
  };
}

function overlaps(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && a1 > b0;
}

function subtractSpan(span: [number, number], cuts: [number, number][]) {
  let parts: [number, number][] = [span];
  for (const [cut0, cut1] of cuts) {
    const next: [number, number][] = [];
    for (const [start, end] of parts) {
      const left = Math.max(start, cut0);
      const right = Math.min(end, cut1);
      if (left >= right) {
        next.push([start, end]);
        continue;
      }
      if (left - start > 0.02) next.push([start, left]);
      if (end - right > 0.02) next.push([right, end]);
    }
    parts = next;
  }
  return parts;
}

const FLUSH = 0.4;
const FACE = 0;

function apartmentFaceCutsX(wallZ: number, corridorZ: number, x0: number, x1: number) {
  const southSide = wallZ > corridorZ;
  const cuts: [number, number][] = [];
  for (const [id, [ux, uz]] of Object.entries(UNIT_FOOTPRINT)) {
    const west = ux - halfX(id);
    const east = ux + halfX(id);
    if (!overlaps(west, east, x0, x1)) continue;
    const outside = southSide ? uz > wallZ : uz < wallZ;
    if (!outside) continue;
    const innerFace = southSide ? uz - halfZ(id) : uz + halfZ(id);
    if (Math.abs(innerFace - wallZ) > FLUSH) continue;
    cuts.push([west - FACE, east + FACE]);
  }
  return cuts;
}

function apartmentFaceCutsZ(wallX: number, corridorX: number, z0: number, z1: number) {
  const eastSide = wallX > corridorX;
  const cuts: [number, number][] = [];
  for (const [id, [ux, uz]] of Object.entries(UNIT_FOOTPRINT)) {
    const south = uz + halfZ(id);
    const north = uz - halfZ(id);
    if (!overlaps(north, south, z0, z1)) continue;
    const outside = eastSide ? ux > wallX : ux < wallX;
    if (!outside) continue;
    const innerFace = eastSide ? ux - halfX(id) : ux + halfX(id);
    if (Math.abs(innerFace - wallX) > FLUSH) continue;
    cuts.push([north - FACE, south + FACE]);
  }
  return cuts;
}

export const CORRIDOR_WALLS: { x: number; z: number; size: [number, number] }[] = (() => {
  const walls: { x: number; z: number; size: [number, number] }[] = [];
  const boxes = CORRIDORS.map(boxOf);

  function joinCuts(
    along: "x" | "z",
    self: ReturnType<typeof boxOf>,
    thin0: number,
    thin1: number,
    skipIndex: number,
  ) {
    const cuts: [number, number][] = [];
    boxes.forEach((other, otherIndex) => {
      if (otherIndex === skipIndex) return;
      if (along === "x") {
        if (!overlaps(other.z0, other.z1, thin0, thin1)) return;
        if (!overlaps(other.x0, other.x1, self.x0, self.x1)) return;
        cuts.push([other.x0 - WALL_OPEN, other.x1 + WALL_OPEN]);
      } else {
        if (!overlaps(other.x0, other.x1, thin0, thin1)) return;
        if (!overlaps(other.z0, other.z1, self.z0, self.z1)) return;
        cuts.push([other.z0 - WALL_OPEN, other.z1 + WALL_OPEN]);
      }
    });
    return cuts;
  }

  CORRIDORS.forEach((corridor, index) => {
    const self = boxes[index];
    const eastWest =
      corridor.size[0] >= corridor.size[1] ||
      corridor.id === "cB58j" ||
      corridor.id === "cB59j";

    if (eastWest) {
      for (const side of [-1, 1]) {
        const z = corridor.z + side * (corridor.size[1] / 2 + WALL_T / 2);
        const cuts = [
          ...joinCuts("x", self, z - WALL_T / 2, z + WALL_T / 2, index),
        ];
        const fillA7Gap = corridor.id === "cAB" && side === 1;
        if (!fillA7Gap) {
          cuts.push(...apartmentFaceCutsX(z, corridor.z, self.x0, self.x1));
        }
        for (const [x0, x1] of subtractSpan([self.x0, self.x1], cuts)) {
          walls.push({ x: (x0 + x1) / 2, z, size: [x1 - x0, WALL_T] });
        }
      }
      return;
    }

    for (const side of [-1, 1]) {
      const x = corridor.x + side * (corridor.size[0] / 2 + WALL_T / 2);
      const cuts = [
        ...joinCuts("z", self, x - WALL_T / 2, x + WALL_T / 2, index),
      ];
      const keepNorthWest =
        (corridor.id === "cB58" || corridor.id === "cB59") && side === -1;
      if (!keepNorthWest) {
        cuts.push(...apartmentFaceCutsZ(x, corridor.x, self.z0, self.z1));
      }
      for (const [z0, z1] of subtractSpan([self.z0, self.z1], cuts)) {
        walls.push({ x, z: (z0 + z1) / 2, size: [WALL_T, z1 - z0] });
      }
    }
    if (corridor.id === "cB58" || corridor.id === "cB59") {
      walls.push({
        x: corridor.x - WALL_T / 2,
        z: self.z0 - WALL_T / 2,
        size: [corridor.size[0] + WALL_T, WALL_T],
      });
    }
  });

  return walls;
})();

export function footprintKey(wing: string, unit: number) {
  return `${wing}${unit}`;
}

export function unitPosition(wing: string, unit: number, floor: number) {
  const key = footprintKey(wing, unit);
  const [x, z] = UNIT_FOOTPRINT[key] ?? [0, 0];
  const y = floorBaseY(floor) + UNIT_SIZE[1] / 2;
  return [x, y, z] as [number, number, number];
}

export function labelPosition(id: string, focusFloor: number) {
  const [x, z] = UNIT_FOOTPRINT[id] ?? [0, 0];
  const y =
    focusFloor === 0
      ? buildingTopY() + 0.35
      : floorBaseY(focusFloor) + UNIT_SIZE[1] + 0.4;
  return [x, y, z] as [number, number, number];
}

/** Heavy site labels sit just above ground / stilt clearance. */
export function groundLabelY() {
  return 0.85;
}

/** Roof / top of selected floor for unit & corridor labels. */
export function topFloorLabelY(focusFloor = 0) {
  return focusFloor === 0
    ? buildingTopY() + 0.35
    : floorBaseY(focusFloor) + UNIT_SIZE[1] + 0.4;
}

export const SITE_AREA_LABEL_TEXT: Record<string, string> = {
  plot: "Plot",
  plotE: "Plot",
  courtAB: "Court A–B",
  courtB: "Court B",
  bball: "Basketball",
  cricket: "Cricket",
  drive: "Drive",
  park: "Park 3′",
  parkNe: "Park 3′",
  parkLedge: "Park 3′",
  track: "Track 3′",
  trackNe: "Track 3′",
  kids: "Kids Play",
  sit: "Sit Wall",
  wallL16: "L16",
  wallL162: "L162",
  wallL184: "L184",
};

/** Amenity + ground-feature labels — toggled separately from lawn-grid site areas. */
export const AMENITY_LABEL_IDS = new Set([
  "plot",
  "plotE",
  "park",
  "parkNe",
  "parkLedge",
  "track",
  "trackNe",
  "drive",
  "courtAB",
  "courtB",
  "bball",
  "cricket",
  "kids",
  "sit",
]);

/** Numbered amenity map — same number for duplicate markers of one feature. */
export const AMENITY_LEGEND = [
  { n: 1, label: "Plot", ids: ["plot", "plotE"] },
  { n: 2, label: "Court A–B", ids: ["courtAB"] },
  { n: 3, label: "Court B", ids: ["courtB"] },
  { n: 4, label: "Basketball", ids: ["bball"] },
  { n: 5, label: "Cricket", ids: ["cricket"] },
  { n: 6, label: "Drive", ids: ["drive"] },
  { n: 7, label: "Park 3′", ids: ["park", "parkNe", "parkLedge"] },
  { n: 8, label: "Track 3′", ids: ["track", "trackNe"] },
  { n: 9, label: "Kids Play", ids: ["kids"] },
  { n: 10, label: "Sit Wall", ids: ["sit"] },
] as const;

export const AMENITY_NUMBER_BY_ID: Record<string, number> = Object.fromEntries(
  AMENITY_LEGEND.flatMap((entry) => entry.ids.map((id) => [id, entry.n])),
);

/** N = −Z, E = +X, S = +Z, W = −X */
export const FACE_MARKS = [
  { abbr: "n", dx: 0, dz: -1 },
  { abbr: "e", dx: 1, dz: 0 },
  { abbr: "s", dx: 0, dz: 1 },
  { abbr: "w", dx: -1, dz: 0 },
  { abbr: "ne", dx: 1, dz: -1 },
  { abbr: "nw", dx: -1, dz: -1 },
  { abbr: "se", dx: 1, dz: 1 },
  { abbr: "sw", dx: -1, dz: 1 },
] as const;

export function debugMarkPosition(
  id: string,
  dx: number,
  dz: number,
  focusFloor: number,
) {
  const [x, y, z] = labelPosition(id, focusFloor);
  const [w, d] = unitPlanSize(id);
  return [x + dx * w * 0.34, y, z + dz * d * 0.34] as [
    number,
    number,
    number,
  ];
}

export function corridorMarkY(focusFloor: number) {
  return focusFloor === 0
    ? buildingTopY() + 0.2
    : floorBaseY(focusFloor) + UNIT_SIZE[1] + 0.25;
}

/** All face/corner abbrs, spaced along the long axis (never across the narrow width). */
export function corridorDebugMarks(corridor: { size: [number, number] }) {
  const alongZ = corridor.size[1] >= corridor.size[0];
  // t = -1 … 1 along the walkway: north/west first.
  const alongNorthSouth = [
    { abbr: "n", t: -1 },
    { abbr: "nw", t: -5 / 7 },
    { abbr: "ne", t: -3 / 7 },
    { abbr: "w", t: -1 / 7 },
    { abbr: "e", t: 1 / 7 },
    { abbr: "sw", t: 3 / 7 },
    { abbr: "se", t: 5 / 7 },
    { abbr: "s", t: 1 },
  ];
  const alongWestEast = [
    { abbr: "w", t: -1 },
    { abbr: "nw", t: -5 / 7 },
    { abbr: "sw", t: -3 / 7 },
    { abbr: "n", t: -1 / 7 },
    { abbr: "s", t: 1 / 7 },
    { abbr: "ne", t: 3 / 7 },
    { abbr: "se", t: 5 / 7 },
    { abbr: "e", t: 1 },
  ];
  return alongZ ? alongNorthSouth : alongWestEast;
}

export function corridorMarkPosition(
  corridor: { x: number; z: number; size: [number, number] },
  t: number,
  focusFloor: number,
  inset = 0.32,
) {
  const alongZ = corridor.size[1] >= corridor.size[0];
  const y = corridorMarkY(focusFloor);
  if (alongZ) {
    return [corridor.x, y, corridor.z + t * corridor.size[1] * inset] as [
      number,
      number,
      number,
    ];
  }
  return [corridor.x + t * corridor.size[0] * inset, y, corridor.z] as [
    number,
    number,
    number,
  ];
}

/** Just inside each walkway terminus. */
export function corridorEndMarks(corridor: { id: string; size: [number, number] }) {
  if (corridor.id === "cA") {
    return [
      { abbr: "nEnd", t: -1 },
      { abbr: "swEnd", t: 0 },
      { abbr: "sEnd", t: 1 },
    ];
  }
  if (corridor.id === "cBw") {
    return [
      { abbr: "nEnd", t: -1 },
      { abbr: "sEnd", t: 1 },
      { abbr: "sB1e", t: 1 },
      { abbr: "sB2w", t: 1 },
    ];
  }
  if (corridor.id === "cB58") {
    return [
      { abbr: "nEnd", t: -1 },
      { abbr: "swEnd", t: 0 },
      { abbr: "sEnd", t: 1 },
    ];
  }
  if (corridor.id === "cB58j" || corridor.id === "cB59j") {
    return [
      { abbr: "neEnd", t: -1 },
      { abbr: "swEnd", t: 1 },
    ];
  }
  if (corridor.id === "cBe12") {
    return [
      { abbr: "nEnd", t: -1 },
      { abbr: "seEnd", t: 1 },
      { abbr: "sEnd", t: 1 },
    ];
  }
  if (corridor.id === "cB59") {
    return [
      { abbr: "nEnd", t: -1 },
      { abbr: "swEnd", t: 0 },
      { abbr: "sEnd", t: 1 },
    ];
  }
  const alongZ = corridor.size[1] >= corridor.size[0];
  return alongZ
    ? [
        { abbr: "nEnd", t: -1 },
        { abbr: "sEnd", t: 1 },
      ]
    : [
        { abbr: "wEnd", t: -1 },
        { abbr: "eEnd", t: 1 },
      ];
}

export function corridorEndPosition(
  corridor: { id: string; x: number; z: number; size: [number, number] },
  mark: { abbr: string; t: number },
  focusFloor: number,
) {
  if (corridor.id === "cA" && mark.abbr === "nEnd") {
    const [x, z] = UNIT_FOOTPRINT.A10;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z,
    ] as [number, number, number];
  }
  if (corridor.id === "cA" && mark.abbr === "swEnd") {
    const [x, z] = UNIT_FOOTPRINT.A10;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z + UNIT / 2 + 0.06,
    ] as [number, number, number];
  }
  if (corridor.id === "cBw" && mark.abbr === "sEnd") {
    const z = UNIT_FOOTPRINT.B1[1];
    return [corridor.x, corridorMarkY(focusFloor), z] as [number, number, number];
  }
  if (corridor.id === "cBw" && mark.abbr === "sB1e") {
    const [x, z] = UNIT_FOOTPRINT.B1;
    return [
      x + UNIT / 2 + 0.06,
      corridorMarkY(focusFloor),
      z,
    ] as [number, number, number];
  }
  if (corridor.id === "cBw" && mark.abbr === "sB2w") {
    const [x, z] = UNIT_FOOTPRINT.B2;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z,
    ] as [number, number, number];
  }
  if (corridor.id === "cBe12" && mark.abbr === "nEnd") {
    return [
      corridor.x + corridor.size[0] / 2 - 0.06,
      corridorMarkY(focusFloor),
      corridor.z,
    ] as [number, number, number];
  }
  if (corridor.id === "cBe12" && (mark.abbr === "seEnd" || mark.abbr === "sEnd")) {
    const [x, z] = UNIT_FOOTPRINT.B12;
    return [
      x + halfX("B12") + 0.06,
      corridorMarkY(focusFloor),
      z + halfZ("B12") + 0.06,
    ] as [number, number, number];
  }
  if (corridor.id === "cBeN" && mark.abbr === "nEnd") {
    const [x, z] = UNIT_FOOTPRINT.B15;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z,
    ] as [number, number, number];
  }
  if (
    (corridor.id === "cB58j" || corridor.id === "cB59j") &&
    mark.abbr === "neEnd"
  ) {
    return [
      corridor.x - corridor.size[0] / 2 + 0.06,
      corridorMarkY(focusFloor),
      corridor.z - corridor.size[1] / 2 + 0.06,
    ] as [number, number, number];
  }
  if (
    (corridor.id === "cB58j" || corridor.id === "cB59j") &&
    mark.abbr === "swEnd"
  ) {
    const id = corridor.id === "cB58j" ? "B8" : "B9";
    const [x, z] = UNIT_FOOTPRINT[id];
    return [
      x - halfX(id) - 0.06,
      corridorMarkY(focusFloor),
      z + halfZ(id) + 0.06,
    ] as [number, number, number];
  }
  if (corridor.id === "cB58" && mark.abbr === "nEnd") {
    const [x, z] = UNIT_FOOTPRINT.B8;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z,
    ] as [number, number, number];
  }
  if (corridor.id === "cB58" && mark.abbr === "swEnd") {
    const [x, z] = UNIT_FOOTPRINT.B8;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z + UNIT / 2 + 0.06,
    ] as [number, number, number];
  }
  if (corridor.id === "cB59" && mark.abbr === "nEnd") {
    const [x, z] = UNIT_FOOTPRINT.B9;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z,
    ] as [number, number, number];
  }
  if (corridor.id === "cB59" && mark.abbr === "swEnd") {
    const [x, z] = UNIT_FOOTPRINT.B9;
    return [
      x - UNIT / 2 - 0.06,
      corridorMarkY(focusFloor),
      z + UNIT / 2 + 0.06,
    ] as [number, number, number];
  }
  return corridorMarkPosition(corridor, mark.t, focusFloor, 0.47);
}

const cx = (X.A_W + X.B_EE) / 2;
const cz = (Z[0] + Z[4]) / 2;

export const BUILDING_CENTER: [number, number, number] = [cx, 4.2, cz];
// First-load camera at screen NE (east/gate + north/near) = 3D west + south.
export const CAMERA_START: [number, number, number] = [cx - 32, 36, cz + 30];
export const CAMERA_UP: [number, number, number] = [0, 1, 0];

/** Compound footprint (centered on building), plus extra east-side yard. */
const COMPOUND_LW = 37.5;
const COMPOUND_LD = 24.5;
/** Extra yard on screen-south / world-north (seating & kids play side). */
const NORTH_YARD_EXTRA = 2.4;
/** Push east wall outward from apartments (gate end). */
const EAST_GATE_EXTRA = 1.5;
/** Additional yard at CWeEndS (slanted wall, south end). */
const EAST_SOUTH_EXTRA = 4.6;
/** Lawn debug cell size — NE wall is L16→L162 slant + ledge to L184. */
const LAWN_CELL = 1.25;

export const SITE = {
  plot: {
    position: [cx, 0.02, cz] as [number, number, number],
    size: [28.4, 16.4] as [number, number],
  },
  compound: (() => {
    const [lw, ld] = [COMPOUND_LW, COMPOUND_LD];
    const t = 0.18;
    const h = 0.78;
    const gate = 3.4;
    const y = h / 2;
    const hx = lw / 2;
    const hz = ld / 2;
    const westGate = cx - hx - EAST_GATE_EXTRA; // more interior space on east / gate side
    const westWide = westGate - EAST_SOUTH_EXTRA; // still wider at CWeEndS
    const east = cx + hx;
    const north = cz - hz - NORTH_YARD_EXTRA; // more space south of seating / kids play
    const south = cz + hz;
    const gateS = south - 0.15;
    const gateN = gateS - gate;
    // NE wall: L16 (on north) → L162 → L184 (east wall), then south.
    const jogX0 = westWide + 16 * LAWN_CELL; // L16 west edge
    const jogZ0 = north;
    const jogX1 = westWide + 24 * LAWN_CELL; // L162 west edge
    const jogZ1 = north + 5 * LAWN_CELL; // L162 south / L184 north
    // Slanted east wall: wide at south end → tapers to gate.
    const slantDx = westGate - westWide;
    const slantDz = gateN - north;
    const slantLen = Math.hypot(slantDx, slantDz);
    const slantY = Math.atan2(slantDx, slantDz);
    const slantMidX = (westWide + westGate) / 2;
    const slantMidZ = (north + gateN) / 2;
    const southSpan = east - westGate;
    // L16→L162 diagonal (then horizontal ledge to L184 / east).
    const neDx = jogX1 - jogX0;
    const neDz = jogZ1 - jogZ0;
    const neLen = Math.hypot(neDx, neDz);
    const neY = Math.atan2(neDx, neDz);
    // Inward unit normal so wall thickness sits inside (no exterior bulge).
    const neInX = neLen > 0 ? -neDz / neLen : 0;
    const neInZ = neLen > 0 ? neDx / neLen : 1;
    const neMidX = (jogX0 + jogX1) / 2 + neInX * (t / 2);
    const neMidZ = (jogZ0 + jogZ1) / 2 + neInZ * (t / 2);
    const wallSeg = (
      x0: number,
      z0: number,
      x1: number,
      z1: number,
    ): {
      position: [number, number, number];
      size: [number, number, number];
    } => {
      const dx = x1 - x0;
      const dz = z1 - z0;
      if (Math.abs(dx) >= Math.abs(dz)) {
        // Horizontal run: nudge south (+Z) so exterior face is on the boundary.
        return {
          position: [(x0 + x1) / 2, y, z0 + t / 2],
          size: [Math.abs(dx) + t, h, t],
        };
      }
      // Vertical run: nudge west (−X) on east wall / east (+X) handled by caller.
      return {
        position: [x0, y, (z0 + z1) / 2],
        size: [t, h, Math.abs(dz) + t],
      };
    };
    return {
      bounds: {
        west: westGate,
        westWide,
        east,
        north,
        south,
        hx,
        hz,
        h,
        gateW: westGate,
        gateE: westGate,
        gateN,
        gateS,
        /** L16→L162 slant, then ledge to L184 / east wall at z1. */
        jog: { x0: jogX0, z0: jogZ0, x1: jogX1, z1: jogZ1 },
      },
      // Ground fill stays inside the walls (no layout outside L16–L162–L184).
      lawnRing: [
        [westWide, north],
        [jogX0, north],
        [jogX1, jogZ1],
        [east, jogZ1],
        [east, south],
        [westGate, south],
        [westGate, gateN],
      ] as [number, number][],
      walls: [
        // West/B wall from L184 ledge down to south (inset so exterior flush).
        {
          position: [east - t / 2, y, (jogZ1 + south) / 2] as [
            number,
            number,
            number,
          ],
          size: [t, h, south - jogZ1 + t] as [number, number, number],
        },
        // North wall only to L16.
        wallSeg(westWide, north, jogX0, north),
        // Direct L16 → L162 (inset along inward normal).
        {
          position: [neMidX, y, neMidZ] as [number, number, number],
          size: [t, h, neLen] as [number, number, number],
          rotation: [0, neY, 0] as [number, number, number],
        },
        // L162 → L184 (east wall)
        wallSeg(jogX1, jogZ1, east, jogZ1),
        // South wall
        {
          position: [(westGate + east) / 2, y, south] as [number, number, number],
          size: [southSpan + t, h, t] as [number, number, number],
        },
        {
          position: [slantMidX, y, slantMidZ] as [number, number, number],
          size: [t, h, slantLen] as [number, number, number],
          rotation: [0, slantY, 0] as [number, number, number],
        },
        {
          position: [westGate, y, (gateS + south) / 2] as [number, number, number],
          size: [t, h, Math.max(south - gateS, t)] as [number, number, number],
        },
      ],
    };
  })(),
  basketball: (() => {
    // Triangle pad matching CWeEndS: south wall + slanted east wall + closing edge.
    const { west, westWide, north, south, gateN } = (() => {
      const hx = COMPOUND_LW / 2;
      const hz = COMPOUND_LD / 2;
      const westGate = cx - hx - EAST_GATE_EXTRA;
      const westWide = westGate - EAST_SOUTH_EXTRA;
      const north = cz - hz - NORTH_YARD_EXTRA;
      const south = cz + hz;
      const gateN = south - 0.15 - 3.4;
      return { west: westGate, westWide, north, south, gateN };
    })();
    const slantDx = west - westWide;
    const slantDz = gateN - north;
    const slantLen = Math.hypot(slantDx, slantDz);
    const ix = slantDz / slantLen;
    const iz = -slantDx / slantLen;
    const ax = slantDx / slantLen;
    const az = slantDz / slantLen;
    const pad = 0.16;
    const alongSouth = 2.9;
    const alongSlant = 4.6;
    const corner: [number, number] = [
      westWide + pad * ix,
      north + pad + pad * iz,
    ];
    const alongS: [number, number] = [corner[0] + alongSouth, corner[1]];
    const alongE: [number, number] = [
      westWide + ax * alongSlant + pad * ix,
      north + az * alongSlant + pad * iz,
    ];
    const ring = [corner, alongS, alongE] as [number, number][];
    const x = (corner[0] + alongS[0] + alongE[0]) / 3;
    const z = (corner[1] + alongS[1] + alongE[1]) / 3;
    // Face the rim into the triangle (corner → centroid).
    const faceY = Math.atan2(-(z - corner[1]), x - corner[0]);
    const netH = 2.35;
    const posts = [corner, alongS, alongE].map(
      ([px, pz]) => [px, 0, pz] as [number, number, number],
    );
    // Edge panels for cricket-style cage around the triangle.
    const edges = [
      { a: corner, b: alongS },
      { a: alongS, b: alongE },
      { a: alongE, b: corner },
    ].map(({ a, b }) => {
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      return {
        position: [(a[0] + b[0]) / 2, netH / 2, (a[1] + b[1]) / 2] as [
          number,
          number,
          number,
        ],
        rotation: [0, Math.atan2(dx, dz), 0] as [number, number, number],
        size: [0.03, netH, len] as [number, number, number],
      };
    });
    return {
      position: [x, 0.07, z] as [number, number, number],
      rotation: [0, faceY, 0] as [number, number, number],
      ring,
      // Goal post exactly on the triangle / compound corner tip.
      hoop: [corner[0], 0.07, corner[1]] as [number, number, number],
      netH,
      posts,
      edges,
    };
  })(),
  courtAB: {
    position: [(X.A_E + X.B_W) / 2, 0.05, (Z[2] + Z[3]) / 2] as [number, number, number],
    size: [GAP_AB * 0.82, 4.6] as [number, number],
  },
  courtB: {
    position: [X_B8, 0.05, (Z[0] + Z[2]) / 2] as [number, number, number],
    size: [GAP_COURT * 0.92, 7.4] as [number, number],
  },
  clubhouse: (() => {
    const chY = 1.55 + STILT_HEIGHT;
    return {
      position: [
        (X.A_E + X.B_W) / 2,
        chY,
        (Z[0] + Z[1]) / 2,
      ] as [number, number, number],
      size: [X.B_W - X.A_E + UNIT, 3.1, BAY + UNIT] as [
        number,
        number,
        number,
      ],
      court: {
        position: [
          (X.A_E + X.B_W) / 2,
          chY,
          (Z[0] + Z[1]) / 2,
        ] as [number, number, number],
        size: [GAP_AB - 0.04, 3.1, BAY + UNIT] as [number, number, number],
      },
      stacks: ["A2", "A3", "B1", "B3"].map((id) => {
        const [x, z] = UNIT_FOOTPRINT[id];
        return {
          id,
          position: [x, chY, z] as [number, number, number],
          size: [UNIT, 3.1, UNIT] as [number, number, number],
        };
      }),
    };
  })(),
  north: [X.B_EE + 2.6, 0.08, Z[4] - 1.5] as [number, number, number],
};

export const CLUBHOUSE_ID = "CH";
export const COMPOUND_ID = "CW";

export function compoundMarkY() {
  return SITE.compound.bounds.h + 0.55;
}

/** Mid-side marks using first-load screen directions (east = gate / A side). */
export const COMPOUND_FACE_MARKS = [
  { abbr: "n", dx: 0, dz: -1 },
  { abbr: "e", dx: 1, dz: 0 },
  { abbr: "s", dx: 0, dz: 1 },
  { abbr: "w", dx: -1, dz: 0 },
] as const;

/** Map screen-facing dx/dz onto 3D walls (screen east = 3D west, screen north = 3D south). */
export function compoundEastXAtZ(z: number) {
  const { west, westWide, north, south, gateN } = SITE.compound.bounds;
  if (z <= north) return westWide;
  if (z >= gateN) return west;
  const t = (z - north) / (gateN - north);
  return westWide + (west - westWide) * t;
}

export function compoundMarkPosition(dx: number, dz: number) {
  const { west, east, north, south, westWide } = SITE.compound.bounds;
  if (dx > 0 && dz === 0) {
    // Mid of slanted east wall
    return [
      (westWide + west) / 2,
      compoundMarkY(),
      (north + SITE.compound.bounds.gateN) / 2,
    ] as [number, number, number];
  }
  if (dx > 0 && dz > 0) {
    // screen NE = east wall at north end (gate)
    return [west, compoundMarkY(), south] as [number, number, number];
  }
  if (dx > 0 && dz < 0) {
    // screen SE = east wall at south end (wide)
    return [westWide, compoundMarkY(), north] as [number, number, number];
  }
  const x = dx < 0 ? east : cx;
  const z = dz < 0 ? south : dz > 0 ? north : cz;
  return [x, compoundMarkY(), z] as [number, number, number];
}

export function compoundGatePosition() {
  const { west } = SITE.compound.bounds;
  const gate = COMPOUND_GATE;
  return [
    west + 1.15,
    gate.springY + gate.archRise + gate.titleH + 0.35,
    gate.position[2],
  ] as [number, number, number];
}

/** Arch-type compound entry on the east / gate wall opening. */
export const COMPOUND_GATE = (() => {
  const { west, gateN, gateS, h } = SITE.compound.bounds;
  const t = 0.18;
  const opening = gateS - gateN;
  const midZ = (gateN + gateS) / 2;
  const pillarW = 0.42;
  const pillarD = 0.5;
  const pillarH = 1.85;
  const capH = 0.1;
  const archDepth = 0.36;
  const archThick = 0.2;
  const clearSpan = opening - pillarW * 0.15;
  /** Low segmental arch so the title board above stays prominent. */
  const archR = clearSpan * 0.52;
  const archRise = archR * 0.48;
  const springY = pillarH - 0.08;
  const titleH = 1.05;
  const titleW = clearSpan * 1.45;
  const x = west - t * 0.15;
  return {
    position: [x, 0, midZ] as [number, number, number],
    opening,
    clearSpan,
    archR,
    archRise,
    springY,
    archDepth,
    archThick,
    pillarH,
    capH,
    pillarW,
    pillarD,
    titleH,
    titleW,
    /** Local ±Z offsets from mid to pillar centers. */
    pillarOffset: clearSpan / 2 + pillarW * 0.28,
    grilleH: springY - 0.12,
    wallH: h,
  };
})();

/**
 * Extra marks in screen directions.
 * East wall slopes: more apartment gap at CWeEndS, tapers to the gate.
 */
export function compoundExtraMarks() {
  const { west, westWide, east, north, south, gateN, gateS, h } = SITE.compound.bounds;
  const y = h + 0.55;
  const along = 1.15;
  const alongEEndS = 2.4;
  const eWall = west;
  const wWall = east;
  const nWall = south;
  const sWall = north;
  const eAt = (z: number) => compoundEastXAtZ(z);
  return [
    // Screen-north wall (3D south)
    { abbr: "nw3", position: [eWall + (cx - eWall) * 0.5, y, nWall] as [number, number, number] },
    { abbr: "ne3", position: [cx + (wWall - cx) * 0.5, y, nWall] as [number, number, number] },
    { abbr: "nEndE", position: [eWall + along, y, nWall] as [number, number, number] },
    { abbr: "nEndW", position: [wWall - along, y, nWall] as [number, number, number] },
    // Screen-south wall (3D north) — meets wide east end
    { abbr: "sw3", position: [westWide + (cx - westWide) * 0.5, y, sWall] as [number, number, number] },
    { abbr: "se3", position: [cx + (wWall - cx) * 0.5, y, sWall] as [number, number, number] },
    { abbr: "sEndE", position: [westWide + along, y, sWall] as [number, number, number] },
    { abbr: "sEndW", position: [wWall - along, y, sWall] as [number, number, number] },
    // Screen-east wall (slanted)
    {
      abbr: "en3",
      position: [eAt(sWall + (gateN - sWall) * 0.5), y, sWall + (gateN - sWall) * 0.5] as [
        number,
        number,
        number,
      ],
    },
    {
      abbr: "es3",
      position: [eAt(gateS + (nWall - gateS) * 0.5), y, gateS + (nWall - gateS) * 0.5] as [
        number,
        number,
        number,
      ],
    },
    {
      abbr: "eEndS",
      position: [eAt(sWall + alongEEndS), y, sWall + alongEEndS] as [number, number, number],
    },
    {
      abbr: "eEndN",
      position: [eAt(nWall - along), y, nWall - along] as [number, number, number],
    },
    // Screen-west wall (3D east)
    { abbr: "wn3", position: [wWall, y, sWall + (cz - sWall) * 0.5] as [number, number, number] },
    { abbr: "ws3", position: [wWall, y, cz + (nWall - cz) * 0.5] as [number, number, number] },
    { abbr: "wEndS", position: [wWall, y, sWall + along] as [number, number, number] },
    { abbr: "wEndN", position: [wWall, y, nWall - along] as [number, number, number] },
  ];
}

/** Grey compound lawn — fine debug grid of small patches (outside plot, inside walls). */
export const LAWN_PARTS = (() => {
  const { west, westWide, east, north, south, gateN } = SITE.compound.bounds;
  const [pw, pd] = SITE.plot.size;
  const [px, , pz] = SITE.plot.position;
  const pW = px - pw / 2;
  const pE = px + pw / 2;
  const pN = pz - pd / 2;
  const pS = pz + pd / 2;
  const eAt = (z: number) => {
    if (z <= north) return westWide;
    if (z >= gateN) return west;
    return westWide + (west - westWide) * ((z - north) / (gateN - north));
  };
  /** Pre-jog shell (keeps L# indexing stable when NE corner is cut). */
  const inShell = (x: number, z: number) =>
    z >= north && z <= south && x <= east && x >= eAt(z);
  const inCompound = (x: number, z: number) =>
    inShell(x, z) && z >= compoundNorthFace(x) - 1e-6;
  const inPlot = (x: number, z: number) =>
    x >= pW && x <= pE && z >= pN && z <= pS;
  const y = groundLabelY();
  const cell = LAWN_CELL;
  const colors = [
    "#5a5e66",
    "#62666e",
    "#6a6e76",
    "#727680",
    "#5e626a",
    "#666a72",
    "#6e727a",
    "#585c64",
  ];
  const parts: {
    id: string;
    label: string;
    ring: [number, number][];
    color: string;
    position: [number, number, number];
    /** When false, Html label only — no lawn mesh (used on checkered plot). */
    mesh?: boolean;
  }[] = [];
  let index = 0;
  for (let z = north; z < south - 0.05; z += cell) {
    const z1 = Math.min(z + cell, south);
    for (let x = westWide; x < east - 0.05; x += cell) {
      const x1 = Math.min(x + cell, east);
      const mx = (x + x1) / 2;
      const mz = (z + z1) / 2;
      if (!inShell(mx, mz) || inPlot(mx, mz)) continue;
      // Burn L# for NE cells removed by the jog so later amenity IDs stay put.
      if (!inCompound(mx, mz)) {
        index += 1;
        continue;
      }
      // Drop cells whose west edge sits outside the slant.
      const xLeft = Math.max(x, eAt(mz));
      if (xLeft >= x1 - 0.08) continue;
      // Clip ring south of the NE wall so no lawn/label sticks outside.
      const clip = (px: number, pz: number): [number, number] => [
        px,
        Math.max(pz, compoundNorthFace(px) + 0.04),
      ];
      const ring: [number, number][] = [
        clip(xLeft, z),
        clip(x1, z),
        clip(x1, z1),
        clip(xLeft, z1),
      ];
      const zs = ring.map((p) => p[1]);
      if (Math.max(...zs) - Math.min(...zs) < 0.05) {
        index += 1;
        continue;
      }
      const id = `L${index}`;
      const cx = (ring[0][0] + ring[1][0]) / 2;
      const cz = (ring[0][1] + ring[2][1]) / 2;
      // Keep label clearly inside the wall face.
      const labelZ = Math.max(cz, compoundNorthFace(cx) + 0.35);
      parts.push({
        id,
        label: id,
        color: colors[index % colors.length],
        ring,
        position: [cx, y, labelZ],
      });
      index += 1;
    }
  }

  // Open checkered paving between compound wall and apartments (plot / drive).
  // Labels only — do not paint lawn mesh over checkers.
  // Use real unit footprints (not the full AABB) so the open yard on the
  // wall side of B / courtyards still gets L# labels.
  {
    const half = UNIT / 2;
    const footprints = Object.values(UNIT_FOOTPRINT);
    const underApt = (x: number, z: number) => {
      const pad = 0.2;
      return footprints.some(([ux, uz]) => {
        return (
          x >= ux - half - pad &&
          x <= ux + half + pad &&
          z >= uz - half - pad &&
          z <= uz + half + pad
        );
      });
    };

    for (let z = north; z < south - 0.05; z += cell) {
      for (let x = westWide; x < east - 0.05; x += cell) {
        const mx = x + Math.min(cell, east - x) / 2;
        const mz = z + Math.min(cell, south - z) / 2;
        if (!inCompound(mx, mz) || underApt(mx, mz)) continue;
        // Keep clear of park + walking track (labels there flash over the bands).
        const parkTrack = 6 * 0.3048;
        if (mz < compoundNorthFace(mx) + parkTrack + 0.12) continue;
        const near = parts.some(
          (part) =>
            Math.hypot(part.position[0] - mx, part.position[2] - mz) < cell * 0.5,
        );
        if (near) continue;
        const id = `L${index}`;
        parts.push({
          id,
          label: id,
          color: colors[index % colors.length],
          ring: [
            [mx - 0.4, mz - 0.4],
            [mx + 0.4, mz - 0.4],
            [mx + 0.4, mz + 0.4],
            [mx - 0.4, mz + 0.4],
          ],
          position: [mx, y, mz],
          mesh: false,
        });
        index += 1;
      }
    }
  }

  return parts;
})();

/** Toggleable L# label regions — keeps Html count down when only one side is on. */
export type LawnLabelGroup = "n" | "e" | "w" | "s" | "yard";

export const LAWN_LABEL_GROUP_OPTIONS: {
  key: LawnLabelGroup;
  label: string;
}[] = [
  { key: "n", label: "L# north" },
  { key: "e", label: "L# east" },
  { key: "w", label: "L# west" },
  { key: "s", label: "L# south" },
  { key: "yard", label: "L# yard" },
];

export const LAWN_PARTS_BY_GROUP = (() => {
  const { westWide, east, north, south } = SITE.compound.bounds;
  const midX = (westWide + east) / 2;
  const midZ = (north + south) / 2;
  const halfW = (east - westWide) / 2;
  const halfD = (south - north) / 2;
  const groups: Record<
    LawnLabelGroup,
    {
      id: string;
      label: string;
      ring: [number, number][];
      color: string;
      position: [number, number, number];
      mesh?: boolean;
    }[]
  > = { n: [], e: [], w: [], s: [], yard: [] };

  for (const part of LAWN_PARTS) {
    const dx = part.position[0] - midX;
    const dz = part.position[2] - midZ;
    // Open paving next to a wall counts with that edge so one toggle
    // covers wall → apartment (no gap between L# north and L# yard).
    if (part.mesh === false) {
      const nx = Math.abs(dx) / halfW;
      const nz = Math.abs(dz) / halfD;
      if (nx < 0.35 && nz < 0.35) {
        groups.yard.push(part);
      } else if (nz >= nx) {
        groups[dz < 0 ? "n" : "s"].push(part);
      } else {
        groups[dx < 0 ? "e" : "w"].push(part);
      }
      continue;
    }
    if (Math.abs(dz) >= Math.abs(dx)) {
      groups[dz < 0 ? "n" : "s"].push(part);
    } else {
      // Screen-left / gate is −X (east of site).
      groups[dx < 0 ? "e" : "w"].push(part);
    }
  }
  return groups;
})();

/** Non-amenity named site marks (wall corners, etc.). */
export const SITE_MARK_LABEL_IDS = new Set(["wallL16", "wallL162", "wallL184"]);

/** 3 ft park strip + 3 ft walking track inside the compound wall (model units ≈ m). */
export const FT = 0.3048;
export const PARK_WIDTH = 3 * FT;
export const TRACK_WIDTH = 3 * FT;

function compoundEastX(z: number) {
  const { west, westWide, north, gateN } = SITE.compound.bounds;
  if (z <= north) return westWide;
  if (z >= gateN) return west;
  return westWide + (west - westWide) * ((z - north) / (gateN - north));
}

/** North face of compound wall at X (L16→L162 slant + L184 ledge). */
export function compoundNorthFace(x: number) {
  const { north, jog } = SITE.compound.bounds;
  if (x <= jog.x0) return north;
  if (x >= jog.x1) return jog.z1;
  const t = (x - jog.x0) / (jog.x1 - jog.x0);
  return jog.z0 + t * (jog.z1 - jog.z0);
}

/** Inset ring inside compound walls by `dist` (park/track bands). */
export function compoundInsetRing(dist: number): [number, number][] {
  const { west, east, north, south, gateN, jog } = SITE.compound.bounds;
  const n = north + dist;
  const s = south - dist;
  const e = east - dist;
  const wS = west + dist;
  const g = Math.min(gateN, s);
  const wN = compoundEastX(n) + dist;
  // Inward normal of L16→L162 slant (toward compound interior).
  const dx = jog.x1 - jog.x0;
  const dz = jog.z1 - jog.z0;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * dist;
  const nz = (dx / len) * dist;
  const slant0: [number, number] = [jog.x0 + nx, jog.z0 + nz];
  const slant1: [number, number] = [jog.x1 + nx, jog.z1 + nz];
  // Miter: intersect north inset (z=n) with slant-inset line.
  const sdx = slant1[0] - slant0[0];
  const sdz = slant1[1] - slant0[1];
  const tNorth = Math.abs(sdz) > 1e-6 ? (n - slant0[1]) / sdz : 0;
  const cornerL16: [number, number] = [slant0[0] + sdx * tNorth, n];
  // Miter: intersect ledge inset (z=jog.z1+dist) with slant-inset line.
  const tLedge =
    Math.abs(sdz) > 1e-6 ? (jog.z1 + dist - slant0[1]) / sdz : 1;
  const cornerL162: [number, number] = [
    slant0[0] + sdx * tLedge,
    jog.z1 + dist,
  ];
  // [wN,n] → L16 miter → L162 miter → east ledge → south → gate.
  // (No duplicate L16 point — that collapsed parkN16/trackN16 to zero area.)
  return [
    [wN, n],
    cornerL16,
    cornerL162,
    [e, jog.z1 + dist],
    [e, s],
    [wS, s],
    [wS, g],
  ];
}

export const PERIMETER_BANDS = (() => {
  const parkInner = compoundInsetRing(PARK_WIDTH);
  const trackInner = compoundInsetRing(PARK_WIDTH + TRACK_WIDTH);
  const y = groundLabelY();
  const { west, westWide, east, north, south, gateN, jog } = SITE.compound.bounds;

  // Inner short wall column (after kids play → gate): track flush to ISW / kids east face.
  const iswEnds = ["L188", "L295"]
    .map((id) => LAWN_PARTS.find((part) => part.id === id))
    .filter((part): part is (typeof LAWN_PARTS)[number] => Boolean(part));
  const colEast = Math.max(
    ...iswEnds.flatMap((part) => part.ring.map((p) => p[0])),
    LAWN_PARTS.find((part) => part.id === "L108")?.ring[1][0] ?? -6.225,
  );
  const iswInner = colEast; // ISW inner face + track outer edge (no gap)
  const iswZ1 = Math.max(
    ...iswEnds.flatMap((part) => part.ring.map((p) => p[1])),
  );

  // Inset: [wN,n], L16, L162, [e,z1+d], [e,s], [wS,s], [wS,g]
  const pN = parkInner[0][1];
  const pE = parkInner[3][0];
  const pS = parkInner[4][1];
  const tN = trackInner[0][1];
  const tE = trackInner[3][0];
  const tS = trackInner[4][1];
  const eastTrackOuter = iswInner;
  const eastTrackInner = eastTrackOuter + TRACK_WIDTH;
  // Run east track from the north park/track corner through L40→L143
  // up to the arch gate (keep the entry throat clear of park/track fill).
  const eastZ0 = pN;
  const eastZ1 = Math.min(pS, gateN - 0.12);
  const xStart = eastTrackInner;

  const parkXN = parkInner[0][0];
  const parkXS = west + PARK_WIDTH;
  const ledgeZ = jog.z1;
  const ledgeParkZ1 = ledgeZ + PARK_WIDTH;
  // Keep park/track strictly inside the wall face (no bleed into outside beige).
  const wallPad = 0.06;
  const nWall = north + wallPad;
  const ledgeWall = ledgeZ + wallPad;
  const dx = jog.x1 - jog.x0;
  const dz = jog.z1 - jog.z0;
  const len = Math.hypot(dx, dz) || 1;
  const inX = (-dz / len) * wallPad;
  const inZ = (dx / len) * wallPad;
  const slantA: [number, number] = [jog.x0 + inX, jog.z0 + inZ];
  const slantB: [number, number] = [jog.x1 + inX, jog.z1 + inZ];
  const parkL16 = parkInner[1];
  const parkL162 = parkInner[2];
  const trackL16 = trackInner[1];
  const trackL162 = trackInner[2];

  const parkParts: { id: string; ring: [number, number][] }[] = [
    {
      // North stub through L16 corner (L-shaped end, no diagonal gap at L15/L16)
      id: "parkN0",
      ring: [
        [parkXN, nWall],
        [jog.x0, nWall],
        slantA,
        parkL16,
        [parkXN, pN],
      ],
    },
    {
      // Band along L16→L162 slant
      id: "parkNe",
      ring: [slantA, slantB, parkL162, parkL16],
    },
    {
      // L162 corner fill (slant → ledge toward L184)
      id: "parkN162",
      ring: [
        slantB,
        [jog.x1, ledgeWall],
        [jog.x1, ledgeParkZ1],
        parkL162,
      ],
    },
    {
      // Ledge park L162 → L184 / east wall
      id: "parkNledge",
      ring: [
        [jog.x1, ledgeWall],
        [east - wallPad, ledgeWall],
        [east - wallPad, ledgeParkZ1],
        [jog.x1, ledgeParkZ1],
      ],
    },
    {
      id: "parkW",
      ring: [
        [pE, ledgeParkZ1],
        [east - wallPad, ledgeParkZ1],
        [east - wallPad, pS],
        [pE, pS],
      ],
    },
    {
      // Gate/east slant wall — stop before the arch gate opening (no green in gate).
      id: "parkE",
      ring: (() => {
        const z0 = north + wallPad;
        const z1 = Math.min(south - wallPad, gateN - 0.12);
        const steps = 28;
        // Axis +X inset keeps the band inside the slant (no outward Z drift).
        const d0 = wallPad;
        const d1 = wallPad + PARK_WIDTH;
        const outer: [number, number][] = [];
        const inner: [number, number][] = [];
        for (let i = 0; i <= steps; i += 1) {
          const t = i / steps;
          const z = z0 + (z1 - z0) * t;
          const wx = compoundEastX(z);
          outer.push([wx + d0, z]);
          // Close the park→track gap (white/grey L# cells between grass and trackE).
          const base = wx + d1;
          const gap = eastTrackOuter - base;
          const xInner =
            gap > 0.05 && gap < LAWN_CELL * 1.6 ? eastTrackOuter : base;
          inner.push([xInner, z]);
        }
        return [...outer, ...inner.reverse()];
      })(),
    },
    {
      // South park stops short of the gate opening (clear entry throat).
      id: "parkS",
      ring: [
        [Math.max(parkXS, west + PARK_WIDTH + 0.35), pS],
        [east - wallPad, pS],
        [east - wallPad, south - wallPad],
        [Math.max(parkXS, west + PARK_WIDTH + 0.35), south - wallPad],
      ],
    },
  ];

  const ledgeTrackZ1 = ledgeZ + PARK_WIDTH + TRACK_WIDTH;
  const trackParts: { id: string; ring: [number, number][] }[] = [
    {
      // North track stub through L16 corner
      id: "trackS",
      ring: [
        [xStart, pN],
        parkL16,
        trackL16,
        [xStart, tN],
      ],
    },
    {
      id: "trackNe",
      ring: [parkL16, parkL162, trackL162, trackL16],
    },
    {
      id: "trackNledge",
      ring: [
        [trackL162[0], ledgeParkZ1],
        [pE, ledgeParkZ1],
        [pE, ledgeTrackZ1],
        trackL162,
      ],
    },
    {
      id: "trackW",
      ring: [
        [tE, ledgeTrackZ1],
        [pE, ledgeTrackZ1],
        [pE, tS],
        [tE, tS],
      ],
    },
    {
      id: "trackN",
      ring: [
        [xStart, tS],
        [pE, tS],
        [pE, pS],
        [xStart, pS],
      ],
    },
    {
      id: "trackE",
      ring: [
        [eastTrackOuter, eastZ0],
        [eastTrackInner, eastZ0],
        [eastTrackInner, eastZ1],
        [eastTrackOuter, eastZ1],
      ],
    },
  ];

  return {
    park: {
      parts: parkParts,
      label: [
        (east + pE) / 2,
        y,
        north + PARK_WIDTH / 2,
      ] as [number, number, number],
    },
    track: {
      parts: trackParts,
      label: [
        (eastTrackOuter + eastTrackInner) / 2,
        y,
        (eastZ0 + eastZ1) / 2,
      ] as [number, number, number],
    },
    // Keep trunks in the park strip, clear of the walk-track edge.
    treeInset: Math.min(PARK_WIDTH * 0.32, PARK_WIDTH - 0.4),
  };
})();

/** Drive path loop around apartments — flush to walking track and apartment faces (no gaps). */
export const DRIVE_PATH = (() => {
  const byId = Object.fromEntries(
    PERIMETER_BANDS.track.parts.map((part) => [part.id, part.ring]),
  );
  const ringMinX = (ring: [number, number][]) => Math.min(...ring.map((p) => p[0]));
  const ringMaxX = (ring: [number, number][]) => Math.max(...ring.map((p) => p[0]));
  const ringMinZ = (ring: [number, number][]) => Math.min(...ring.map((p) => p[1]));
  const ringMaxZ = (ring: [number, number][]) => Math.max(...ring.map((p) => p[1]));

  // Courtyard / drive hole follows L341→L216→L491→L454→L448→L152→L146→L319
  // (inward corners; south edge to L319/L341 outer faces) so that covered
  // inner area can be walking-track colored.
  const lawnCorner = (
    id: string,
    xSide: "min" | "max",
    zSide: "min" | "max",
    fallback: [number, number],
  ): [number, number] => {
    const part = LAWN_PARTS.find((p) => p.id === id);
    if (!part) return fallback;
    const xs = part.ring.map((p) => p[0]);
    const zs = part.ring.map((p) => p[1]);
    return [
      xSide === "min" ? Math.min(...xs) : Math.max(...xs),
      zSide === "min" ? Math.min(...zs) : Math.max(...zs),
    ];
  };
  const inner: [number, number][] = [
    lawnCorner("L341", "min", "max", [26.275, 1.825]),
    lawnCorner("L216", "min", "max", [26.275, -10.675]),
    lawnCorner("L491", "min", "max", [12.75, -10.9]),
    lawnCorner("L454", "min", "max", [12.75, -13.4]),
    lawnCorner("L448", "min", "max", [5.25, -13.4]),
    lawnCorner("L152", "min", "max", [5.025, -15.675]),
    lawnCorner("L146", "max", "max", [-1.225, -15.675]),
    lawnCorner("L319", "min", "max", [-1.225, 1.825]),
  ];
  const iW = Math.min(...inner.map((p) => p[0]));
  const iE = Math.max(...inner.map((p) => p[0]));
  const iN = Math.min(...inner.map((p) => p[1]));
  const iS = Math.max(...inner.map((p) => p[1]));

  // Outer face = walking-track inner edge (never overlaps park / trees / track).
  const trackInner = compoundInsetRing(PARK_WIDTH + TRACK_WIDTH);
  const oW = byId.trackE ? ringMaxX(byId.trackE) : iW - 3.05;
  const oE = byId.trackW ? ringMinX(byId.trackW) : iE + 3.05;
  const oN = byId.trackS ? ringMaxZ(byId.trackS) : iN - 3.05;
  const oS = byId.trackN ? ringMinZ(byId.trackN) : iS + 3.05;

  // Follow track-inner ring (includes L16→L162 slant inset); pin gate face to trackE.
  const outer: [number, number][] = trackInner.map(
    ([x, z]) => [Math.max(x, oW), z] as [number, number],
  );

  // Keep inner south of the walking track on the wall side.
  const trackNorthAt = (x: number) =>
    compoundNorthFace(x) + PARK_WIDTH + TRACK_WIDTH;
  const driveClear = 0.2;
  const clampedInner: [number, number][] = inner.map(
    ([x, z]) => [x, Math.max(z, trackNorthAt(x) + driveClear)] as [number, number],
  );

  const x = (oW + iW) / 2;
  const z = (oN + oS) / 2;
  return {
    outer,
    inner: clampedInner,
    width: Math.min(iW - oW, oE - iE, iN - oN, oS - iS),
    bounds: { oW, oE, oN, oS, iW, iE, iN, iS },
    position: [x, 0.04, z] as [number, number, number],
    size: [iW - oW, oS - oN] as [number, number],
    label: [x, groundLabelY(), z] as [number, number, number],
  };
})();

/** Trees along compound-wall park strips (north stub, L16→L162 slant, L184 ledge, west/B). */
const _WALL_TREES_RAW = (() => {
  const { east, north, south, west, westWide, gateN, jog } = SITE.compound.bounds;
  const inset = PERIMETER_BANDS.treeInset;
  const spacing = 1.85;
  const trees: { id: string; position: [number, number, number] }[] = [];

  const along = (
    idPrefix: string,
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    inwardX: number,
    inwardZ: number,
  ) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.4) return;
    const count = Math.max(1, Math.round(len / spacing));
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      const x = x0 + dx * t + inwardX * inset;
      const z = z0 + dz * t + inwardZ * inset;
      trees.push({ id: `${idPrefix}-${i}`, position: [x, 0.02, z] });
    }
  };

  // North stub → L16 (inward = +Z) — wide east end uses westWide
  along("n", westWide + 1.2, north, jog.x0, north, 0, 1);
  // L16 → L162 slant (inward = slant normal)
  {
    const dx = jog.x1 - jog.x0;
    const dz = jog.z1 - jog.z0;
    const len = Math.hypot(dx, dz) || 1;
    along("ne", jog.x0, jog.z0, jog.x1, jog.z1, -dz / len, dx / len);
  }
  // L162 ledge → L184 / east wall (inward = +Z)
  along("ledge", jog.x1, jog.z1, east, jog.z1, 0, 1);
  // West/B wall (inward = -X)
  along("w", east, jog.z1 + 0.8, east, south - 0.8, -1, 0);
  // Gate/east slant (inward = +X)
  along("e", westWide, north + 0.8, west, gateN, 1, 0);
  // South wall (inward = -Z)
  along("s", east - 0.8, south, west + 1.2, south, 0, -1);

  const trackE = PERIMETER_BANDS.track.parts.find((part) => part.id === "trackE");
  const tx0 = trackE ? Math.min(...trackE.ring.map((p) => p[0])) : -6.78;
  const tx1 = trackE ? Math.max(...trackE.ring.map((p) => p[0])) : -5.87;
  const tz0 = trackE ? Math.min(...trackE.ring.map((p) => p[1])) : north;
  const gap = 1.75;
  const iswX = (tx0 + tx1) / 2 - TRACK_WIDTH / 2 - 0.07;
  const { iW, iE, iN, iS } = DRIVE_PATH.bounds;

  const blocksTree = (x: number, z: number) => {
    const nearIswSouth =
      z <= tz0 + gap && x >= iswX - 2.8 && x <= tx1 + gap;
    // Only block on axis-aligned track bands (AABB of slant track covers the park).
    const onWalkTrack = PERIMETER_BANDS.track.parts.some((part) => {
      if (part.id === "trackNe" || part.id === "trackN16") return false;
      const xs = part.ring.map((p) => p[0]);
      const zs = part.ring.map((p) => p[1]);
      const pad = 0.12;
      return (
        x >= Math.min(...xs) - pad &&
        x <= Math.max(...xs) + pad &&
        z >= Math.min(...zs) - pad &&
        z <= Math.max(...zs) + pad
      );
    });
    // Must stay inside compound (south of wall face / east of slant).
    if (z < compoundNorthFace(x) + 0.08) return true;
    if (x < compoundEastX(z) + 0.08) return true;
    if (x > east - 0.08 || z > south - 0.08) return true;
    // Block trees that sit under apartment footprints (not the north park ledge).
    const underApt = x >= iW && x <= iE && z >= iN && z <= iS;
    return nearIswSouth || onWalkTrack || underApt;
  };

  return trees.filter((tree) => !blocksTree(tree.position[0], tree.position[2]));
})();

function pointInRing2(
  x: number,
  z: number,
  ring: readonly [number, number][],
  pad = 0.35,
) {
  // Expand ring slightly so trunks clear net posts / cage edges.
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const expanded = ring.map(([px, pz]) => {
    const dx = px - cx;
    const dz = pz - cz;
    const len = Math.hypot(dx, dz) || 1;
    return [px + (dx / len) * pad, pz + (dz / len) * pad] as [number, number];
  });
  let inside = false;
  for (let i = 0, j = expanded.length - 1; i < expanded.length; j = i++) {
    const [xi, zi] = expanded[i];
    const [xj, zj] = expanded[j];
    const hit =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Indoor cricket nets along east compound wall — L105→L197, clear of kids play. */
export const CRICKET_NETS = (() => {
  const ids = ["L105", "L197"] as const;
  const cells = ids
    .map((id) => LAWN_PARTS.find((part) => part.id === id))
    .filter((part): part is (typeof LAWN_PARTS)[number] => Boolean(part));
  const { west, westWide, north, gateN } = SITE.compound.bounds;
  const eAt = (z: number) => {
    if (z <= north) return westWide;
    if (z >= gateN) return west;
    return westWide + (west - westWide) * ((z - north) / (gateN - north));
  };
  const zs = cells.flatMap((part) => part.ring.map((p) => p[1]));
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  // Wide cage; only the north end (beside kids) is clamped to the play west face.
  const kidsWest =
    (LAWN_PARTS.find((part) => part.id === "L174")?.ring[0][0] ?? -9.975) +
    0.55;
  const kidsSouth =
    LAWN_PARTS.find((part) => part.id === "L174")?.ring[2][1] ?? -14.425;
  const clear = 0.08;
  const preferred = 1.5;
  const pad = 0.04;
  const wall0 = eAt(z0) + pad;
  const wall1 = eAt(z1) + pad;
  const width0 = Math.min(preferred, kidsWest - clear - wall0);
  const width1 =
    z1 >= kidsSouth
      ? preferred
      : Math.min(preferred, kidsWest - clear - wall1);
  const inner0 = wall0 + width0;
  const inner1 = wall1 + width1;
  const ring: [number, number][] = [
    [wall0, z0],
    [inner0, z0],
    [inner1, z1],
    [wall1, z1],
  ];
  const x = (wall0 + inner0 + wall1 + inner1) / 4;
  const z = (z0 + z1) / 2;
  const along = Math.hypot(wall1 - wall0, z1 - z0);
  const slantY = Math.atan2(wall1 - wall0, z1 - z0);
  const width = (width0 + width1) / 2;
  return {
    ids: [...ids],
    ring,
    width,
    length: along,
    position: [x, 0.08, z] as [number, number, number],
    rotation: [0, slantY, 0] as [number, number, number],
    posts: [0, 0.33, 0.66, 1].map((t) => {
      const zz = z0 + (z1 - z0) * t;
      const wx = eAt(zz) + pad;
      return [wx, 0, zz] as [number, number, number];
    }),
    label: [x, groundLabelY(), z] as [number, number, number],
  };
})();

/** Wall trees with cricket / basketball cages and gate throat cleared. */
export const WALL_TREES = _WALL_TREES_RAW.filter((tree) => {
  const [x, , z] = tree.position;
  if (pointInRing2(x, z, SITE.basketball.ring, 0.55)) return false;
  if (pointInRing2(x, z, CRICKET_NETS.ring, 0.45)) return false;
  const { west, gateN, gateS } = SITE.compound.bounds;
  if (
    x <= west + PARK_WIDTH + TRACK_WIDTH + 0.6 &&
    z >= gateN - 0.4 &&
    z <= gateS + 0.5
  ) {
    return false;
  }
  return true;
});

/** Short inner wall along east lawn column — starts after kids play (L188→L295).
 *  Inner (+x) face sits on the column’s east edge so the walk track is flush. */
export const INNER_SHORT_WALL = (() => {
  const endIds = ["L188", "L295"] as const;
  const ends = endIds
    .map((id) => LAWN_PARTS.find((part) => part.id === id))
    .filter((part): part is (typeof LAWN_PARTS)[number] => Boolean(part));
  const xMid = ends[0]?.position[0] ?? -6.85;
  const zLo = Math.min(...ends.map((part) => part.position[2]));
  const zHi = Math.max(...ends.map((part) => part.position[2]));
  const cells = LAWN_PARTS.filter(
    (part) =>
      Math.abs(part.position[0] - xMid) < 0.35 &&
      part.position[2] >= zLo - 0.7 &&
      part.position[2] <= zHi + 0.7,
  );
  const zs = cells.flatMap((part) => part.ring.map((p) => p[1]));
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const eastFace = Math.max(
    ...cells.flatMap((part) => part.ring.map((p) => p[0])),
    ends[0] ? Math.max(...ends[0].ring.map((p) => p[0])) : -6.225,
  );
  // Thin wall: inner face flush with column east edge / walk-track outer edge.
  const t = 0.14;
  const h = 0.42;
  const length = z1 - z0;
  const x = eastFace - t / 2;
  const z = (z0 + z1) / 2;
  const y = h / 2;
  const labelY = h + 0.35;
  return {
    id: "ISW",
    ids: cells.map((part) => part.id),
    endIds: [...endIds],
    position: [x, y, z] as [number, number, number],
    size: [t, h, length] as [number, number, number],
    labels: [
      {
        abbr: "s",
        position: [x, labelY, z0 + 0.35] as [number, number, number],
      },
      {
        abbr: "",
        position: [x, labelY, z] as [number, number, number],
      },
      {
        abbr: "n",
        position: [x, labelY, z1 - 0.35] as [number, number, number],
      },
    ],
  };
})();

/** Kids play area — sitting wall on L37–L39/L72/L74/L106–L108 south to L174.
 *  North edge stays inside the walking track so park + track keep clear space
 *  to the compound wall (screen-south / world-north of the seating).
 *  Round seating + tree on the inner (+x) side near L174/L176. */
export const KIDS_PLAY_AREA = (() => {
  const wallIds = [
    "L37",
    "L38",
    "L39",
    "L72",
    "L74",
    "L106",
    "L107",
    "L108",
    "L174",
  ] as const;
  const cells = wallIds
    .map((id) => LAWN_PARTS.find((part) => part.id === id))
    .filter((part): part is (typeof LAWN_PARTS)[number] => Boolean(part));
  const xs = cells.flatMap((part) => part.ring.map((p) => p[0]));
  const zs = cells.flatMap((part) => part.ring.map((p) => p[1]));
  // Keep east face on the track/ISW line; pull west face in a bit to slim the pad.
  const widthInset = 0.55;
  const x0 = Math.min(...xs) + widthInset;
  // East edge from the play column (L108 / L142), not only L174’s west cell.
  const eastCol =
    LAWN_PARTS.find((part) => part.id === "L108") ??
    LAWN_PARTS.find((part) => part.id === "L39");
  const x1 = eastCol
    ? Math.max(...eastCol.ring.map((p) => p[0]))
    : Math.max(...xs);
  // Keep seating clear of park + track at the compound's north wall.
  const clearN =
    SITE.compound.bounds.north + PARK_WIDTH + TRACK_WIDTH;
  const z0 = Math.max(Math.min(...zs), clearN);
  // End at L174 (not L186): south face through the middle of the L174 row.
  const cell174 = LAWN_PARTS.find((part) => part.id === "L174");
  const cell186 = LAWN_PARTS.find((part) => part.id === "L186");
  const z1 = cell174 ? cell174.position[2] : Math.max(...zs);
  const t = 0.22;
  const h = 0.38;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const walls = [
    {
      position: [cx, h / 2, z0 + t / 2] as [number, number, number],
      size: [x1 - x0, h, t] as [number, number, number],
    },
    {
      position: [cx, h / 2, z1 - t / 2] as [number, number, number],
      size: [x1 - x0, h, t] as [number, number, number],
    },
    {
      position: [x0 + t / 2, h / 2, cz] as [number, number, number],
      size: [t, h, z1 - z0 - 2 * t] as [number, number, number],
    },
    {
      position: [x1 - t / 2, h / 2, cz] as [number, number, number],
      size: [t, h, z1 - z0 - 2 * t] as [number, number, number],
    },
  ];
  // Fill lawn tint inside the play rectangle — include L174 row, exclude L186+.
  const fillIds = LAWN_PARTS.filter((part) => {
    const [px, , pz] = part.position;
    const partZ0 = Math.min(...part.ring.map((p) => p[1]));
    const stopZ = cell186
      ? Math.min(...cell186.ring.map((p) => p[1]))
      : z1 + 0.7;
    return (
      px >= x0 - 0.05 &&
      px <= x1 + 0.05 &&
      pz >= z0 - 0.05 &&
      pz <= z1 + 0.7 &&
      partZ0 < stopZ
    );
  }).map((part) => part.id);

  const seatR = 0.48;
  const seatX = x1 - seatR - 0.34;
  const seatZ = z1 - seatR - 0.35;

  return {
    ids: fillIds.length > 0 ? fillIds : [...wallIds],
    walls,
    pad: {
      position: [cx, 0.05, cz] as [number, number, number],
      size: [x1 - x0 - 2 * t, z1 - z0 - 2 * t] as [number, number],
    },
    roundSeat: {
      position: [seatX, 0.08, seatZ] as [number, number, number],
      radius: seatR,
      benchHeight: 0.28,
      benchThick: 0.12,
    },
    tree: {
      position: [seatX, 0.02, seatZ] as [number, number, number],
    },
    label: [cx, groundLabelY(), cz] as [number, number, number],
    wallLabel: [cx, h + 0.35, z0 + t / 2] as [number, number, number],
  };
})();

/** Inner open areas — placed in clear gaps, not on tower/clubhouse centers. */
export const SITE_AREA_LABELS = (() => {
  const [pw, pd] = SITE.plot.size;
  const [px, , pz] = SITE.plot.position;
  const plotWest = px - pw / 2;
  const plotSouth = pz + pd / 2;
  const y = groundLabelY();
  const inset = 1.15;
  return [
    {
      id: "plot",
      position: [cx, y, plotSouth - inset] as [number, number, number],
    },
    {
      id: "plotE",
      position: [plotWest + inset * 1.4, y, pz] as [number, number, number],
    },
    {
      id: "courtAB",
      position: [
        SITE.courtAB.position[0],
        y,
        SITE.courtAB.position[2],
      ] as [number, number, number],
    },
    {
      id: "courtB",
      position: [
        SITE.courtB.position[0],
        y,
        SITE.courtB.position[2],
      ] as [number, number, number],
    },
    {
      id: "bball",
      position: [
        SITE.basketball.position[0],
        y,
        SITE.basketball.position[2],
      ] as [number, number, number],
    },
    {
      id: "cricket",
      position: CRICKET_NETS.label,
    },
    {
      id: "drive",
      position: DRIVE_PATH.label,
    },
    {
      id: "park",
      position: PERIMETER_BANDS.park.label,
    },
    {
      id: "parkNe",
      position: (() => {
        const { jog } = SITE.compound.bounds;
        const x = (jog.x0 + jog.x1) / 2;
        const z = (jog.z0 + jog.z1) / 2;
        const dx = jog.x1 - jog.x0;
        const dz = jog.z1 - jog.z0;
        const len = Math.hypot(dx, dz) || 1;
        return [
          x + (-dz / len) * (PARK_WIDTH * 0.45),
          y,
          z + (dx / len) * (PARK_WIDTH * 0.45),
        ] as [number, number, number];
      })(),
    },
    {
      id: "parkLedge",
      position: (() => {
        const { jog, east } = SITE.compound.bounds;
        return [
          (jog.x1 + east) / 2,
          y,
          jog.z1 + PARK_WIDTH * 0.45,
        ] as [number, number, number];
      })(),
    },
    {
      id: "track",
      position: PERIMETER_BANDS.track.label,
    },
    {
      id: "trackNe",
      position: (() => {
        const { jog } = SITE.compound.bounds;
        const x = (jog.x0 + jog.x1) / 2;
        const z = (jog.z0 + jog.z1) / 2;
        const dx = jog.x1 - jog.x0;
        const dz = jog.z1 - jog.z0;
        const len = Math.hypot(dx, dz) || 1;
        const d = PARK_WIDTH + TRACK_WIDTH * 0.45;
        return [
          x + (-dz / len) * d,
          y,
          z + (dx / len) * d,
        ] as [number, number, number];
      })(),
    },
    {
      id: "wallL16",
      position: (() => {
        const { jog } = SITE.compound.bounds;
        return [jog.x0, y, jog.z0 + 0.7] as [number, number, number];
      })(),
    },
    {
      id: "wallL162",
      position: (() => {
        const { jog } = SITE.compound.bounds;
        return [jog.x1, y, jog.z1 + 0.7] as [number, number, number];
      })(),
    },
    {
      id: "wallL184",
      position: (() => {
        const { jog, east } = SITE.compound.bounds;
        return [east - 0.9, y, jog.z1 + 0.7] as [number, number, number];
      })(),
    },
    {
      id: "kids",
      position: KIDS_PLAY_AREA.label,
    },
    {
      id: "sit",
      position: KIDS_PLAY_AREA.wallLabel,
    },
  ] as const;
})();

const CLUBHOUSE_PODIUM_FLOORS = 3;

export function isClubhousePodiumFlat(
  wing: string,
  unit: number,
  floor: number,
) {
  if (floor > CLUBHOUSE_PODIUM_FLOORS) return false;
  const [x, z] = UNIT_FOOTPRINT[`${wing}${unit}`] ?? [Number.NaN, Number.NaN];
  const [cx, , cz] = SITE.clubhouse.position;
  const [sx, , sz] = SITE.clubhouse.size;
  const pad = UNIT / 2 - 0.04;
  return (
    x - pad >= cx - sx / 2 &&
    x + pad <= cx + sx / 2 &&
    z - pad >= cz - sz / 2 &&
    z + pad <= cz + sz / 2
  );
}

export function clubhouseMarkY() {
  return SITE.clubhouse.position[1] + SITE.clubhouse.size[1] / 2 + 0.75;
}

export function clubhouseMarkPosition(dx: number, dz: number) {
  const [x, , z] = SITE.clubhouse.position;
  const [sx, , sz] = SITE.clubhouse.size;
  return [
    x + dx * sx * 0.34,
    clubhouseMarkY(),
    z + dz * sz * 0.34,
  ] as [number, number, number];
}
