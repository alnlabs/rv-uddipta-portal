export type PlanKind = "room" | "wet" | "balcony" | "foyer";

export type PlanRoom = {
  id: string
  label: string
  kind: PlanKind
  x: number
  y: number
  w: number
  h: number
};

export type PlanFurnish = {
  id: string
  kind:
    | "bed"
    | "sofa"
    | "table"
    | "chair"
    | "counter"
    | "wardrobe"
    | "wc"
    | "basin"
    | "stove"
  x: number
  y: number
  w: number
  h: number
};

export type PlanOpening = {
  id: string
  kind: "door" | "window"
  x: number
  y: number
  w: number
  h: number
};

export type PlanEdge = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer: boolean
};

export type FlatPlanInput = {
  flatNumber: string
  wing: string
  floor: number
  unit: number
  type: string
  facing: string
  areaSqft?: number | null
};

export type FlatPlan = {
  width: number
  height: number
  family: "2bhk" | "3bhk" | "3bhk-large"
  facing: "E" | "W"
  rooms: PlanRoom[]
  furniture: PlanFurnish[]
  openings: PlanOpening[]
};

function room(
  id: string,
  label: string,
  kind: PlanKind,
  x: number,
  y: number,
  w: number,
  h: number,
): PlanRoom {
  return { id, label, kind, x, y, w, h };
}

function piece(
  id: string,
  kind: PlanFurnish["kind"],
  x: number,
  y: number,
  w: number,
  h: number,
): PlanFurnish {
  return { id, kind, x, y, w, h };
}

function opening(
  id: string,
  kind: PlanOpening["kind"],
  x: number,
  y: number,
  w: number,
  h: number,
): PlanOpening {
  return { id, kind, x, y, w, h };
}

/**
 * Brochure typical: corridor entry at x=0, living + balconies on the
 * facing facade. 2BHK+2T / 3BHK+3T with kitchen–utility at dining.
 */
function twoBhk(): Omit<FlatPlan, "facing"> {
  return {
    width: 108,
    height: 80,
    family: "2bhk",
    rooms: [
      room("foyer", "Foyer", "foyer", 0, 31, 18, 18),
      room("living", "Living", "room", 18, 27, 62, 30),
      room("dining", "Dining", "room", 18, 9, 34, 18),
      room("kitchen", "Kitchen", "room", 0, 9, 18, 22),
      room("utility", "Utility", "wet", 0, 0, 18, 9),
      room("bath2", "T2", "wet", 52, 7, 16, 20),
      room("bed2", "Bedroom 2", "room", 68, 0, 28, 27),
      room("master", "Master bedroom", "room", 18, 57, 56, 23),
      room("mbath", "T1", "wet", 74, 57, 14, 14),
      room("balc-l", "Living balcony", "balcony", 96, 29, 12, 26),
      room("balc-m", "Sit-out", "balcony", 96, 57, 12, 23),
      room("balc-2", "Sit-out", "balcony", 96, 0, 12, 24),
    ],
    furniture: [
      piece("sofa", "sofa", 32, 38, 26, 11),
      piece("table", "table", 26, 13, 16, 10),
      piece("c1", "chair", 23, 14, 3.2, 3.2),
      piece("c2", "chair", 42, 14, 3.2, 3.2),
      piece("c3", "chair", 30, 10.2, 3.2, 3.2),
      piece("c4", "chair", 30, 21.4, 3.2, 3.2),
      piece("counter", "counter", 1.4, 16, 15, 5.4),
      piece("stove", "stove", 2, 22.4, 6, 4.2),
      piece("bed-m", "bed", 26, 61, 26, 16),
      piece("ward-m", "wardrobe", 54, 61, 7, 16),
      piece("bed-2", "bed", 74, 4, 18, 15),
      piece("ward-2", "wardrobe", 70, 20, 16, 5),
      piece("wc-m", "wc", 76, 59, 4.2, 5.5),
      piece("basin-m", "basin", 82, 59.5, 4.5, 3.4),
      piece("wc-2", "wc", 54, 9, 4.2, 5.5),
      piece("basin-2", "basin", 60, 9, 4.5, 3.4),
    ],
    openings: [
      opening("entry", "door", 0, 36, 1.4, 8),
      opening("foyer-live", "door", 17.2, 35, 1.8, 8),
      opening("live-dine", "door", 30, 26.2, 10, 1.6),
      opening("dine-kit", "door", 17.2, 13, 1.8, 8),
      opening("master", "door", 36, 56.2, 9, 1.6),
      opening("bed2", "door", 67.2, 10, 1.8, 8),
      opening("win-l", "window", 94.6, 34, 1.8, 16),
      opening("win-m", "window", 94.6, 62, 1.8, 12),
      opening("win-2", "window", 94.6, 6, 1.8, 12),
    ],
  };
}

function threeBhk(): Omit<FlatPlan, "facing"> {
  return {
    width: 110,
    height: 92,
    family: "3bhk",
    rooms: [
      room("foyer", "Foyer", "foyer", 0, 38, 17, 18),
      room("living", "Living", "room", 17, 32, 61, 30),
      room("dining", "Dining", "room", 17, 16, 32, 16),
      room("kitchen", "Kitchen", "room", 0, 16, 17, 22),
      room("utility", "Utility", "wet", 0, 4, 17, 12),
      room("bed3", "Bedroom 3", "room", 17, 0, 38, 16),
      room("bath3", "T3", "wet", 55, 0, 15, 16),
      room("bed2", "Bedroom 2", "room", 70, 0, 26, 28),
      room("bath2", "T2", "wet", 55, 16, 15, 16),
      room("master", "Master bedroom", "room", 17, 62, 57, 30),
      room("mbath", "T1", "wet", 74, 62, 16, 16),
      room("balc-l", "Living balcony", "balcony", 96, 33, 14, 27),
      room("balc-m", "Sit-out", "balcony", 96, 64, 14, 28),
      room("balc-2", "Sit-out", "balcony", 96, 0, 14, 26),
    ],
    furniture: [
      piece("sofa", "sofa", 30, 41, 28, 11),
      piece("table", "table", 24, 19, 16, 10),
      piece("c1", "chair", 21, 20, 3.2, 3.2),
      piece("c2", "chair", 40, 20, 3.2, 3.2),
      piece("c3", "chair", 28, 16.4, 3.2, 3.2),
      piece("c4", "chair", 28, 27.4, 3.2, 3.2),
      piece("counter", "counter", 1.5, 22, 14, 5.4),
      piece("stove", "stove", 2, 28.2, 6, 4.2),
      piece("bed-m", "bed", 26, 68, 28, 18),
      piece("ward-m", "wardrobe", 56, 68, 7, 18),
      piece("bed-2", "bed", 76, 5, 16, 16),
      piece("bed-3", "bed", 24, 3, 22, 10),
      piece("wc-m", "wc", 76, 64, 4.2, 5.5),
      piece("basin-m", "basin", 82, 64.5, 4.5, 3.4),
      piece("wc-2", "wc", 57, 18, 4.2, 5.5),
      piece("basin-2", "basin", 63, 18, 4.5, 3.4),
      piece("wc-3", "wc", 57, 2, 4.2, 5.5),
    ],
    openings: [
      opening("entry", "door", 0, 42, 1.4, 8),
      opening("foyer-live", "door", 16.2, 41, 1.8, 9),
      opening("live-dine", "door", 28, 31.2, 12, 1.6),
      opening("dine-kit", "door", 16.2, 20, 1.8, 8),
      opening("master", "door", 36, 61.2, 10, 1.6),
      opening("bed2", "door", 69.2, 10, 1.8, 8),
      opening("bed3", "door", 30, 15.2, 10, 1.6),
      opening("win-l", "window", 94.6, 38, 1.8, 16),
      opening("win-m", "window", 94.6, 70, 1.8, 14),
      opening("win-2", "window", 94.6, 6, 1.8, 14),
    ],
  };
}

function threeBhkLarge(): Omit<FlatPlan, "facing"> {
  return {
    width: 118,
    height: 98,
    family: "3bhk-large",
    rooms: [
      room("foyer", "Foyer", "foyer", 0, 40, 18, 20),
      room("living", "Living", "room", 18, 32, 68, 32),
      room("dining", "Dining", "room", 18, 14, 36, 18),
      room("kitchen", "Kitchen", "room", 0, 14, 18, 22),
      room("utility", "Utility", "wet", 0, 2, 18, 12),
      room("store", "Store", "room", 18, 0, 14, 14),
      room("bed3", "Bedroom 3", "room", 32, 0, 36, 14),
      room("bath3", "T3", "wet", 68, 0, 14, 14),
      room("bed2", "Bedroom 2", "room", 82, 0, 22, 28),
      room("bath2", "T2", "wet", 68, 14, 14, 16),
      room("master", "Master bedroom", "room", 18, 64, 58, 34),
      room("dress", "Dress", "room", 76, 64, 14, 16),
      room("mbath", "T1", "wet", 76, 80, 20, 18),
      room("balc-l", "Living balcony", "balcony", 104, 34, 14, 28),
      room("balc-m", "Sit-out", "balcony", 104, 66, 14, 32),
      room("balc-2", "Sit-out", "balcony", 104, 0, 14, 28),
    ],
    furniture: [
      piece("sofa", "sofa", 34, 43, 30, 12),
      piece("table", "table", 28, 18, 18, 10),
      piece("c1", "chair", 25, 19, 3.2, 3.2),
      piece("c2", "chair", 46, 19, 3.2, 3.2),
      piece("c3", "chair", 33, 15.2, 3.2, 3.2),
      piece("c4", "chair", 33, 26.4, 3.2, 3.2),
      piece("counter", "counter", 1.6, 20, 15, 5.6),
      piece("stove", "stove", 2.2, 26.4, 6, 4.2),
      piece("bed-m", "bed", 28, 72, 30, 20),
      piece("ward-m", "wardrobe", 60, 72, 8, 20),
      piece("bed-2", "bed", 86, 5, 14, 16),
      piece("bed-3", "bed", 38, 2.4, 22, 9),
      piece("wc-m", "wc", 78, 82, 4.2, 5.5),
      piece("basin-m", "basin", 86, 82, 4.5, 3.4),
    ],
    openings: [
      opening("entry", "door", 0, 45, 1.4, 8),
      opening("foyer-live", "door", 17.2, 44, 1.8, 10),
      opening("live-dine", "door", 32, 31.2, 14, 1.6),
      opening("dine-kit", "door", 17.2, 18, 1.8, 8),
      opening("master", "door", 40, 63.2, 12, 1.6),
      opening("bed2", "door", 81.2, 10, 1.8, 8),
      opening("bed3", "door", 42, 13.2, 10, 1.6),
      opening("win-l", "window", 102.6, 40, 1.8, 16),
      opening("win-m", "window", 102.6, 72, 1.8, 16),
      opening("win-2", "window", 102.6, 6, 1.8, 14),
    ],
  };
}

function flipBox<T extends { x: number; w: number }>(box: T, width: number): T {
  return { ...box, x: width - box.x - box.w };
}

function facingCode(facing: string): "E" | "W" {
  return facing.toUpperCase().startsWith("W") ? "W" : "E";
}

function familyFor(input: FlatPlanInput): FlatPlan["family"] {
  if (!input.type.toUpperCase().includes("3")) return "2bhk";
  if ((input.areaSqft ?? 0) >= 1850 || `${input.wing}${input.unit}` === "A1") {
    return "3bhk-large";
  }
  return "3bhk";
}

export function planForFlat(input: FlatPlanInput): FlatPlan {
  const family = familyFor(input);
  const base =
    family === "2bhk"
      ? twoBhk()
      : family === "3bhk-large"
        ? threeBhkLarge()
        : threeBhk();
  const facing = facingCode(input.facing);
  if (facing === "E") return { ...base, facing };
  return {
    ...base,
    facing,
    rooms: base.rooms.map((item) => flipBox(item, base.width)),
    furniture: base.furniture.map((item) => flipBox(item, base.width)),
    openings: base.openings.map((item) => flipBox(item, base.width)),
  };
}

export function roomsForFlat(type: string, facing: string) {
  return planForFlat({
    flatNumber: "",
    wing: "A",
    floor: 1,
    unit: 1,
    type,
    facing,
  }).rooms;
}

export function planCaption(input: FlatPlanInput) {
  const plan = planForFlat(input);
  const baths = plan.family === "2bhk" ? "2 BHK + 2T" : "3 BHK + 3T";
  const face = plan.facing === "W" ? "west facing" : "east facing";
  const size = input.areaSqft
    ? `${input.areaSqft.toLocaleString()} sft`
    : null;
  return [baths, face, size, "brochure typical"].filter(Boolean).join(" · ");
}

function norm(x1: number, y1: number, x2: number, y2: number) {
  if (x1 < x2 - 0.01 || (Math.abs(x1 - x2) < 0.01 && y1 <= y2)) {
    return { x1, y1, x2, y2 };
  }
  return { x1: x2, y1: y2, x2: x1, y2: y1 };
}

function edgeKey(edge: { x1: number; y1: number; x2: number; y2: number }) {
  const n = norm(edge.x1, edge.y1, edge.x2, edge.y2);
  return `${n.x1.toFixed(1)},${n.y1.toFixed(1)}-${n.x2.toFixed(1)},${n.y2.toFixed(1)}`;
}

function overlapsOpening(
  edge: PlanEdge,
  hole: PlanOpening,
  pad = 0.9,
) {
  const horizontal = Math.abs(edge.y1 - edge.y2) < 0.2;
  if (horizontal) {
    const y = edge.y1;
    if (hole.y + hole.h < y - pad || hole.y > y + pad) return false;
    const left = Math.max(Math.min(edge.x1, edge.x2), hole.x);
    const right = Math.min(Math.max(edge.x1, edge.x2), hole.x + hole.w);
    return right - left > 1.2;
  }
  const x = edge.x1;
  if (hole.x + hole.w < x - pad || hole.x > x + pad) return false;
  const top = Math.max(Math.min(edge.y1, edge.y2), hole.y);
  const bottom = Math.min(Math.max(edge.y1, edge.y2), hole.y + hole.h);
  return bottom - top > 1.2;
}

function splitEdge(edge: PlanEdge, holes: PlanOpening[]): PlanEdge[] {
  const hits = holes.filter((hole) => overlapsOpening(edge, hole));
  if (!hits.length) return [edge];
  const horizontal = Math.abs(edge.y1 - edge.y2) < 0.2;
  if (horizontal) {
    const y = edge.y1;
    const start = Math.min(edge.x1, edge.x2);
    const end = Math.max(edge.x1, edge.x2);
    const cuts = hits
      .map((hole) => ({
        a: Math.max(start, hole.x),
        b: Math.min(end, hole.x + hole.w),
      }))
      .sort((left, right) => left.a - right.a);
    const parts: PlanEdge[] = [];
    let cursor = start;
    for (const cut of cuts) {
      if (cut.a - cursor > 0.8) {
        parts.push({ x1: cursor, y1: y, x2: cut.a, y2: y, outer: edge.outer });
      }
      cursor = Math.max(cursor, cut.b);
    }
    if (end - cursor > 0.8) {
      parts.push({ x1: cursor, y1: y, x2: end, y2: y, outer: edge.outer });
    }
    return parts;
  }
  const x = edge.x1;
  const start = Math.min(edge.y1, edge.y2);
  const end = Math.max(edge.y1, edge.y2);
  const cuts = hits
    .map((hole) => ({
      a: Math.max(start, hole.y),
      b: Math.min(end, hole.y + hole.h),
    }))
    .sort((left, right) => left.a - right.a);
  const parts: PlanEdge[] = [];
  let cursor = start;
  for (const cut of cuts) {
    if (cut.a - cursor > 0.8) {
      parts.push({ x1: x, y1: cursor, x2: x, y2: cut.a, outer: edge.outer });
    }
    cursor = Math.max(cursor, cut.b);
  }
  if (end - cursor > 0.8) {
    parts.push({ x1: x, y1: cursor, x2: x, y2: end, outer: edge.outer });
  }
  return parts;
}

export function edgesForPlan(plan: FlatPlan): PlanEdge[] {
  const map = new Map<string, PlanEdge & { count: number }>();
  for (const item of plan.rooms.filter((row) => row.kind !== "balcony")) {
    const { x, y, w, h } = item;
    const raw = [
      { x1: x, y1: y, x2: x + w, y2: y, outer: true },
      { x1: x, y1: y + h, x2: x + w, y2: y + h, outer: true },
      { x1: x, y1: y, x2: x, y2: y + h, outer: true },
      { x1: x + w, y1: y, x2: x + w, y2: y + h, outer: true },
    ];
    for (const edge of raw) {
      const key = edgeKey(edge);
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { ...norm(edge.x1, edge.y1, edge.x2, edge.y2), outer: true, count: 1 });
    }
  }
  const unique = [...map.values()].map((edge) => ({
    x1: edge.x1,
    y1: edge.y1,
    x2: edge.x2,
    y2: edge.y2,
    outer: edge.count === 1,
  }));
  return unique.flatMap((edge) => splitEdge(edge, plan.openings));
}

export function lintelsForPlan(plan: FlatPlan): PlanOpening[] {
  return plan.openings.filter((item) => item.kind === "door");
}
