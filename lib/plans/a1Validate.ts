import {
  A1_META,
  A1_OPENINGS,
  A1_ROOMS,
  A1_WALLS,
  A1_WALL_THICKNESS,
  type A1Point,
  type A1Room,
} from "./a1Model";

const TOLERANCE_FT = 0.1;
const AREA_LIMIT = 0.02;

export type A1Validation = {
  areas: {
    rooms: { id: string; sqft: number; estimated: boolean }[]
    carpetSqft: number
    balconySqft: number
    carpetTarget: number
    balconyTarget: number
    carpetDelta: number
    balconyDelta: number
    carpetOffBy: number
    balconyOffBy: number
  }
  closed: { id: string; ok: boolean; detail: string }[]
  overlaps: { a: string; b: string; sqft: number }[]
  gaps: { sqft: number; note: string }
  openings: { id: string; ok: boolean; detail: string }[]
  labels: { id: string; ok: boolean; detail: string }[]
  ok: boolean
};

function polygonArea(poly: A1Point[]) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function edgeLength(a: A1Point, b: A1Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInPolygon(x: number, y: number, poly: A1Point[]) {
  let inside = false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if ((a.y > y) === (b.y > y)) continue;
    const xAtY = a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
    if (x < xAtY) inside = !inside;
  }
  return inside;
}

function segmentsCross(a: A1Point, b: A1Point, c: A1Point, d: A1Point) {
  const cross = (p: A1Point, q: A1Point, r: A1Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const ab = cross(a, b, c);
  const cd = cross(a, b, d);
  const ef = cross(c, d, a);
  const gh = cross(c, d, b);
  return ab * cd < 0 && ef * gh < 0;
}

function isClosedSimple(poly: A1Point[]) {
  if (poly.length < 3) return "fewer than 3 corners";
  for (let i = 0; i < poly.length; i++) {
    const length = edgeLength(poly[i], poly[(i + 1) % poly.length]);
    if (length < 0.05) return "a zero-length edge";
  }
  for (let i = 0; i < poly.length; i++) {
    for (let j = i + 1; j < poly.length; j++) {
      const sharesCorner = Math.abs(i - j) <= 1 || (i === 0 && j === poly.length - 1);
      if (sharesCorner) continue;
      const adjacent = (i + 1) % poly.length === j || (j + 1) % poly.length === i;
      if (adjacent) continue;
      if (segmentsCross(poly[i], poly[(i + 1) % poly.length], poly[j], poly[(j + 1) % poly.length])) {
        return "edges cross";
      }
    }
  }
  if (polygonArea(poly) < 1) return "area under 1 sq ft";
  return null;
}

/** Feet from strings such as 14'4½" or 8'1½" or 6'. */
function parseFeet(token: string) {
  const match = token.trim().match(/^(\d+)'(?:(\d+))?(½|¼|¾)?(?:(\d+)\/(\d+))?"?$/);
  if (!match) return null;
  let feet = Number(match[1]);
  if (match[2]) feet += Number(match[2]) / 12;
  if (match[3] === "½") feet += 0.5 / 12;
  if (match[3] === "¼") feet += 0.25 / 12;
  if (match[3] === "¾") feet += 0.75 / 12;
  if (match[4] && match[5]) feet += Number(match[4]) / Number(match[5]) / 12;
  return feet;
}

function printedLengths(printed: string) {
  if (/wide/i.test(printed)) {
    const width = parseFeet(printed.replace(/wide/i, "").trim());
    return width == null ? [] : [width];
  }
  return printed
    .split(/x/i)
    .map((part) => parseFeet(part))
    .filter((value): value is number => value != null);
}

function roomEdgeLengths(room: A1Room) {
  return room.polygon.map((point, index) => edgeLength(point, room.polygon[(index + 1) % room.polygon.length]));
}

function roomsWithin(x: number, y: number, limit: number) {
  const found: { id: string; distance: number }[] = [];
  for (const room of A1_ROOMS) {
    let best = Infinity;
    if (pointInPolygon(x, y, room.polygon)) best = 0;
    else {
      for (let i = 0; i < room.polygon.length; i++) {
        const a = room.polygon[i];
        const b = room.polygon[(i + 1) % room.polygon.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
        const distance = Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
        if (distance < best) best = distance;
      }
    }
    if (best <= limit) found.push({ id: room.id, distance: best });
  }
  return found.sort((a, b) => a.distance - b.distance);
}

export function validateA1(): A1Validation {
  const rooms = A1_ROOMS.map((room) => ({
    id: room.id,
    sqft: polygonArea(room.polygon),
    estimated: room.estimated,
  }));
  const balconySqft = rooms.filter((room) => room.id === "balcony").reduce((sum, room) => sum + room.sqft, 0);
  const carpetSqft = rooms.filter((room) => room.id !== "balcony").reduce((sum, room) => sum + room.sqft, 0);
  const carpetDelta = carpetSqft - A1_META.carpetSft;
  const balconyDelta = balconySqft - A1_META.balconySft;

  const closed = A1_ROOMS.map((room) => {
    const detail = isClosedSimple(room.polygon);
    return { id: room.id, ok: detail == null, detail: detail ?? "closed" };
  });

  const overlaps: A1Validation["overlaps"] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const room of A1_ROOMS) {
    for (const point of room.polygon) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  const step = 0.1;
  const overlapCells = new Map<string, number>();
  const cols = Math.round((maxX - minX) / step) + 1;
  const rows = Math.round((maxY - minY) / step) + 1;
  const covered = new Uint8Array(cols * rows);
  const index = (ix: number, iy: number) => iy * cols + ix;
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const x = minX + ix * step;
      const y = minY + iy * step;
      const hits = A1_ROOMS.filter((room) => pointInPolygon(x, y, room.polygon)).map((room) => room.id);
      if (hits.length > 1) {
        const key = hits.slice().sort().join("+");
        overlapCells.set(key, (overlapCells.get(key) ?? 0) + 1);
      }
      const skin = A1_WALL_THICKNESS.inner / 2 + 0.02;
      if (hits.length > 0 || roomsWithin(x, y, skin).length > 0) covered[index(ix, iy)] = 1;
    }
  }
  const seen = new Uint8Array(cols * rows);
  const queue: number[] = [];
  for (let ix = 0; ix < cols; ix++) {
    for (const iy of [0, rows - 1]) {
      const id = index(ix, iy);
      if (!covered[id] && !seen[id]) {
        seen[id] = 1;
        queue.push(id);
      }
    }
  }
  for (let iy = 0; iy < rows; iy++) {
    for (const ix of [0, cols - 1]) {
      const id = index(ix, iy);
      if (!covered[id] && !seen[id]) {
        seen[id] = 1;
        queue.push(id);
      }
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    const ix = id % cols;
    const iy = Math.floor(id / cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = ix + dx;
      const ny = iy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const next = index(nx, ny);
      if (covered[next] || seen[next]) continue;
      seen[next] = 1;
      queue.push(next);
    }
  }
  let gapCells = 0;
  for (let id = 0; id < covered.length; id++) {
    if (!covered[id] && !seen[id]) gapCells += 1;
  }
  for (const [key, cells] of overlapCells) {
    const [a, b] = key.split("+");
    overlaps.push({ a, b, sqft: cells * step * step });
  }

  const openings = A1_OPENINGS.map((opening) => {
    const host = A1_WALLS.find((item) => item.id === opening.wallId);
    if (!host) return { id: opening.id, ok: false, detail: `wall ${opening.wallId} is missing` };
    const length = Math.hypot(host.x2 - host.x1, host.y2 - host.y1);
    if (opening.offset < -TOLERANCE_FT) {
      return { id: opening.id, ok: false, detail: `offset ${opening.offset} is before the wall` };
    }
    const end = opening.offset + opening.width;
    if (end > length + TOLERANCE_FT) {
      return {
        id: opening.id,
        ok: false,
        detail: `ends at ${end.toFixed(2)} ft on a ${length.toFixed(2)} ft wall`,
      };
    }
    if (opening.swingInto && !A1_ROOMS.some((room) => room.id === opening.swingInto)) {
      return { id: opening.id, ok: false, detail: `swings into missing room ${opening.swingInto}` };
    }
    return { id: opening.id, ok: true, detail: `${opening.width} ft on ${host.id}` };
  });

  const labels = A1_ROOMS.map((room) => {
    if (!room.printed) return { id: room.id, ok: true, detail: "no printed size" };
    const expected = printedLengths(room.printed);
    const edges = roomEdgeLengths(room);
    if (!expected.length) return { id: room.id, ok: false, detail: `could not read ${room.printed}` };
    const missing = expected.filter((value) => !edges.some((edge) => Math.abs(edge - value) <= TOLERANCE_FT));
    if (missing.length) {
      return {
        id: room.id,
        ok: false,
        detail: `${missing.map((value) => value.toFixed(3)).join(", ")} ft not found on the polygon`,
      };
    }
    return { id: room.id, ok: true, detail: room.printed };
  });

  const gapSqft = gapCells * step * step;
  const areasOk = Math.abs(carpetDelta) / A1_META.carpetSft <= AREA_LIMIT && Math.abs(balconyDelta) / A1_META.balconySft <= AREA_LIMIT;
  const ok =
    areasOk &&
    closed.every((item) => item.ok) &&
    overlaps.length === 0 &&
    gapSqft < 2 &&
    openings.every((item) => item.ok) &&
    labels.every((item) => item.ok);

  return {
    areas: {
      rooms,
      carpetSqft,
      balconySqft,
      carpetTarget: A1_META.carpetSft,
      balconyTarget: A1_META.balconySft,
      carpetDelta,
      balconyDelta,
      carpetOffBy: carpetDelta / A1_META.carpetSft,
      balconyOffBy: balconyDelta / A1_META.balconySft,
    },
    closed,
    overlaps,
    gaps: {
      sqft: gapSqft,
      note: "Floor enclosed by rooms but not inside a room or an inner wall.",
    },
    openings,
    labels,
    ok,
  };
}

function printReport(result: A1Validation) {
  const { areas } = result;
  console.log("ROOMS");
  for (const room of areas.rooms) {
    console.log(`  ${room.id.padEnd(14)} ${room.sqft.toFixed(2).padStart(8)}  ${room.estimated ? "estimated" : "printed"}`);
  }
  console.log(
    `carpet ${areas.carpetSqft.toFixed(2)} vs ${areas.carpetTarget}  delta ${areas.carpetDelta.toFixed(2)}  ${(areas.carpetOffBy * 100).toFixed(2)}%`,
  );
  console.log(
    `balcony ${areas.balconySqft.toFixed(2)} vs ${areas.balconyTarget}  delta ${areas.balconyDelta.toFixed(2)}  ${(areas.balconyOffBy * 100).toFixed(2)}%`,
  );
  console.log("CLOSED", result.closed.filter((item) => !item.ok));
  console.log("OVERLAPS", result.overlaps);
  console.log("GAPS", result.gaps.sqft.toFixed(2));
  console.log("OPENINGS", result.openings.filter((item) => !item.ok));
  console.log("LABELS", result.labels.filter((item) => !item.ok));
  console.log(result.ok ? "PASS" : "FAIL");
}

printReport(validateA1());
