/**
 * Walk-mode collision: block solids, allow empty space, climb stair treads.
 */
import {
  COMPOUND_GATE,
  CORRIDORS,
  FLOOR_COUNT,
  FLOOR_HEIGHT,
  FOOTPRINT_IDS,
  LIFT_BE5,
  SITE,
  STAIR_A4,
  STAIR_A8,
  STAIR_B3,
  STAIR_BN7,
  STAIR_U,
  STILT_STRUCTURE,
  STILT_HEIGHT,
  UNIT_FOOTPRINT,
  UNIT_SIZE,
  buildingTopY,
  floorBaseY,
  ftToScene,
  unitPlanSize,
} from "@/lib/layout3d";
import {
  LIFT_CABIN_H,
  WALK_LIFTS,
  findWalkLift,
  getLiftOpenings,
  type WalkLiftDef,
} from "@/lib/liftRide";
import {
  buildWalkFlatFloorPads,
  buildWalkFlatWallSolids,
  isWalkableStack,
} from "@/lib/walkFlatInterior";

const DECK = 0.2;
/** Footprint radius — keep narrow so stair mouths stay enterable. */
export const WALK_RADIUS = ftToScene(0.55);
/**
 * One stair riser — never skip treads in a single move.
 * (U-stair ≈ FLOOR_HEIGHT/16; B3 ≈ FLOOR_HEIGHT/32.)
 */
const STAIR_RISER = FLOOR_HEIGHT / 16 + 0.02;
/** Flat curb onto a corridor deck (thicker than a stair riser). */
const DECK_STEP = DECK + 0.05;
const MAX_STEP_DOWN = FLOOR_HEIGHT + DECK + 0.2;
/** Keep lift / wall colliders from sealing stair doors. */
const SOLID_INSET = 0.08;
/** Horizontal substeps so fast moves still hit each tread. */
const MOVE_SUBSTEP = WALK_RADIUS * 0.9;

type AabbSolid = {
  kind: "aabb"
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  minY: number
  maxY: number
};

type SegSolid = {
  kind: "seg"
  x0: number
  z0: number
  x1: number
  z1: number
  halfW: number
  minY: number
  maxY: number
};

type CylinderSolid = {
  kind: "cyl"
  x: number
  z: number
  radius: number
  minY: number
  maxY: number
};

type Solid = AabbSolid | SegSolid | CylinderSolid;

type Surface = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  y: number
};

/** Horizontal pad where lift / unit / pillar blockers are ignored so stair mouths stay usable. */
type OpenZone = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
};

function pushOpenZone(
  list: OpenZone[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  if (maxX - minX < 1e-4 || maxZ - minZ < 1e-4) return;
  list.push({
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ),
  });
}

function inOpenZone(x: number, z: number, zones: OpenZone[]) {
  for (const zone of zones) {
    if (
      x >= zone.minX &&
      x <= zone.maxX &&
      z >= zone.minZ &&
      z <= zone.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function stairLevelBaseY(floor: number) {
  // Match mesh: ground-floor run starts at y=0 (no extra curb before treads).
  return floor <= 0 ? 0 : floorBaseY(floor) + DECK;
}

/** Walkable deck top after climbing from `fromFloor` (not the slab underside). */
function stairArrivalY(fromFloor: number) {
  if (fromFloor < FLOOR_COUNT) return stairLevelBaseY(fromFloor + 1);
  return stairLevelBaseY(fromFloor) + FLOOR_HEIGHT;
}

function pushAabb(
  list: Solid[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  minY: number,
  maxY: number,
) {
  if (maxX - minX < 1e-4 || maxZ - minZ < 1e-4 || maxY - minY < 1e-4) return;
  list.push({
    kind: "aabb",
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ),
    minY,
    maxY,
  });
}

function pushSurface(
  list: Surface[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  y: number,
) {
  if (maxX - minX < 1e-4 || maxZ - minZ < 1e-4) return;
  list.push({
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ),
    y,
  });
}

function buildCompoundSolids(): Solid[] {
  const solids: Solid[] = [];
  const top = buildingTopY() + 1;
  for (const wall of SITE.compound.walls) {
    const [px, , pz] = wall.position;
    const [sx, , sz] = wall.size;
    const rot = "rotation" in wall ? wall.rotation : null;
    if (rot && Math.abs(rot[1]) > 1e-3) {
      const yaw = rot[1];
      const alongX = Math.sin(yaw);
      const alongZ = Math.cos(yaw);
      const half = sz / 2;
      solids.push({
        kind: "seg",
        x0: px - alongX * half,
        z0: pz - alongZ * half,
        x1: px + alongX * half,
        z1: pz + alongZ * half,
        halfW: sx / 2 + 0.02,
        minY: 0,
        maxY: Math.max(wall.size[1] + 0.2, top * 0.15),
      });
      continue;
    }
    pushAabb(
      solids,
      px - sx / 2,
      px + sx / 2,
      pz - sz / 2,
      pz + sz / 2,
      0,
      Math.max(wall.size[1] + 0.2, 1.2),
    );
  }
  return solids;
}

function buildUnitSolids(): Solid[] {
  const solids: Solid[] = [];
  const top = buildingTopY() + 0.4;
  for (const id of FOOTPRINT_IDS) {
    // CAD stacks are hollow — wall segments from walkFlatInterior.
    if (isWalkableStack(id)) continue;
    const [cx, cz] = UNIT_FOOTPRINT[id];
    const [w, d] = unitPlanSize(id);
    // Open stilt under floor 1 — mass starts at the first slab.
    pushAabb(
      solids,
      cx - w / 2,
      cx + w / 2,
      cz - d / 2,
      cz + d / 2,
      STILT_HEIGHT - 0.05,
      top,
    );
  }
  return solids;
}

function buildFlatInteriorSolids(): Solid[] {
  const solids: Solid[] = [];
  for (const seg of buildWalkFlatWallSolids()) {
    solids.push({
      kind: "seg",
      x0: seg.x0,
      z0: seg.z0,
      x1: seg.x1,
      z1: seg.z1,
      halfW: seg.halfW,
      minY: seg.minY,
      maxY: seg.maxY,
    });
  }
  return solids;
}

function buildLiftSolids(): Solid[] {
  // Lift volumes are handled dynamically in blockedAt (open doors / cabin).
  return [];
}

function liftDoorGap(lift: WalkLiftDef, x: number, z: number, doorOpen: number) {
  if (doorOpen < 0.35) return false;
  const midX = (lift.x0 + lift.x1) / 2;
  const midZ = (lift.z0 + lift.z1) / 2;
  const half = lift.opening * 0.5 * Math.min(1, doorOpen);
  const throat = 0.28;
  if (lift.doorAxis === "x") {
    const doorX = lift.wallFace;
    const shaft = doorX + lift.doorDir * throat;
    const lobby = doorX - lift.doorDir * throat;
    const lo = Math.min(shaft, lobby);
    const hi = Math.max(shaft, lobby);
    return x >= lo && x <= hi && z >= midZ - half && z <= midZ + half;
  }
  const doorZ = lift.wallFace;
  const shaft = doorZ + lift.doorDir * throat;
  const lobby = doorZ - lift.doorDir * throat;
  const lo = Math.min(shaft, lobby);
  const hi = Math.max(shaft, lobby);
  return z >= lo && z <= hi && x >= midX - half && x <= midX + half;
}

function liftBlocksWalker(x: number, z: number, y: number) {
  const live = getLiftOpenings();
  for (const lift of WALK_LIFTS) {
    const pad = SOLID_INSET;
    const opening = live.get(lift.id);
    const doorOpen = opening?.doorOpen ?? 0;
    const inPlan =
      x >= lift.x0 + pad &&
      x <= lift.x1 - pad &&
      z >= lift.z0 + pad &&
      z <= lift.z1 - pad;

    if (!inPlan) {
      // Open door throat in the lobby is walkable.
      if (liftDoorGap(lift, x, z, doorOpen)) return false;
      continue;
    }

    const cabinY = opening?.cabinY ?? 0;
    const rider = opening?.rider ?? false;
    if (
      (doorOpen > 0.45 || rider) &&
      y >= cabinY - 0.05 &&
      y <= cabinY + LIFT_CABIN_H
    ) {
      return false;
    }
    if (liftDoorGap(lift, x, z, doorOpen)) return false;
    return true;
  }
  return false;
}

function buildPillarSolids(): Solid[] {
  const solids: Solid[] = [];
  // Stilt columns under every flat.
  for (const pillar of STILT_STRUCTURE.pillars) {
    const [px, , pz] = pillar.position;
    solids.push({
      kind: "cyl",
      x: px,
      z: pz,
      // Slightly fatten so the walk capsule cannot clip the mesh.
      radius: pillar.radius + 0.04,
      minY: 0,
      maxY: pillar.height + 0.05,
    });
  }
  // Compound gate arch pillars.
  const gate = COMPOUND_GATE;
  const [gx, , gz] = gate.position;
  for (const side of [-1, 1]) {
    solids.push({
      kind: "aabb",
      minX: gx - gate.pillarD / 2 - 0.04,
      maxX: gx + gate.pillarD / 2 + 0.04,
      minZ: gz + side * gate.pillarOffset - gate.pillarW / 2 - 0.04,
      maxZ: gz + side * gate.pillarOffset + gate.pillarW / 2 + 0.04,
      minY: 0,
      maxY: gate.pillarH + 0.1,
    } satisfies AabbSolid);
  }
  return solids;
}

function addUStairSurfaces(
  surfaces: Surface[],
  solids: Solid[],
  openZones: OpenZone[],
  stair: typeof STAIR_U,
) {
  const { x0, z1, flight: flightW, wallInner, zRun1, entryZ0, entryZ1 } = stair;
  const wallFace = LIFT_BE5.wallFace;
  const refHalf = FLOOR_HEIGHT / 2;
  const count = Math.round(refHalf / (refHalf / 4 / 2));
  const going = (zRun1 - entryZ1) / count;
  const outerX0 = wallInner - flightW;
  const innerX1 = x0 + flightW;
  const wallT = 0.07;
  const top = buildingTopY() + 0.4;
  const groundRise = (stairArrivalY(0) - stairLevelBaseY(0)) / 2 / count;

  // Well + corridor mouth — lifts / pillars must not seal this volume.
  pushOpenZone(
    openZones,
    x0 + 0.01,
    wallFace + 0.65,
    entryZ0 - 0.2,
    z1 - 0.01,
  );

  // Enclosure walls — stop short of the corridor entry mouth.
  pushAabb(solids, x0 - wallT, x0, LIFT_BE5.z1, z1 + wallT, 0, top);
  pushAabb(solids, x0, wallInner, LIFT_BE5.z1, entryZ0 - 0.02, 0, top);
  pushAabb(solids, x0, wallInner, z1, z1 + wallT, 0, top);

  // Open mouth from corridor into the first flight (ground + upper landings).
  pushSurface(surfaces, x0, wallFace + 0.45, entryZ0, entryZ1 + going, 0);
  pushSurface(surfaces, outerX0, wallInner, entryZ0, entryZ1 + going, groundRise);

  for (let floor = 0; floor <= FLOOR_COUNT; floor += 1) {
    const base = stairLevelBaseY(floor);
    const arrival = stairArrivalY(floor);
    const half = (arrival - base) / 2;
    const rise = half / count;
    if (floor > 0) {
      // Wide mouth onto the corridor deck so F1+ doesn't drop to ground.
      pushSurface(surfaces, x0, wallFace + 1.25, entryZ0 - 0.15, entryZ1 + 0.2, base);
    }
    for (let step = 0; step < count; step += 1) {
      const y1 = base + rise * (step + 1);
      const zStep = entryZ1 + going * step;
      pushSurface(surfaces, outerX0, wallInner, zStep, zStep + going, y1);
      const y2 = base + half + rise * (step + 1);
      const zFar = zRun1 - going * step;
      const zNear = zRun1 - going * (step + 1);
      pushSurface(surfaces, x0, innerX1, zNear, zFar, y2);
    }
    pushSurface(surfaces, x0, wallInner, zRun1, z1, base + half);
    if (floor === FLOOR_COUNT) {
      pushSurface(surfaces, x0, wallFace, entryZ0, entryZ1, arrival);
    }
  }
}

type StairWell = {
  x0: number
  x1: number
  z0: number
  z1: number
  wallT: number
  wallInner: number
  flight1X0: number
  flight1X1: number
  flight2X0: number
  flight2X1: number
  zEntry0: number
  zEntry1: number
  zRun1: number
  zLand0: number
  zLand1: number
  rise: number
  perFlight: number
  going: number
  southbound?: boolean
  doorX0?: number
  doorX1?: number
};

function addB3StyleSurfaces(
  surfaces: Surface[],
  solids: Solid[],
  openZones: OpenZone[],
  stair: StairWell,
  opts?: { openSouth?: boolean; northWall?: boolean },
) {
  const {
    x0,
    x1,
    z0,
    z1,
    wallT,
    wallInner,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    zEntry0,
    zEntry1,
    zRun1,
    zLand0,
    zLand1,
    perFlight,
    going,
  } = stair;
  const count = perFlight;
  const top = buildingTopY() + 0.4;
  const southbound = Boolean(stair.southbound);
  const doorPad = WALK_RADIUS + 0.06;
  const groundRise = (stairArrivalY(0) - stairLevelBaseY(0)) / 2 / count;

  // Interior + approach mouth. Side walls stay as solids outside this pad.
  if (southbound) {
    pushOpenZone(
      openZones,
      x0 + wallT + 0.01,
      x1 + 0.25,
      z0 + wallT + 0.01,
      z1 + 0.85,
    );
  } else {
    pushOpenZone(
      openZones,
      x0 + wallT + 0.01,
      x1 - wallT - 0.01,
      z0 - 0.85,
      z1 - wallT - 0.01,
    );
  }

  pushAabb(solids, x1 - wallT, x1, z0, z1, 0, top);
  pushAabb(solids, x0, x0 + wallT, z0, z1, 0, top);
  if (southbound) {
    // Closed south; open north mouth into the entry landing (flight 1 strip).
    pushAabb(solids, x0, x1, z0, z0 + wallT, 0, top);
    const doorX0 = flight1X0 - doorPad;
    const doorX1 = flight1X1 + doorPad;
    pushAabb(solids, x0, doorX0, z1 - wallT, z1, 0, top);
    pushAabb(solids, doorX1, x1, z1 - wallT, z1, 0, top);
  } else if (opts?.northWall) {
    pushAabb(solids, x0, x1, z1 - wallT, z1, 0, top);
  }
  if (opts?.openSouth && stair.doorX0 != null && stair.doorX1 != null) {
    // Widen the collision door vs the mesh so the walker fits through.
    pushAabb(solids, x0, stair.doorX0 - doorPad, z0, z0 + wallT, 0, top);
    pushAabb(solids, stair.doorX1 + doorPad, x1, z0, z0 + wallT, 0, top);
  } else if (!southbound && !opts?.openSouth) {
    pushAabb(solids, x0, x1, z0, z0 + wallT, 0, top);
  }

  // Ground-level mouth into the stair (no raised curb).
  if (southbound) {
    pushSurface(surfaces, x0, x1 + 0.2, zEntry1, z1 + 0.55, 0);
    pushSurface(surfaces, flight1X0, flight1X1, zEntry0 - going, zEntry1 + 0.2, groundRise);
  } else {
    pushSurface(surfaces, x0, x1, zEntry0 - 0.5, zEntry1, 0);
    pushSurface(surfaces, flight1X0, flight1X1, zEntry0 - 0.2, zEntry1 + going, groundRise);
  }

  for (let floor = 0; floor <= FLOOR_COUNT; floor += 1) {
    const base = stairLevelBaseY(floor);
    const arrival = stairArrivalY(floor);
    const half = (arrival - base) / 2;
    const rise = half / count;
    if (floor > 0) {
      if (southbound) {
        pushSurface(surfaces, x0, x1 + 0.35, zEntry1, z1 + 0.7, base);
      } else {
        pushSurface(surfaces, x0, x1, z0 - 0.7, zEntry1, base);
      }
      pushSurface(surfaces, x0, x1, zEntry0, zEntry1, base);
    }
    for (let step = 0; step < count; step += 1) {
      const y1 = base + rise * (step + 1);
      if (southbound) {
        const z1Hi = zEntry0 - going * step;
        const z1Lo = zEntry0 - going * (step + 1);
        pushSurface(surfaces, flight1X0, flight1X1, z1Lo, z1Hi, y1);
        const y2 = base + half + rise * (step + 1);
        const z2Lo = zRun1 + going * step;
        const z2Hi = zRun1 + going * (step + 1);
        pushSurface(surfaces, flight2X0, flight2X1, z2Lo, z2Hi, y2);
      } else {
        const z1Lo = zEntry1 + going * step;
        const z1Hi = zEntry1 + going * (step + 1);
        pushSurface(surfaces, flight1X0, flight1X1, z1Lo, z1Hi, y1);
        const y2 = base + half + rise * (step + 1);
        const z2Hi = zRun1 - going * step;
        const z2Lo = zRun1 - going * (step + 1);
        pushSurface(surfaces, flight2X0, flight2X1, z2Lo, z2Hi, y2);
      }
    }
    pushSurface(surfaces, x0, wallInner, zLand0, zLand1, base + half);
    if (floor === FLOOR_COUNT) {
      pushSurface(surfaces, x0, x1, zEntry0, zEntry1, arrival);
    }
  }
}

function addBn7Surfaces(
  surfaces: Surface[],
  solids: Solid[],
  openZones: OpenZone[],
) {
  const {
    x0,
    deckNorth,
    flightX0,
    flightX1,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    zWalk,
    zTread0,
    zTread1,
    zStop,
    rise,
    treads,
    going,
    wallT,
  } = STAIR_BN7;

  pushOpenZone(
    openZones,
    flightX0,
    flightX1,
    deckNorth - 0.15,
    zStop - wallT - 0.01,
  );

  for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
    const base = floorBaseY(floor) + DECK;
    const midY = base - rise * (treads + 1);
    const yBottom = midY - rise * (treads + 1);
    pushAabb(solids, x0, flightX0, deckNorth + wallT, zStop, yBottom - 0.05, base + 0.05);
    pushAabb(
      solids,
      flightX1,
      flightX1 + wallT,
      deckNorth + wallT,
      zStop,
      yBottom - 0.05,
      base + 0.05,
    );
    pushAabb(solids, x0, flightX1 + wallT, zStop, zStop + wallT, yBottom - 0.05, base + 0.05);

    pushSurface(surfaces, flightX0, flightX1, deckNorth, zWalk, base);
    pushSurface(surfaces, flightX0, flightX1, zWalk, zTread0, base);
    for (let step = 0; step < treads; step += 1) {
      const y1 = base - rise * (step + 1);
      const z0 = zTread0 + going * step;
      const z1 = zTread0 + going * (step + 1);
      pushSurface(surfaces, flight1X0, flight1X1, z0, z1, y1);
      const y2 = midY - rise * (step + 1);
      const zFar = zTread1 - going * step;
      const zNear = zTread1 - going * (step + 1);
      pushSurface(surfaces, flight2X0, flight2X1, zNear, zFar, y2);
    }
    pushSurface(surfaces, flightX0, flightX1, zTread1, zStop, midY);
    if (floor === 1) {
      pushSurface(surfaces, flightX0, flightX1, deckNorth, zWalk, yBottom);
      pushSurface(surfaces, flightX0, flightX1, zWalk, zTread0, yBottom);
    }
  }
}

function buildCorridorDecks(): Surface[] {
  const surfaces: Surface[] = [];
  // Soft walkable pads on residential floor slabs near units + corridor runs.
  for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
    const y = floorBaseY(floor) + DECK;
    for (const id of FOOTPRINT_IDS) {
      const [cx, cz] = UNIT_FOOTPRINT[id];
      const [w, d] = unitPlanSize(id);
      const pad = 0.55;
      pushSurface(
        surfaces,
        cx - w / 2 - pad,
        cx + w / 2 + pad,
        cz - d / 2 - pad,
        cz + d / 2 + pad,
        y,
      );
    }
    for (const c of CORRIDORS) {
      const halfW = c.size[0] / 2 + 0.12;
      const halfD = c.size[1] / 2 + 0.12;
      pushSurface(
        surfaces,
        c.x - halfW,
        c.x + halfW,
        c.z - halfD,
        c.z + halfD,
        y,
      );
    }
  }
  return surfaces;
}

type WalkWorld = {
  compound: Solid[]
  blockers: Solid[]
  surfaces: Surface[]
  openZones: OpenZone[]
};

let cached: WalkWorld | null = null;
let cachedVersion = -1;
const WALK_WORLD_VERSION = 9;

export function getWalkWorld(): WalkWorld {
  if (cached && cachedVersion === WALK_WORLD_VERSION) return cached;
  const compound = buildCompoundSolids();
  const blockers: Solid[] = [
    ...buildUnitSolids(),
    ...buildFlatInteriorSolids(),
    ...buildLiftSolids(),
    ...buildPillarSolids(),
  ];
  const surfaces: Surface[] = [
    // Ground / stilt deck across the compound.
    {
      minX: -1e4,
      maxX: 1e4,
      minZ: -1e4,
      maxZ: 1e4,
      y: 0,
    },
    ...buildCorridorDecks(),
    ...buildWalkFlatFloorPads().map((pad) => ({
      minX: pad.minX,
      maxX: pad.maxX,
      minZ: pad.minZ,
      maxZ: pad.maxZ,
      y: pad.y,
    })),
  ];
  const openZones: OpenZone[] = [];
  addUStairSurfaces(surfaces, blockers, openZones, STAIR_U);
  addB3StyleSurfaces(surfaces, blockers, openZones, STAIR_B3, {
    openSouth: true,
    northWall: true,
  });
  addB3StyleSurfaces(surfaces, blockers, openZones, STAIR_A4);
  addB3StyleSurfaces(surfaces, blockers, openZones, STAIR_A8);
  addBn7Surfaces(surfaces, blockers, openZones);
  cached = { compound, blockers, surfaces, openZones };
  cachedVersion = WALK_WORLD_VERSION;
  return cached;
}

function circleHitsAabb(
  x: number,
  z: number,
  r: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  const cx = Math.min(Math.max(x, minX), maxX);
  const cz = Math.min(Math.max(z, minZ), maxZ);
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

function circleHitsSeg(
  x: number,
  z: number,
  r: number,
  seg: SegSolid,
) {
  const vx = seg.x1 - seg.x0;
  const vz = seg.z1 - seg.z0;
  const len2 = vx * vx + vz * vz || 1;
  let t = ((x - seg.x0) * vx + (z - seg.z0) * vz) / len2;
  t = Math.min(1, Math.max(0, t));
  const px = seg.x0 + vx * t;
  const pz = seg.z0 + vz * t;
  const dx = x - px;
  const dz = z - pz;
  const lim = r + seg.halfW;
  return dx * dx + dz * dz < lim * lim;
}

function solidHits(
  x: number,
  z: number,
  bodyMin: number,
  bodyMax: number,
  solids: Solid[],
  r: number,
) {
  for (const s of solids) {
    if (bodyMax < s.minY || bodyMin > s.maxY) continue;
    if (s.kind === "aabb") {
      if (circleHitsAabb(x, z, r, s.minX, s.maxX, s.minZ, s.maxZ)) return true;
    } else if (s.kind === "seg") {
      if (circleHitsSeg(x, z, r, s)) return true;
    } else {
      const dx = x - s.x;
      const dz = z - s.z;
      const lim = r + s.radius;
      if (dx * dx + dz * dz < lim * lim) return true;
    }
  }
  return false;
}

function blockedAt(
  x: number,
  z: number,
  y: number,
  world: WalkWorld,
  r = WALK_RADIUS,
) {
  const bodyMin = y + 0.02;
  const bodyMax = y + Math.max(UNIT_SIZE[1] * 0.55, ftToScene(3));
  if (solidHits(x, z, bodyMin, bodyMax, world.compound, r)) return true;
  if (liftBlocksWalker(x, z, y)) return true;
  // Inside a stair mouth / well: ignore units, pillars, and well walls
  // that would otherwise seal the entry.
  if (inOpenZone(x, z, world.openZones)) return false;
  return solidHits(x, z, bodyMin, bodyMax, world.blockers, r);
}

function canStepUp(fromY: number, toY: number) {
  const dy = toY - fromY;
  if (dy <= STAIR_RISER) return true;
  // Single deck curb (not a multi-tread skip).
  return dy <= DECK_STEP && dy >= DECK - 0.08;
}

function sampleGroundY(
  x: number,
  z: number,
  currentY: number,
  surfaces: Surface[],
  openZones: OpenZone[],
  r = WALK_RADIUS,
): { y: number; supported: boolean } {
  // Next tread only; stand on near support. Never snap down to ground from an
  // upper floor when the infinite y=0 plane is still "under" the feet.
  const onStairs = inOpenZone(x, z, openZones);
  let nextUp = Infinity;
  let nearSupport = -Infinity;
  let farBelow = -Infinity;
  let deckUp = Infinity;
  const footR = r * 0.55;
  const considerY = (sy: number) => {
    if (sy > currentY + 0.004 && sy <= currentY + STAIR_RISER) {
      nextUp = Math.min(nextUp, sy);
      return;
    }
    if (sy <= currentY + 0.004 && sy >= currentY - STAIR_RISER - 0.025) {
      nearSupport = Math.max(nearSupport, sy);
      return;
    }
    if (sy > currentY + STAIR_RISER && canStepUp(currentY, sy)) {
      deckUp = Math.min(deckUp, sy);
      return;
    }
    if (
      onStairs &&
      sy < currentY - STAIR_RISER - 0.025 &&
      sy >= currentY - MAX_STEP_DOWN
    ) {
      farBelow = Math.max(farBelow, sy);
    }
  };
  for (const s of surfaces) {
    if (!circleHitsAabb(x, z, footR, s.minX, s.maxX, s.minZ, s.maxZ)) continue;
    considerY(s.y);
  }
  // Moving cabin floor while boarding / riding.
  for (const opening of getLiftOpenings().values()) {
    if (opening.doorOpen < 0.4 && !opening.rider) continue;
    const lift = findWalkLift(opening.id);
    if (!lift) continue;
    if (
      x < lift.x0 + SOLID_INSET ||
      x > lift.x1 - SOLID_INSET ||
      z < lift.z0 + SOLID_INSET ||
      z > lift.z1 - SOLID_INSET
    ) {
      continue;
    }
    considerY(opening.cabinY);
  }
  if (nextUp < Infinity) return { y: nextUp, supported: true };
  if (nearSupport > -Infinity) return { y: nearSupport, supported: true };
  if (deckUp < Infinity) return { y: deckUp, supported: true };
  if (
    onStairs &&
    farBelow > -Infinity &&
    currentY - farBelow <= STAIR_RISER * 2.2
  ) {
    return {
      y: Math.max(farBelow, currentY - STAIR_RISER),
      supported: true,
    };
  }
  if (currentY > DECK + 0.05) {
    // Upper floor with no pad underfoot — keep height; caller blocks the move.
    return { y: currentY, supported: false };
  }
  return { y: 0, supported: true };
}

function insideCompound(x: number, z: number) {
  const { west, east, north, south, westWide, gateN, gateS } = SITE.compound.bounds;
  const minX = Math.min(west, westWide) - 0.05;
  const maxX = east + 0.05;
  const minZ = north - 0.05;
  const maxZ = south + 0.05;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
  // Allow standing in the gate throat just outside / on the opening.
  if (z >= gateN && z <= gateS && x < west + 0.2) return true;
  return true;
}

/**
 * Move a walking person with wall sliding and stair height follow.
 * Large moves are sub-stepped so each stair tread is taken in turn.
 */
export function walkMove(
  x: number,
  z: number,
  y: number,
  dx: number,
  dz: number,
): { x: number; z: number; y: number } {
  const world = getWalkWorld();
  const tryPos = (nx: number, nz: number, fromY: number) => {
    if (!insideCompound(nx, nz)) return null;
    const ground = sampleGroundY(
      nx,
      nz,
      fromY,
      world.surfaces,
      world.openZones,
    );
    if (!ground.supported && fromY > DECK + 0.05) return null;
    if (!canStepUp(fromY, ground.y) && ground.y > fromY) return null;
    // Don't fall from a residential floor onto ground through gaps.
    if (
      ground.y < fromY - STAIR_RISER - 0.02 &&
      !inOpenZone(nx, nz, world.openZones)
    ) {
      return null;
    }
    if (blockedAt(nx, nz, ground.y, world)) return null;
    return { x: nx, z: nz, y: ground.y };
  };

  const stepOnce = (cx: number, cz: number, cy: number, sx: number, sz: number) => {
    const full = tryPos(cx + sx, cz + sz, cy);
    if (full) return full;
    const onlyX = tryPos(cx + sx, cz, cy);
    if (onlyX) return onlyX;
    const onlyZ = tryPos(cx, cz + sz, cy);
    if (onlyZ) return onlyZ;
    const stay = sampleGroundY(cx, cz, cy, world.surfaces, world.openZones);
    return { x: cx, z: cz, y: stay.y };
  };

  const dist = Math.hypot(dx, dz);
  const parts = Math.max(1, Math.ceil(dist / MOVE_SUBSTEP));
  let cx = x;
  let cz = z;
  let cy = y;
  for (let i = 0; i < parts; i += 1) {
    const next = stepOnce(cx, cz, cy, dx / parts, dz / parts);
    // Stop early if a substep could not advance — avoids tunneling up stairs.
    if (
      Math.hypot(next.x - cx, next.z - cz) < 1e-8 &&
      Math.abs(next.y - cy) < 1e-8 &&
      (Math.abs(dx) > 1e-8 || Math.abs(dz) > 1e-8)
    ) {
      break;
    }
    cx = next.x;
    cz = next.z;
    cy = next.y;
  }
  return { x: cx, z: cz, y: cy };
}

/** Snap a spawn point onto walkable ground. */
export function walkSnap(x: number, z: number, y = 0) {
  return walkMove(x, z, y, 0, 0);
}

/** True inside stair wells / mouths — use slower gait and steadier camera. */
export function walkInStairWell(x: number, z: number) {
  return inOpenZone(x, z, getWalkWorld().openZones);
}

const CAM_PROBE_R = ftToScene(0.28);
/** Hard floor — full-body third person, never shoulder-cam. */
const CAM_MIN_DIST = ftToScene(5.4);
/** Preferred floor when walls are nearby. */
const CAM_COMFORT_MIN = ftToScene(6.2);

function camBlocked(x: number, z: number, y: number, world: WalkWorld) {
  const lo = y - 0.1;
  const hi = y + 0.1;
  return (
    solidHits(x, z, lo, hi, world.compound, CAM_PROBE_R) ||
    solidHits(x, z, lo, hi, world.blockers, CAM_PROBE_R)
  );
}

/**
 * How close the nearest solid is around the walker (for tight rooms / stairs).
 */
function nearestWallGap(x: number, z: number, y: number, world: WalkWorld) {
  const search = ftToScene(7);
  const step = 0.06;
  let gap = search;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    for (let d = WALK_RADIUS + 0.02; d <= search; d += step) {
      if (camBlocked(x + dx * d, z + dz * d, y, world)) {
        gap = Math.min(gap, d);
        break;
      }
    }
  }
  return gap;
}

function clearOrbitDist(
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  ux: number,
  uy: number,
  uz: number,
  want: number,
  world: WalkWorld,
) {
  const steps = 18;
  for (let i = 1; i <= steps; i += 1) {
    const t = (i / steps) * want;
    if (camBlocked(eyeX + ux * t, eyeZ + uz * t, eyeY + uy * t, world)) {
      return Math.max(CAM_MIN_DIST, t - want / steps);
    }
  }
  return want;
}

/**
 * Third-person orbit length: stay clear of walls without hugging the person.
 * Prefers a slightly higher orbit when the back path is tight so the view
 * stays open and the full (scaled) walker remains readable.
 */
export function walkCameraDistance(
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  maxDist: number,
) {
  const world = getWalkWorld();
  const len = Math.hypot(dirX, dirY, dirZ) || 1;
  const ux = dirX / len;
  const uy = dirY / len;
  const uz = dirZ / len;
  const want = Math.max(CAM_COMFORT_MIN, maxDist);

  let along = clearOrbitDist(eyeX, eyeY, eyeZ, ux, uy, uz, want, world);

  // Prefer a higher / steeper orbit over pulling into the character's back.
  if (along < want * 0.92) {
    for (const lift of [ftToScene(1.4), ftToScene(2.4)]) {
      const raised = clearOrbitDist(
        eyeX,
        eyeY + lift,
        eyeZ,
        ux,
        Math.min(0.92, uy + 0.35),
        uz,
        want,
        world,
      );
      along = Math.max(along, raised);
    }
  }

  // Mild trim in tight spaces — still keep a full-body framing.
  const gap = nearestWallGap(eyeX, eyeZ, eyeY, world);
  const tight = ftToScene(4.2);
  if (gap < tight) {
    const t = Math.min(
      1,
      Math.max(0, (gap - WALK_RADIUS) / (tight - WALK_RADIUS)),
    );
    const enclosed = CAM_COMFORT_MIN + (want - CAM_COMFORT_MIN) * (0.55 + 0.45 * t);
    along = Math.min(along, enclosed);
  }

  return Math.max(CAM_MIN_DIST, along);
}
