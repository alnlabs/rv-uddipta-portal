import { A1_DOORS, A1_EXTENT, A1_OPENINGS, A1_ROOMS, A1_WINDOWS, splitA1Walls } from "@/lib/plans/a1";
import { A2_DOORS, A2_EXTENT, A2_OPENINGS, A2_ROOMS, A2_WINDOWS, splitA2Walls } from "@/lib/plans/a2";
import { A3_DOORS, A3_EXTENT, A3_OPENINGS, A3_ROOMS, A3_WINDOWS, splitA3Walls } from "@/lib/plans/a3";
import { A4_DOORS, A4_EXTENT, A4_OPENINGS, A4_ROOMS, A4_WINDOWS, splitA4Walls } from "@/lib/plans/a4";
import { A6_DOORS, A6_EXTENT, A6_OPENINGS, A6_ROOMS, A6_WINDOWS, splitA6Walls } from "@/lib/plans/a6";
import { A7_DOORS, A7_EXTENT, A7_OPENINGS, A7_ROOMS, A7_WINDOWS, splitA7Walls } from "@/lib/plans/a7";
import { A8_DOORS, A8_EXTENT, A8_OPENINGS, A8_ROOMS, A8_WINDOWS, splitA8Walls } from "@/lib/plans/a8";
import { A10_DOORS, A10_EXTENT, A10_OPENINGS, A10_ROOMS, A10_WINDOWS, splitA10Walls } from "@/lib/plans/a10";
import { B1_DOORS, B1_EXTENT, B1_OPENINGS, B1_ROOMS, B1_WINDOWS, splitB1Walls } from "@/lib/plans/b1";
import { B2_DOORS, B2_EXTENT, B2_OPENINGS, B2_ROOMS, B2_WINDOWS, splitB2Walls } from "@/lib/plans/b2";
import { B3_DOORS, B3_EXTENT, B3_OPENINGS, B3_ROOMS, B3_WINDOWS, splitB3Walls } from "@/lib/plans/b3";
import { B4_DOORS, B4_EXTENT, B4_OPENINGS, B4_ROOMS, B4_WINDOWS, splitB4Walls } from "@/lib/plans/b4";
import { B5_DOORS, B5_EXTENT, B5_OPENINGS, B5_ROOMS, B5_WINDOWS, splitB5Walls } from "@/lib/plans/b5";
import { B6_DOORS, B6_EXTENT, B6_OPENINGS, B6_ROOMS, B6_WINDOWS, splitB6Walls } from "@/lib/plans/b6";
import { B7_DOORS, B7_EXTENT, B7_OPENINGS, B7_ROOMS, B7_WINDOWS, splitB7Walls } from "@/lib/plans/b7";
import { B8_DOORS, B8_EXTENT, B8_OPENINGS, B8_ROOMS, B8_WINDOWS, splitB8Walls } from "@/lib/plans/b8";
import { B9_DOORS, B9_EXTENT, B9_OPENINGS, B9_ROOMS, B9_WINDOWS, splitB9Walls } from "@/lib/plans/b9";
import { B10_DOORS, B10_EXTENT, B10_OPENINGS, B10_ROOMS, B10_WINDOWS, splitB10Walls } from "@/lib/plans/b10";
import { B11_DOORS, B11_EXTENT, B11_OPENINGS, B11_ROOMS, B11_WINDOWS, splitB11Walls } from "@/lib/plans/b11";
import { B12_DOORS, B12_EXTENT, B12_OPENINGS, B12_ROOMS, B12_WINDOWS, splitB12Walls } from "@/lib/plans/b12";
import { B13_DOORS, B13_EXTENT, B13_OPENINGS, B13_ROOMS, B13_WINDOWS, splitB13Walls } from "@/lib/plans/b13";
import { B14_DOORS, B14_EXTENT, B14_OPENINGS, B14_ROOMS, B14_WINDOWS, splitB14Walls } from "@/lib/plans/b14";
import { B15_DOORS, B15_EXTENT, B15_OPENINGS, B15_ROOMS, B15_WINDOWS, splitB15Walls } from "@/lib/plans/b15";

export type CadRoomKind = "room" | "wet" | "balcony" | "utility" | "corridor";

export type CadRoom = {
  id: string
  label: string
  dim: string | null
  kind: CadRoomKind
  x: number
  y: number
  w: number
  h: number
};

export type CadDoor = {
  id: string
  wall: "n" | "e" | "s" | "w"
  x: number
  y: number
  length: number
  swing: "cw" | "ccw"
  entrance?: boolean
};

export type CadWindow = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type CadOpening = {
  id: string
  x: number
  y: number
  w: number
  h: number
};

export type CadWall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer?: boolean
  parapet?: boolean
};

export type CadExtent = {
  x: number
  y: number
  w: number
  h: number
};

export type CadPlan = {
  rooms: readonly CadRoom[]
  doors: readonly CadDoor[]
  windows: readonly CadWindow[]
  openings: readonly CadOpening[]
  walls: readonly CadWall[]
  extent: CadExtent
};

function cad(
  rooms: readonly CadRoom[],
  doors: readonly CadDoor[],
  windows: readonly CadWindow[],
  openings: readonly CadOpening[],
  walls: readonly CadWall[],
  extent: CadExtent,
): CadPlan {
  return { rooms, doors, windows, openings, walls, extent };
}

const CAD_BY_KEY: Record<string, () => CadPlan> = {
  A1: () => cad(A1_ROOMS, A1_DOORS, A1_WINDOWS, A1_OPENINGS, splitA1Walls(), A1_EXTENT),
  A2: () => cad(A2_ROOMS, A2_DOORS, A2_WINDOWS, A2_OPENINGS, splitA2Walls(), A2_EXTENT),
  A3: () => cad(A3_ROOMS, A3_DOORS, A3_WINDOWS, A3_OPENINGS, splitA3Walls(), A3_EXTENT),
  A4: () => cad(A4_ROOMS, A4_DOORS, A4_WINDOWS, A4_OPENINGS, splitA4Walls(), A4_EXTENT),
  A6: () => cad(A6_ROOMS, A6_DOORS, A6_WINDOWS, A6_OPENINGS, splitA6Walls(), A6_EXTENT),
  A7: () => cad(A7_ROOMS, A7_DOORS, A7_WINDOWS, A7_OPENINGS, splitA7Walls(), A7_EXTENT),
  A8: () => cad(A8_ROOMS, A8_DOORS, A8_WINDOWS, A8_OPENINGS, splitA8Walls(), A8_EXTENT),
  A10: () => cad(A10_ROOMS, A10_DOORS, A10_WINDOWS, A10_OPENINGS, splitA10Walls(), A10_EXTENT),
  B1: () => cad(B1_ROOMS, B1_DOORS, B1_WINDOWS, B1_OPENINGS, splitB1Walls(), B1_EXTENT),
  B2: () => cad(B2_ROOMS, B2_DOORS, B2_WINDOWS, B2_OPENINGS, splitB2Walls(), B2_EXTENT),
  B3: () => cad(B3_ROOMS, B3_DOORS, B3_WINDOWS, B3_OPENINGS, splitB3Walls(), B3_EXTENT),
  B4: () => cad(B4_ROOMS, B4_DOORS, B4_WINDOWS, B4_OPENINGS, splitB4Walls(), B4_EXTENT),
  B5: () => cad(B5_ROOMS, B5_DOORS, B5_WINDOWS, B5_OPENINGS, splitB5Walls(), B5_EXTENT),
  B6: () => cad(B6_ROOMS, B6_DOORS, B6_WINDOWS, B6_OPENINGS, splitB6Walls(), B6_EXTENT),
  B7: () => cad(B7_ROOMS, B7_DOORS, B7_WINDOWS, B7_OPENINGS, splitB7Walls(), B7_EXTENT),
  B8: () => cad(B8_ROOMS, B8_DOORS, B8_WINDOWS, B8_OPENINGS, splitB8Walls(), B8_EXTENT),
  B9: () => cad(B9_ROOMS, B9_DOORS, B9_WINDOWS, B9_OPENINGS, splitB9Walls(), B9_EXTENT),
  B10: () => cad(B10_ROOMS, B10_DOORS, B10_WINDOWS, B10_OPENINGS, splitB10Walls(), B10_EXTENT),
  B11: () => cad(B11_ROOMS, B11_DOORS, B11_WINDOWS, B11_OPENINGS, splitB11Walls(), B11_EXTENT),
  B12: () => cad(B12_ROOMS, B12_DOORS, B12_WINDOWS, B12_OPENINGS, splitB12Walls(), B12_EXTENT),
  B13: () => cad(B13_ROOMS, B13_DOORS, B13_WINDOWS, B13_OPENINGS, splitB13Walls(), B13_EXTENT),
  B14: () => cad(B14_ROOMS, B14_DOORS, B14_WINDOWS, B14_OPENINGS, splitB14Walls(), B14_EXTENT),
  B15: () => cad(B15_ROOMS, B15_DOORS, B15_WINDOWS, B15_OPENINGS, splitB15Walls(), B15_EXTENT),
};

/** Brochure 2D geometry for units that have a CAD plan. A5 and A9 still use the schematic fallback. */
export function cadPlanForFlat(input: { wing?: string; unit?: number | string }): CadPlan | null {
  const key = `${input.wing ?? ""}${Number(input.unit)}`;
  return CAD_BY_KEY[key]?.() ?? null;
}
