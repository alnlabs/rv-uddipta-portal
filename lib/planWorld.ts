/**
 * Map brochure CAD plan feet into community 3D world space.
 * Plan +x = east (world +X). Plan +y = south (world −Z).
 */
import {
  UNIT_FOOTPRINT,
  floorBaseY,
  unitPlanSize,
} from "@/lib/layout3d";
import type { CadExtent, CadWall } from "@/lib/plans/cad";

export const FLAT_DECK = 0.2;
/** Interior wall height under the unit ceiling. */
export const FLAT_WALL_H = 0.78;
export const FLAT_WALL_T = 0.055;

export function planToWorld(
  flatX: number,
  flatZ: number,
  unitW: number,
  unitD: number,
  extentW: number,
  extentH: number,
  planX: number,
  planY: number,
  y: number,
): [number, number, number] {
  const u = extentW === 0 ? 0 : planX / extentW;
  const v = extentH === 0 ? 0 : planY / extentH;
  return [flatX - unitW / 2 + u * unitW, y, flatZ + unitD / 2 - v * unitD];
}

export function stackPose(stackId: string) {
  const spot = UNIT_FOOTPRINT[stackId];
  if (!spot) return null;
  const [flatX, flatZ] = spot;
  const [unitW, unitD] = unitPlanSize(stackId);
  return { flatX, flatZ, unitW, unitD };
}

/** Deck Y for walking inside a residential flat. */
export function flatFloorY(floor: number) {
  return floorBaseY(floor) + FLAT_DECK;
}

export function planPointOnFloor(
  stackId: string,
  extent: CadExtent,
  planX: number,
  planY: number,
  floor: number,
): [number, number, number] | null {
  const pose = stackPose(stackId);
  if (!pose) return null;
  return planToWorld(
    pose.flatX,
    pose.flatZ,
    pose.unitW,
    pose.unitD,
    extent.w,
    extent.h,
    planX,
    planY,
    flatFloorY(floor),
  );
}

/** World-space endpoints of a CAD wall segment at a given floor deck. */
export function wallSegmentWorld(
  stackId: string,
  extent: CadExtent,
  wall: CadWall,
  floor: number,
): { x0: number; z0: number; x1: number; z1: number; y: number } | null {
  const pose = stackPose(stackId);
  if (!pose) return null;
  const y = flatFloorY(floor);
  const a = planToWorld(
    pose.flatX,
    pose.flatZ,
    pose.unitW,
    pose.unitD,
    extent.w,
    extent.h,
    wall.x1,
    wall.y1,
    y,
  );
  const b = planToWorld(
    pose.flatX,
    pose.flatZ,
    pose.unitW,
    pose.unitD,
    extent.w,
    extent.h,
    wall.x2,
    wall.y2,
    y,
  );
  return { x0: a[0], z0: a[2], x1: b[0], z1: b[2], y };
}

/** Axis-aligned box for a plan rect (room / door hole) in world XZ. */
export function planRectWorld(
  stackId: string,
  extent: CadExtent,
  planX: number,
  planY: number,
  planW: number,
  planH: number,
  floor: number,
): { x: number; y: number; z: number; w: number; d: number } | null {
  const pose = stackPose(stackId);
  if (!pose) return null;
  const y = flatFloorY(floor);
  const c = planToWorld(
    pose.flatX,
    pose.flatZ,
    pose.unitW,
    pose.unitD,
    extent.w,
    extent.h,
    planX + planW / 2,
    planY + planH / 2,
    y,
  );
  const w = (planW / extent.w) * pose.unitW;
  const d = (planH / extent.h) * pose.unitD;
  return { x: c[0], y: c[1], z: c[2], w: Math.max(w, 0.02), d: Math.max(d, 0.02) };
}
