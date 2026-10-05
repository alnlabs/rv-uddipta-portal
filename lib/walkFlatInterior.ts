/**
 * Walk-mode hollow flats: CAD wall collision + which stacks are enterable.
 */
import {
  A4_ENTRANCE,
  A8_ENTRANCE,
  B3_ENTRANCE,
  FLOOR_COUNT,
  FOOTPRINT_IDS,
  UNIT_FOOTPRINT,
  floorBaseY,
  unitPlanSize,
} from "@/lib/layout3d";
import { cadPlanForFlat } from "@/lib/plans/cad";
import {
  FLAT_DECK,
  FLAT_WALL_H,
  FLAT_WALL_T,
  flatFloorY,
  planPointOnFloor,
  stackPose,
  wallSegmentWorld,
} from "@/lib/planWorld";

export type FlatWallSeg = {
  x0: number
  z0: number
  x1: number
  z1: number
  halfW: number
  minY: number
  maxY: number
};

export type FlatFloorPad = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  y: number
};

/** World-space doorway throat (XZ) — walls are cut open here. */
export type FlatEntranceGap = {
  stackId: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
};

/** Stacks with brochure CAD plans (A5 / A9 stay solid shells). */
export const WALKABLE_STACK_IDS: readonly string[] = FOOTPRINT_IDS.filter((id) => {
  const wing = id[0];
  const unit = Number(id.slice(1));
  return cadPlanForFlat({ wing, unit }) != null;
});

const WALKABLE_SET = new Set(WALKABLE_STACK_IDS);

export function isWalkableStack(stackId: string) {
  return WALKABLE_SET.has(stackId);
}

export function isWalkableFlat(wing: string, unit: number) {
  return isWalkableStack(`${wing}${unit}`);
}

/** Nearest residential floor (1…N) for a walker Y. */
export function nearestWalkFlatFloor(y: number) {
  let best = 1;
  let bestDist = Infinity;
  for (let f = 1; f <= FLOOR_COUNT; f += 1) {
    const d = Math.abs(flatFloorY(f) - y);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

let walkFloorHint = 1;

export function setWalkFlatFloorHint(floor: number) {
  walkFloorHint = Math.min(FLOOR_COUNT, Math.max(1, Math.round(floor)));
}

export function getWalkFlatFloorHint() {
  return walkFloorHint;
}

function pushGap(
  out: FlatEntranceGap[],
  stackId: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  if (maxX - minX < 1e-4 || maxZ - minZ < 1e-4) return;
  out.push({
    stackId,
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ),
  });
}

/**
 * Layout-authored doors (stair lobbies) plus CAD entrance holes.
 * Depth reaches from the corridor face into the living so lobby leftovers
 * compressed into the unit footprint do not seal the doorway.
 */
export function buildFlatEntranceGaps(): FlatEntranceGap[] {
  const out: FlatEntranceGap[] = [];
  const depth = 0.85;
  const pad = 0.04;

  const specialEntrances: { stackId: string; ent: typeof B3_ENTRANCE }[] = [
    { stackId: "B3", ent: B3_ENTRANCE },
    { stackId: "A4", ent: A4_ENTRANCE },
    { stackId: "A8", ent: A8_ENTRANCE },
  ];
  for (const { stackId, ent } of specialEntrances) {
    // doorDir +1: corridor is +X of wallFace; inside flat is −X.
    pushGap(
      out,
      stackId,
      ent.wallFace - depth,
      Math.max(ent.pathX1, ent.wallFace) + pad,
      ent.z0 - pad,
      ent.z1 + pad,
    );
  }

  for (const stackId of WALKABLE_STACK_IDS) {
    if (stackId === "B3" || stackId === "A4" || stackId === "A8") continue;
    const wing = stackId[0];
    const unit = Number(stackId.slice(1));
    const plan = cadPlanForFlat({ wing, unit });
    if (!plan) continue;
    const door = plan.doors.find((d) => d.entrance);
    if (!door) continue;
    const vertical = door.wall === "e" || door.wall === "w";
    const a = planPointOnFloor(stackId, plan.extent, door.x, door.y, 1);
    const b = planPointOnFloor(
      stackId,
      plan.extent,
      door.x + (vertical ? 0 : door.length),
      door.y + (vertical ? door.length : 0),
      1,
    );
    if (!a || !b) continue;
    const spot = UNIT_FOOTPRINT[stackId];
    if (!spot) continue;
    const [cx, cz] = spot;
    const [uw, ud] = unitPlanSize(stackId);
    const west = cx - uw / 2;
    const east = cx + uw / 2;
    const south = cz - ud / 2;
    const north = cz + ud / 2;
    const alongZ = Math.abs(a[2] - b[2]) >= Math.abs(a[0] - b[0]);
    if (alongZ) {
      const x = (a[0] + b[0]) / 2;
      // Reach the nearer corridor face and cut inward past lobby leftovers.
      const toEast = Math.abs(x - east) <= Math.abs(x - west);
      pushGap(
        out,
        stackId,
        toEast ? x - depth : west - pad,
        toEast ? east + pad : x + depth,
        Math.min(a[2], b[2]) - pad,
        Math.max(a[2], b[2]) + pad,
      );
    } else {
      const z = (a[2] + b[2]) / 2;
      const toNorth = Math.abs(z - north) <= Math.abs(z - south);
      pushGap(
        out,
        stackId,
        Math.min(a[0], b[0]) - pad,
        Math.max(a[0], b[0]) + pad,
        toNorth ? z - depth : south - pad,
        toNorth ? north + pad : z + depth,
      );
    }
  }
  return out;
}

/** Split a wall segment around doorway gaps (axis-aligned segs only). */
export function cutWallSegByGaps(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  gaps: readonly FlatEntranceGap[],
): { x0: number; z0: number; x1: number; z1: number }[] {
  let parts = [{ x0, z0, x1, z1 }];
  const horizontal = Math.abs(z1 - z0) < 1e-4;
  const vertical = Math.abs(x1 - x0) < 1e-4;
  if (!horizontal && !vertical) return parts;

  for (const gap of gaps) {
    const next: typeof parts = [];
    for (const part of parts) {
      if (horizontal) {
        const z = part.z0;
        if (z < gap.minZ - 1e-4 || z > gap.maxZ + 1e-4) {
          next.push(part);
          continue;
        }
        const lo = Math.min(part.x0, part.x1);
        const hi = Math.max(part.x0, part.x1);
        if (hi <= gap.minX || lo >= gap.maxX) {
          next.push(part);
          continue;
        }
        if (lo < gap.minX) {
          next.push({ x0: lo, z0: z, x1: gap.minX, z1: z });
        }
        if (hi > gap.maxX) {
          next.push({ x0: gap.maxX, z0: z, x1: hi, z1: z });
        }
      } else {
        const x = part.x0;
        if (x < gap.minX - 1e-4 || x > gap.maxX + 1e-4) {
          next.push(part);
          continue;
        }
        const lo = Math.min(part.z0, part.z1);
        const hi = Math.max(part.z0, part.z1);
        if (hi <= gap.minZ || lo >= gap.maxZ) {
          next.push(part);
          continue;
        }
        if (lo < gap.minZ) {
          next.push({ x0: x, z0: lo, x1: x, z1: gap.minZ });
        }
        if (hi > gap.maxZ) {
          next.push({ x0: x, z0: gap.maxZ, x1: x, z1: hi });
        }
      }
    }
    parts = next;
  }
  return parts.filter((p) => Math.hypot(p.x1 - p.x0, p.z1 - p.z0) >= 0.04);
}

let cachedGaps: FlatEntranceGap[] | null = null;

export function getFlatEntranceGaps() {
  if (!cachedGaps) cachedGaps = buildFlatEntranceGaps();
  return cachedGaps;
}

/** Visual entrance door pose on the corridor-facing wall. */
export type FlatEntranceDoor = {
  stackId: string
  /** Door leaf / frame center. */
  x: number
  z: number
  /** Door opening width along the wall. */
  width: number
  /** True = door sits on an X=const wall (runs along Z). */
  alongZ: boolean
  /** +1 toward +X / +Z (corridor side of the wall). */
  doorDir: 1 | -1
};

let cachedDoors: FlatEntranceDoor[] | null = null;

export function buildFlatEntranceDoors(): FlatEntranceDoor[] {
  const out: FlatEntranceDoor[] = [];
  for (const gap of getFlatEntranceGaps()) {
    const spot = UNIT_FOOTPRINT[gap.stackId];
    if (!spot) continue;
    const [cx, cz] = spot;
    const [uw, ud] = unitPlanSize(gap.stackId);
    const east = cx + uw / 2;
    const west = cx - uw / 2;
    const north = cz + ud / 2;
    const south = cz - ud / 2;
    const gx = (gap.minX + gap.maxX) / 2;
    const gz = (gap.minZ + gap.maxZ) / 2;
    const distE = Math.abs(gx - east);
    const distW = Math.abs(gx - west);
    const distN = Math.abs(gz - north);
    const distS = Math.abs(gz - south);
    const minFace = Math.min(distE, distW, distN, distS);
    if (minFace === distE || minFace === distW) {
      const onEast = minFace === distE;
      out.push({
        stackId: gap.stackId,
        x: onEast ? east : west,
        z: gz,
        width: Math.max(gap.maxZ - gap.minZ, 0.22),
        alongZ: true,
        doorDir: onEast ? 1 : -1,
      });
    } else {
      const onNorth = minFace === distN;
      out.push({
        stackId: gap.stackId,
        x: gx,
        z: onNorth ? north : south,
        width: Math.max(gap.maxX - gap.minX, 0.22),
        alongZ: false,
        doorDir: onNorth ? 1 : -1,
      });
    }
  }
  return out;
}

export function getFlatEntranceDoors() {
  if (!cachedDoors) cachedDoors = buildFlatEntranceDoors();
  return cachedDoors;
}

/** Wall segment colliders for every residential floor of every CAD stack. */
export function buildWalkFlatWallSolids(): FlatWallSeg[] {
  const out: FlatWallSeg[] = [];
  const halfW = FLAT_WALL_T / 2 + 0.012;
  const gaps = getFlatEntranceGaps();
  for (const stackId of WALKABLE_STACK_IDS) {
    const wing = stackId[0];
    const unit = Number(stackId.slice(1));
    const plan = cadPlanForFlat({ wing, unit });
    if (!plan) continue;
    const stackGaps = gaps.filter((g) => g.stackId === stackId);
    for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
      const minY = flatFloorY(floor);
      const maxY = minY + FLAT_WALL_H;
      for (const wall of plan.walls) {
        const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
        if (len < 0.15) continue;
        const seg = wallSegmentWorld(stackId, plan.extent, wall, floor);
        if (!seg) continue;
        const pieces = cutWallSegByGaps(seg.x0, seg.z0, seg.x1, seg.z1, stackGaps);
        for (const piece of pieces) {
          out.push({
            x0: piece.x0,
            z0: piece.z0,
            x1: piece.x1,
            z1: piece.z1,
            halfW,
            minY,
            maxY,
          });
        }
      }
    }
  }
  return out;
}

/** Explicit interior floor pads (in addition to corridor pads). */
export function buildWalkFlatFloorPads(): FlatFloorPad[] {
  const out: FlatFloorPad[] = [];
  for (const stackId of WALKABLE_STACK_IDS) {
    const pose = stackPose(stackId);
    if (!pose) continue;
    const [cx, cz] = UNIT_FOOTPRINT[stackId];
    const [w, d] = unitPlanSize(stackId);
    for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
      const y = flatFloorY(floor);
      // Slightly inside outer walls so entry from corridor stays continuous.
      const inset = 0.02;
      out.push({
        minX: cx - w / 2 + inset,
        maxX: cx + w / 2 - inset,
        minZ: cz - d / 2 + inset,
        maxZ: cz + d / 2 - inset,
        y,
      });
    }
  }
  return out;
}

export { FLAT_DECK, floorBaseY };
