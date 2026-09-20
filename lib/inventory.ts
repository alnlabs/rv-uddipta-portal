import templates from "@/data/unit-templates.json";
import { formatFlatNumber, parseFlatNumber } from "@/lib/flatNumber";

export type UnitSpec = {
  wing: "A" | "B";
  unit: number;
  type: "2BHK" | "3BHK";
  facing: "E" | "W";
  areaSqft: number;
};

export type InventoryFlat = {
  flatNumber: string;
  wing: "A" | "B";
  floor: number;
  unit: number;
  type: "2BHK" | "3BHK";
  facing: "E" | "W";
  areaSqft: number;
};

const skip = new Set(
  templates.clubhouseSkip.map(([wing, unit]) => `${wing}${unit}`),
);

function toFlat(floor: number, spec: UnitSpec): InventoryFlat {
  return {
    flatNumber: formatFlatNumber(spec.wing, floor, spec.unit),
    wing: spec.wing,
    floor,
    unit: spec.unit,
    type: spec.type as InventoryFlat["type"],
    facing: spec.facing as InventoryFlat["facing"],
    areaSqft: spec.areaSqft,
  };
}

export function buildInventory(): InventoryFlat[] {
  const flats: InventoryFlat[] = templates.floor1.map((spec) =>
    toFlat(1, spec as UnitSpec),
  );

  for (let floor = 2; floor <= 10; floor += 1) {
    for (const spec of templates.typical) {
      if (floor <= 3 && skip.has(`${spec.wing}${spec.unit}`)) continue;
      flats.push(toFlat(floor, spec as UnitSpec));
    }
  }

  return flats;
}

export const INVENTORY = buildInventory();

export const INVENTORY_BY_NUMBER = new Map(
  INVENTORY.map((flat) => [flat.flatNumber, flat]),
);

export function findInventoryFlat(raw: string) {
  const parsed = parseFlatNumber(raw);
  if (!parsed) return null;
  return INVENTORY_BY_NUMBER.get(parsed.flatNumber) ?? null;
}

export function summarizeInventory(flats: InventoryFlat[] = INVENTORY) {
  const two = flats.filter((flat) => flat.type === "2BHK");
  const three = flats.filter((flat) => flat.type === "3BHK");
  const areas = flats.map((flat) => flat.areaSqft);
  return {
    total: flats.length,
    twoBhk: two.length,
    threeBhk: three.length,
    minArea: Math.min(...areas),
    maxArea: Math.max(...areas),
    twoMin: Math.min(...two.map((flat) => flat.areaSqft)),
    twoMax: Math.max(...two.map((flat) => flat.areaSqft)),
    threeMin: Math.min(...three.map((flat) => flat.areaSqft)),
    threeMax: Math.max(...three.map((flat) => flat.areaSqft)),
  };
}

export function groupInventoryByFloor(flats: InventoryFlat[] = INVENTORY) {
  const byFloor = new Map<number, InventoryFlat[]>();
  for (const flat of flats) {
    const list = byFloor.get(flat.floor) ?? [];
    list.push(flat);
    byFloor.set(flat.floor, list);
  }

  return [...byFloor.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([floor, floorFlats]) => ({
      floor,
      flats: floorFlats.sort((a, b) => a.wing.localeCompare(b.wing) || a.unit - b.unit),
    }));
}
