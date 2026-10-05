/**
 * Walk-mode lift definitions and helpers (call → board → ride → exit).
 */
import {
  FLOOR_COUNT,
  LIFT_A4,
  LIFT_AS1,
  LIFT_BE5,
  LIFT_BN5,
  floorBaseY,
  ftToScene,
} from "@/lib/layout3d";

export const LIFT_DECK = 0.2;
export const LIFT_DOOR_H = 0.72;
export const LIFT_CABIN_H = 0.95;
/** Floors the cabin serves: ground (0) + residential 1…N. */
export const LIFT_MIN_FLOOR = 0;
export const LIFT_MAX_FLOOR = FLOOR_COUNT;

export type LiftDoorAxis = "x" | "z";

export type WalkLiftDef = {
  id: string
  label: string
  x0: number
  x1: number
  z0: number
  z1: number
  wallFace: number
  opening: number
  doorAxis: LiftDoorAxis
  doorDir: -1 | 1
};

export const WALK_LIFTS: WalkLiftDef[] = [
  {
    id: LIFT_BE5.id,
    label: "Lift BE",
    x0: LIFT_BE5.x0,
    x1: LIFT_BE5.x1,
    z0: LIFT_BE5.z0,
    z1: LIFT_BE5.z1,
    wallFace: LIFT_BE5.wallFace,
    opening: LIFT_BE5.opening,
    doorAxis: "x",
    doorDir: -1,
  },
  {
    id: LIFT_BN5.id,
    label: "Lift BN",
    x0: LIFT_BN5.x0,
    x1: LIFT_BN5.x1,
    z0: LIFT_BN5.z0,
    z1: LIFT_BN5.z1,
    wallFace: LIFT_BN5.wallFace,
    opening: LIFT_BN5.opening,
    doorAxis: "x",
    doorDir: LIFT_BN5.doorDir,
  },
  {
    id: LIFT_AS1.id,
    label: "Lift AS",
    x0: LIFT_AS1.x0,
    x1: LIFT_AS1.x1,
    z0: LIFT_AS1.z0,
    z1: LIFT_AS1.z1,
    wallFace: LIFT_AS1.wallFace,
    opening: LIFT_AS1.opening,
    doorAxis: "x",
    doorDir: LIFT_AS1.doorDir,
  },
  {
    id: LIFT_A4.id,
    label: "Lift A4",
    x0: LIFT_A4.x0,
    x1: LIFT_A4.x1,
    z0: LIFT_A4.z0,
    z1: LIFT_A4.z1,
    wallFace: LIFT_A4.wallFace,
    opening: LIFT_A4.opening,
    doorAxis: LIFT_A4.doorAxis,
    doorDir: LIFT_A4.doorDir,
  },
];

export function liftFloorY(floor: number) {
  if (floor <= 0) return 0;
  return floorBaseY(floor) + LIFT_DECK;
}

export function liftCenter(lift: WalkLiftDef) {
  return {
    x: (lift.x0 + lift.x1) / 2,
    z: (lift.z0 + lift.z1) / 2,
  };
}

/** +1 / -1 from door wallFace into the shaft (cabin side). */
export function liftShaftSign(lift: WalkLiftDef) {
  const c = liftCenter(lift);
  if (lift.doorAxis === "x") {
    const s = Math.sign(c.x - lift.wallFace);
    return s === 0 ? lift.doorDir : s;
  }
  const s = Math.sign(c.z - lift.wallFace);
  return s === 0 ? lift.doorDir : s;
}

export function clampLiftFloor(floor: number) {
  return Math.min(LIFT_MAX_FLOOR, Math.max(LIFT_MIN_FLOOR, Math.round(floor)));
}

/** Nearest lift floor for a world Y. */
export function nearestLiftFloor(y: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let f = LIFT_MIN_FLOOR; f <= LIFT_MAX_FLOOR; f += 1) {
    const d = Math.abs(liftFloorY(f) - y);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

export function pointInLiftPlan(lift: WalkLiftDef, x: number, z: number, pad = 0) {
  return (
    x >= lift.x0 - pad &&
    x <= lift.x1 + pad &&
    z >= lift.z0 - pad &&
    z <= lift.z1 + pad
  );
}

/** Lobby pad just outside the door where the call button works. */
export function nearLiftCall(lift: WalkLiftDef, x: number, z: number, y: number) {
  const floor = nearestLiftFloor(y);
  if (Math.abs(y - liftFloorY(floor)) > 0.35) return false;
  const mid = liftCenter(lift);
  const depth = ftToScene(3.2);
  const halfOpen = lift.opening / 2 + 0.22;
  const intoLobby = -liftShaftSign(lift);
  if (lift.doorAxis === "x") {
    const doorX = lift.wallFace;
    const outer = doorX + intoLobby * depth;
    const lo = Math.min(doorX - 0.05, outer);
    const hi = Math.max(doorX + 0.05, outer);
    return (
      x >= lo &&
      x <= hi &&
      z >= mid.z - halfOpen &&
      z <= mid.z + halfOpen
    );
  }
  const doorZ = lift.wallFace;
  const outer = doorZ + intoLobby * depth;
  const lo = Math.min(doorZ - 0.05, outer);
  const hi = Math.max(doorZ + 0.05, outer);
  return (
    z >= lo &&
    z <= hi &&
    x >= mid.x - halfOpen &&
    x <= mid.x + halfOpen
  );
}

export function insideLiftCabin(
  lift: WalkLiftDef,
  x: number,
  z: number,
  y: number,
  cabinFloorY: number,
) {
  if (!pointInLiftPlan(lift, x, z, -0.02)) return false;
  return y >= cabinFloorY - 0.08 && y <= cabinFloorY + LIFT_CABIN_H;
}

export type LiftPhase =
  | "idle"
  | "called"
  | "doorsOpening"
  | "doorsOpen"
  | "doorsClosing"
  | "traveling"
  | "arriving";

export type LiftRuntime = {
  id: string
  cabinFloor: number
  cabinY: number
  doorOpen: number
  phase: LiftPhase
  targetFloor: number | null
  /** Player is riding / locked to cabin during travel. */
  rider: boolean
};

/** Live openings consulted by walk collision. */
export type LiftOpeningState = {
  id: string
  cabinY: number
  doorOpen: number
  rider: boolean
};

const openings = new Map<string, LiftOpeningState>();

export function setLiftOpening(state: LiftOpeningState | null, id?: string) {
  if (!state) {
    if (id) openings.delete(id);
    return;
  }
  openings.set(state.id, state);
}

export function getLiftOpenings() {
  return openings;
}

export function findWalkLift(id: string) {
  return WALK_LIFTS.find((l) => l.id === id) ?? null;
}
