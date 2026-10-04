import { CORRIDORS, FT, UNIT_FOOTPRINT, unitPlanSize } from "@/lib/layout3d";

/**
 * Physical corridor decks, cut into non-overlapping pieces.
 * A new piece starts where the deck changes direction, changes width,
 * or meets another deck. Every modelled corridor cell belongs to one piece.
 */

export type CorridorPrefix = "AW" | "AE" | "AN" | "AS" | "BW" | "BE" | "BN" | "BS";

export type CorridorSegment = {
  id: string
  prefix: CorridorPrefix
  x0: number
  x1: number
  z0: number
  z1: number
  /** Narrow side of this piece, metres. */
  widthM: number
  /** Long side of this piece, metres. */
  lengthM: number
  /** Plan area from the piece outline, square feet. */
  areaSqFt: number
  widthText: string
  lengthText: string
  areaText: string
  /** Flats whose entrance faces this section. */
  flats: string[]
  connectedTo: string[]
};

export type CorridorGap = {
  x0: number
  x1: number
  z0: number
  z1: number
};

const SNAP = 0.01;
const SLIVER = 0.12;

type Cell = {
  x0: number
  x1: number
  z0: number
  z1: number
  key: string
  alongZ?: boolean
};

function snap(value: number) {
  return Math.round(value / SNAP) * SNAP;
}

function feetText(meters: number) {
  const value = Math.round((meters / FT) * 10) / 10;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text}′`;
}

function areaText(sqft: number) {
  const value = Math.round(sqft * 10) / 10;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text} sq ft`;
}

function clusterEdges(values: number[]) {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const map = new Map<number, number>();
  let group: number[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const target = group[Math.floor(group.length / 2)];
    for (const value of group) map.set(value, target);
    group = [];
  };
  for (const value of sorted) {
    if (group.length > 0 && value - group[group.length - 1] >= SLIVER) flush();
    group.push(value);
  }
  flush();
  return map;
}

function boxes() {
  const raw = CORRIDORS.map((corridor) => ({
    id: corridor.id,
    x0: snap(corridor.x - corridor.size[0] / 2),
    x1: snap(corridor.x + corridor.size[0] / 2),
    z0: snap(corridor.z - corridor.size[1] / 2),
    z1: snap(corridor.z + corridor.size[1] / 2),
  }));
  const mapX = clusterEdges(raw.flatMap((deck) => [deck.x0, deck.x1]));
  const mapZ = clusterEdges(raw.flatMap((deck) => [deck.z0, deck.z1]));
  return raw
    .map((deck) => {
      let x0 = mapX.get(deck.x0) ?? deck.x0;
      let x1 = mapX.get(deck.x1) ?? deck.x1;
      let z0 = mapZ.get(deck.z0) ?? deck.z0;
      let z1 = mapZ.get(deck.z1) ?? deck.z1;
      if (x0 > x1) [x0, x1] = [x1, x0];
      if (z0 > z1) [z0, z1] = [z1, z0];
      return { ...deck, x0, x1, z0, z1 };
    })
    .filter((deck) => deck.x1 - deck.x0 > SNAP && deck.z1 - deck.z0 > SNAP);
}

function atoms(): Cell[] {
  const decks = boxes();
  const xs = [...new Set(decks.flatMap((deck) => [deck.x0, deck.x1]))].sort((a, b) => a - b);
  const zs = [...new Set(decks.flatMap((deck) => [deck.z0, deck.z1]))].sort((a, b) => a - b);
  const cells: Cell[] = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < zs.length - 1; j += 1) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const z0 = zs[j];
      const z1 = zs[j + 1];
      if (x1 - x0 < SNAP / 2 || z1 - z0 < SNAP / 2) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const sources = decks
        .filter((deck) => cx > deck.x0 && cx < deck.x1 && cz > deck.z0 && cz < deck.z1)
        .map((deck) => deck.id)
        .sort();
      if (sources.length === 0) continue;
      cells.push({ x0, x1, z0, z1, key: sources.join("+") });
    }
  }
  return cells;
}

/** Corner crumbs from snapped edges. Not a passage. */
function isCrumb(cell: Cell) {
  return cell.x1 - cell.x0 < SLIVER && cell.z1 - cell.z0 < SLIVER;
}

function merge(cells: Cell[]): Cell[] {
  const groups = new Map<string, Cell[]>();
  for (const cell of cells) {
    const list = groups.get(cell.key) ?? [];
    list.push(cell);
    groups.set(cell.key, list);
  }
  const merged: Cell[] = [];
  for (const [key, group] of groups) {
    const rows = new Map<string, Cell[]>();
    for (const cell of group) {
      const rowKey = `${cell.z0}|${cell.z1}`;
      const list = rows.get(rowKey) ?? [];
      list.push(cell);
      rows.set(rowKey, list);
    }
    const runs: Cell[] = [];
    for (const row of rows.values()) {
      row.sort((a, b) => a.x0 - b.x0);
      let current = { ...row[0], key };
      for (let i = 1; i < row.length; i += 1) {
        const next = row[i];
        if (Math.abs(next.x0 - current.x1) < 1e-6) current.x1 = next.x1;
        else {
          runs.push(current);
          current = { ...next, key };
        }
      }
      runs.push(current);
    }
    const used = new Set<number>();
    for (let i = 0; i < runs.length; i += 1) {
      if (used.has(i)) continue;
      const current = { ...runs[i] };
      used.add(i);
      let grew = true;
      while (grew) {
        grew = false;
        for (let j = 0; j < runs.length; j += 1) {
          if (used.has(j)) continue;
          const next = runs[j];
          const sameX =
            Math.abs(next.x0 - current.x0) < 1e-6 && Math.abs(next.x1 - current.x1) < 1e-6;
          if (!sameX) continue;
          if (Math.abs(next.z0 - current.z1) < 1e-6) {
            current.z1 = next.z1;
            used.add(j);
            grew = true;
          } else if (Math.abs(next.z1 - current.z0) < 1e-6) {
            current.z0 = next.z0;
            used.add(j);
            grew = true;
          }
        }
      }
      merged.push(current);
    }
  }
  return merged;
}

/** Cut a straight piece where another piece joins it, so the joint is its own segment. */
function splitAtJoints(pieces: Cell[]) {
  const next: Cell[] = [];
  for (const piece of pieces) {
    const alongZ = piece.z1 - piece.z0 >= piece.x1 - piece.x0;
    const cuts = new Set<number>(alongZ ? [piece.z0, piece.z1] : [piece.x0, piece.x1]);
    for (const other of pieces) {
      if (other === piece || !touches(piece, other)) continue;
      if (alongZ) {
        const start = Math.max(piece.z0, other.z0);
        const end = Math.min(piece.z1, other.z1);
        if (end - start <= 0.25) continue;
        if (start > piece.z0 + 0.25) cuts.add(start);
        if (end < piece.z1 - 0.25) cuts.add(end);
      } else {
        const start = Math.max(piece.x0, other.x0);
        const end = Math.min(piece.x1, other.x1);
        if (end - start <= 0.25) continue;
        if (start > piece.x0 + 0.25) cuts.add(start);
        if (end < piece.x1 - 0.25) cuts.add(end);
      }
    }
    const ordered = [...cuts].sort((a, b) => a - b);
    let start = ordered[0];
    for (let index = 1; index < ordered.length; index += 1) {
      const end = ordered[index];
      if (index < ordered.length - 1 && end - start < 0.2) continue;
      next.push(alongZ ? { ...piece, z0: start, z1: end } : { ...piece, x0: start, x1: end });
      start = end;
    }
  }
  return next;
}

type FlatBox = { id: string; x0: number; x1: number; z0: number; z1: number };

const FLANK = 0.55;

function flatBoxes(): FlatBox[] {
  return Object.entries(UNIT_FOOTPRINT).map(([id, [x, z]]) => {
    const [width, depth] = unitPlanSize(id);
    return { id, x0: x - width / 2, x1: x + width / 2, z0: z - depth / 2, z1: z + depth / 2 };
  });
}

function overlap1d(a0: number, a1: number, b0: number, b1: number) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function flatsBeside(piece: Cell, flats: FlatBox[], side: "west" | "east" | "north" | "south") {
  return flats.filter((flat) => {
    if (side === "west" || side === "east") {
      const gap = side === "west" ? piece.x0 - flat.x1 : flat.x0 - piece.x1;
      if (gap < -0.08 || gap > FLANK) return false;
      return overlap1d(piece.z0, piece.z1, flat.z0, flat.z1) > 0.8;
    }
    const gap = side === "north" ? flat.z0 - piece.z1 : piece.z0 - flat.z1;
    if (gap < -0.08 || gap > FLANK) return false;
    return overlap1d(piece.x0, piece.x1, flat.x0, flat.x1) > 0.8;
  });
}

/**
 * A straight aisle with flats on both sides is two walkable frontages.
 * Short necks and junctions stay one piece so the connection is not split in half.
 */
function splitDoubleLoaded(pieces: Cell[]) {
  const flats = flatBoxes();
  const next: Cell[] = [];
  for (const piece of pieces) {
    const alongZ = piece.z1 - piece.z0 >= piece.x1 - piece.x0;
    const span = alongZ ? piece.x1 - piece.x0 : piece.z1 - piece.z0;
    const length = alongZ ? piece.z1 - piece.z0 : piece.x1 - piece.x0;
    if (span < 0.7 || span > 2.4 || length < 0.9) {
      next.push(piece);
      continue;
    }
    if (alongZ) {
      const west = flatsBeside(piece, flats, "west");
      const east = flatsBeside(piece, flats, "east");
      if (west.length > 0 && east.length > 0) {
        const mid = snap((piece.x0 + piece.x1) / 2);
        next.push({ ...piece, x1: mid }, { ...piece, x0: mid });
        continue;
      }
    } else {
      const north = flatsBeside(piece, flats, "north");
      const south = flatsBeside(piece, flats, "south");
      if (north.length > 0 && south.length > 0) {
        const mid = snap((piece.z0 + piece.z1) / 2);
        next.push({ ...piece, z1: mid }, { ...piece, z0: mid });
        continue;
      }
    }
    next.push(piece);
  }
  return next;
}

/**
 * Split a straight deck where a unit mass stops flanking it.
 * The opening beside the units and the walk between those openings are different sections.
 * The cut is the corridor edge, not a label on the flat.
 */
function splitAtFlatBays(pieces: Cell[]) {
  const flats = flatBoxes();
  const next: Cell[] = [];
  for (const piece of pieces) {
    const alongZ = piece.z1 - piece.z0 >= piece.x1 - piece.x0;
    const cuts = new Set<number>(alongZ ? [piece.z0, piece.z1] : [piece.x0, piece.x1]);
    for (const flat of flats) {
      if (alongZ) {
        const gap =
          flat.x1 <= piece.x0 + 0.08
            ? piece.x0 - flat.x1
            : flat.x0 >= piece.x1 - 0.08
              ? flat.x0 - piece.x1
              : 0;
        if (gap > FLANK) continue;
        if (overlap1d(piece.z0, piece.z1, flat.z0, flat.z1) < 0.4) continue;
        for (const edge of [flat.z0, flat.z1]) {
          if (edge > piece.z0 + 0.35 && edge < piece.z1 - 0.35) cuts.add(snap(edge));
        }
      } else {
        const gap =
          flat.z1 <= piece.z0 + 0.08
            ? piece.z0 - flat.z1
            : flat.z0 >= piece.z1 - 0.08
              ? flat.z0 - piece.z1
              : 0;
        if (gap > FLANK) continue;
        if (overlap1d(piece.x0, piece.x1, flat.x0, flat.x1) < 0.4) continue;
        for (const edge of [flat.x0, flat.x1]) {
          if (edge > piece.x0 + 0.35 && edge < piece.x1 - 0.35) cuts.add(snap(edge));
        }
      }
    }
    const ordered = [...cuts].sort((a, b) => a - b);
    let start = ordered[0];
    for (let index = 1; index < ordered.length; index += 1) {
      const end = ordered[index];
      if (index < ordered.length - 1 && end - start < 0.2) continue;
      next.push(alongZ ? { ...piece, z0: start, z1: end } : { ...piece, x0: start, x1: end });
      start = end;
    }
  }
  return next;
}

/** The BE4 run beside B13, from the spur down to B13’s south face, in three equal lengths. */
function splitBe4Thirds(pieces: Cell[]) {
  const spur = CORRIDORS.find((corridor) => corridor.id === "cBe12");
  if (!spur) return pieces;
  const spurSouth = spur.z - spur.size[1] / 2;
  const b13South = UNIT_FOOTPRINT.B13[1] - unitPlanSize("B13")[1] / 2;
  const next: Cell[] = [];
  for (const piece of pieces) {
    const alongZ = piece.z1 - piece.z0 >= piece.x1 - piece.x0;
    const isBe4 =
      alongZ &&
      piece.x0 > 22 &&
      piece.x1 < 24.2 &&
      Math.abs(piece.z0 - b13South) < 0.05 &&
      Math.abs(piece.z1 - spurSouth) < 0.05;
    if (!isBe4) {
      next.push(piece);
      continue;
    }
    const step = (piece.z1 - piece.z0) / 3;
    for (let index = 0; index < 3; index += 1) {
      next.push({
        ...piece,
        z0: index === 0 ? piece.z0 : snap(piece.z0 + step * index),
        z1: index === 2 ? piece.z1 : snap(piece.z0 + step * (index + 1)),
        alongZ: true,
      });
    }
  }
  return next;
}

/** The east-west run between the cB58 and cB59 spurs, in three equal lengths. */
function splitBn7Thirds(pieces: Cell[]) {
  const westSpur = CORRIDORS.find((corridor) => corridor.id === "cB58");
  const eastSpur = CORRIDORS.find((corridor) => corridor.id === "cB59");
  if (!westSpur || !eastSpur) return pieces;
  const westFace = westSpur.x + westSpur.size[0] / 2;
  const eastFace = eastSpur.x - eastSpur.size[0] / 2;
  const next: Cell[] = [];
  for (const piece of pieces) {
    const isBn7 =
      piece.x1 - piece.x0 > piece.z1 - piece.z0 &&
      Math.abs(piece.x0 - westFace) < 0.05 &&
      Math.abs(piece.x1 - eastFace) < 0.05;
    if (!isBn7) {
      next.push(piece);
      continue;
    }
    const step = (piece.x1 - piece.x0) / 3;
    for (let index = 0; index < 3; index += 1) {
      next.push({
        ...piece,
        x0: index === 0 ? piece.x0 : snap(piece.x0 + step * index),
        x1: index === 2 ? piece.x1 : snap(piece.x0 + step * (index + 1)),
        alongZ: false,
      });
    }
  }
  return next;
}

function prefixFor(cell: Cell): CorridorPrefix {
  const spanX = cell.x1 - cell.x0;
  const spanZ = cell.z1 - cell.z0;
  const inNorthSouthAisle =
    spanX <= 1.4 &&
    ((cell.x0 >= 0.9 && cell.x1 <= 2.4) ||
      (cell.x0 >= 10.7 && cell.x1 <= 12.3) ||
      (cell.x0 >= 22.4 && cell.x1 <= 24));
  const alongZ =
    cell.alongZ ?? (inNorthSouthAisle ? spanZ + 0.25 >= spanX : spanZ >= spanX);
  const cx = (cell.x0 + cell.x1) / 2;
  const cz = (cell.z0 + cell.z1) / 2;
  const wingA = cx < 8;
  if (!alongZ) {
    if (wingA) return cz >= -11 ? "AN" : "AS";
    return cz >= -8 ? "BN" : "BS";
  }
  if (wingA) return cx >= 1.59 ? "AE" : "AW";
  if (cx >= 16) return "BE";
  return "BW";
}

function neighborFlats(piece: Cell, flats: FlatBox[]) {
  const near = 0.2;
  return flats
    .filter((flat) => {
      const zOverlap = overlap1d(piece.z0, piece.z1, flat.z0, flat.z1);
      const xOverlap = overlap1d(piece.x0, piece.x1, flat.x0, flat.x1);
      const zBeside = zOverlap > 0.3 || Math.abs(flat.z1 - piece.z0) <= 0.08 || Math.abs(flat.z0 - piece.z1) <= 0.08;
      const xBeside = xOverlap > 0.3 || Math.abs(flat.x1 - piece.x0) <= 0.08 || Math.abs(flat.x0 - piece.x1) <= 0.08;
      const touchWest = piece.x0 - flat.x1 >= -0.08 && piece.x0 - flat.x1 <= near && zBeside;
      const touchEast = flat.x0 - piece.x1 >= -0.08 && flat.x0 - piece.x1 <= near && zBeside;
      const touchSouth = piece.z0 - flat.z1 >= -0.08 && piece.z0 - flat.z1 <= near && xBeside;
      const touchNorth = flat.z0 - piece.z1 >= -0.08 && flat.z0 - piece.z1 <= near && xBeside;
      return touchWest || touchEast || touchSouth || touchNorth;
    })
    .map((flat) => flat.id)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function compareId(a: string, b: string) {
  const prefixA = a.slice(0, 2);
  const prefixB = b.slice(0, 2);
  if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
  return Number(a.slice(2)) - Number(b.slice(2));
}

function touches(a: Cell, b: Cell) {
  const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const overlapZ = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
  const gapX = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
  const gapZ = Math.max(0, Math.max(a.z0, b.z0) - Math.min(a.z1, b.z1));
  if (gapX <= 0.08 && overlapZ > 0.12) return true;
  if (gapZ <= 0.08 && overlapX > 0.12) return true;
  return false;
}

function build() {
  const cells = atoms().filter((cell) => !isCrumb(cell));
  const pieces = splitBn7Thirds(
    splitBe4Thirds(splitDoubleLoaded(splitAtFlatBays(splitAtJoints(merge(cells))))),
  );
  const flats = flatBoxes();
  const grouped: Record<CorridorPrefix, Cell[]> = {
    AW: [],
    AE: [],
    AN: [],
    AS: [],
    BW: [],
    BE: [],
    BN: [],
    BS: [],
  };
  for (const piece of pieces) grouped[prefixFor(piece)].push(piece);
  const named: (Cell & { id: string; prefix: CorridorPrefix })[] = [];
  for (const prefix of ["AW", "AE", "AN", "AS", "BW", "BE", "BN", "BS"] as const) {
    grouped[prefix].sort((a, b) => {
      const az = (a.z0 + a.z1) / 2;
      const bz = (b.z0 + b.z1) / 2;
      const ax = (a.x0 + a.x1) / 2;
      const bx = (b.x0 + b.x1) / 2;
      return bz - az || ax - bx;
    });
    grouped[prefix].forEach((piece, index) => {
      named.push({ ...piece, prefix, id: `${prefix}${index + 1}` });
    });
  }
  const segments: CorridorSegment[] = named.map((piece) => {
    const spanX = piece.x1 - piece.x0;
    const spanZ = piece.z1 - piece.z0;
    const widthM = Math.min(spanX, spanZ);
    const lengthM = Math.max(spanX, spanZ);
    const areaSqFt = (spanX * spanZ) / (FT * FT);
    const connectedTo = named
      .filter((other) => other.id !== piece.id && touches(piece, other))
      .map((other) => other.id)
      .sort(compareId);
    return {
      id: piece.id,
      prefix: piece.prefix,
      x0: piece.x0,
      x1: piece.x1,
      z0: piece.z0,
      z1: piece.z1,
      widthM,
      lengthM,
      areaSqFt,
      widthText: feetText(widthM),
      lengthText: feetText(lengthM),
      areaText: areaText(areaSqFt),
      flats: neighborFlats(piece, flats),
      connectedTo,
    };
  });

  const gaps: CorridorGap[] = [];
  for (const cell of cells) {
    const cx = (cell.x0 + cell.x1) / 2;
    const cz = (cell.z0 + cell.z1) / 2;
    const covered = segments.some(
      (segment) => cx > segment.x0 && cx < segment.x1 && cz > segment.z0 && cz < segment.z1,
    );
    if (!covered) gaps.push({ x0: cell.x0, x1: cell.x1, z0: cell.z0, z1: cell.z1 });
  }
  return { segments, gaps };
}

const built = build();

export const CORRIDOR_SEGMENTS: CorridorSegment[] = built.segments;
export const CORRIDOR_GAPS: CorridorGap[] = built.gaps;

export type CorridorFootMark = {
  key: string
  segmentId: string
  foot: number
  x: number
  z: number
};

/** One mark per whole foot along each segment, measured from its north or east end. */
export const CORRIDOR_FOOT_MARKS: CorridorFootMark[] = CORRIDOR_SEGMENTS.flatMap((segment) => {
  const spanX = segment.x1 - segment.x0;
  const spanZ = segment.z1 - segment.z0;
  const alongZ = spanZ >= spanX;
  const length = alongZ ? spanZ : spanX;
  const count = Math.floor(length / FT + 1e-4);
  if (count < 1) return [];
  const cx = (segment.x0 + segment.x1) / 2;
  const cz = (segment.z0 + segment.z1) / 2;
  const shift = Math.min(Math.min(spanX, spanZ) * 0.28, 0.22);
  const marks: CorridorFootMark[] = [];
  for (let foot = 1; foot <= count; foot += 1) {
    const dist = Math.min(foot * FT, length - 0.02);
    let x = cx;
    let z = cz;
    if (alongZ) {
      z = segment.z1 - dist;
      x = Math.min(segment.x1 - 0.03, Math.max(segment.x0 + 0.03, cx + shift));
    } else {
      x = segment.x0 + dist;
      z = Math.min(segment.z1 - 0.03, Math.max(segment.z0 + 0.03, cz - shift));
    }
    marks.push({ key: `${segment.id}-${foot}`, segmentId: segment.id, foot, x, z });
  }
  return marks;
});
