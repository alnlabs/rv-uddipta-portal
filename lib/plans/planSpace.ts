import type { A1Opening, A1Point, A1Wall } from "./a1Model";

/**
 * Shared plan space for the 2D sheet and the 3D model.
 * Plan feet: origin at the south-west corner, +x east, +y north.
 * World: Y up, +X east, −Z north, so a top view shows north at the top.
 */

export type PlanFrame = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  pxPerFt: number
  padX: number
  padY: number
};

export function planToWorld(x: number, y: number, elevation = 0) {
  return { x, y: elevation, z: -y };
}

export function planToSvg(x: number, y: number, frame: PlanFrame) {
  return {
    x: frame.padX + (x - frame.minX) * frame.pxPerFt,
    y: frame.padY + (frame.maxY - y) * frame.pxPerFt,
  };
}

export function planFrame(
  points: A1Point[],
  pxPerFt: number,
  padX: number,
  padY: number,
): PlanFrame {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  return { minX, minY, maxX, maxY, pxPerFt, padX, padY };
}

export function frameSize(frame: PlanFrame, extraBottom = 0) {
  return {
    width: frame.padX * 2 + (frame.maxX - frame.minX) * frame.pxPerFt,
    height: frame.padY + (frame.maxY - frame.minY) * frame.pxPerFt + extraBottom,
  };
}

export function pointInPolygon(x: number, y: number, poly: A1Point[]) {
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

function edgeDistance(x: number, y: number, poly: A1Point[]) {
  let distance = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
    distance = Math.min(distance, Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)));
  }
  return distance;
}

export function polygonLabelPoint(poly: A1Point[]) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  const centroid = { x: cx / (3 * area), y: cy / (3 * area) };
  if (pointInPolygon(centroid.x, centroid.y, poly)) return centroid;

  let best = poly[0];
  let bestDistance = -1;
  const minX = Math.min(...poly.map((point) => point.x));
  const maxX = Math.max(...poly.map((point) => point.x));
  const minY = Math.min(...poly.map((point) => point.y));
  const maxY = Math.max(...poly.map((point) => point.y));
  for (let y = minY; y <= maxY; y += 0.5) {
    for (let x = minX; x <= maxX; x += 0.5) {
      if (!pointInPolygon(x, y, poly)) continue;
      const distance = edgeDistance(x, y, poly);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = { x, y };
      }
    }
  }
  return best;
}

export function splitWall(wall: A1Wall, openings: A1Opening[]) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const gaps = openings
    .filter((opening) => opening.wallId === wall.id)
    .map((opening) => ({ a: opening.offset, b: opening.offset + opening.width }))
    .sort((left, right) => left.a - right.a);

  const spans: { a: number; b: number }[] = [];
  let cursor = 0;
  for (const gap of gaps) {
    if (gap.a - cursor > 0.05) spans.push({ a: cursor, b: gap.a });
    cursor = Math.max(cursor, gap.b);
  }
  if (length - cursor > 0.05) spans.push({ a: cursor, b: length });

  return spans.map((span) => ({
    x1: wall.x1 + ux * span.a,
    y1: wall.y1 + uy * span.a,
    x2: wall.x1 + ux * span.b,
    y2: wall.y1 + uy * span.b,
  }));
}

export function alongWall(wall: A1Wall, distance: number) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  return { x: wall.x1 + (dx / length) * distance, y: wall.y1 + (dy / length) * distance };
}
