"use client";

import { useRef, useState } from "react";
import {
  A1_FURNITURE,
  A1_META,
  A1_OPENINGS,
  A1_ROOMS,
  A1_WALLS,
  type A1Furniture,
  type A1Opening,
  type A1Point,
  type A1Wall,
} from "@/lib/plans/a1Model";
import {
  alongWall,
  frameSize,
  planFrame,
  planToSvg,
  pointInPolygon,
  polygonLabelPoint,
  splitWall,
  type PlanFrame,
} from "@/lib/plans/planSpace";

/** Colors and line weights for this sheet. Room sizes stay in the data file. */
const PLAN = {
  pxPerFt: 16,
  padX: 28,
  padY: 78,
  footer: 52,
  scaleBarFt: 10,
  paper: "#fffcf5",
  ink: "#14241c",
  muted: "#3d5247",
  wall: "#1b3a2f",
  vitrified: "#f7f1e4",
  antiSkid: "#dce4ea",
  balcony: "#d4c19a",
  door: "#7a5c22",
  window: "#d7e7f0",
  windowLine: "#1b3a2f",
  furniture: "#e7dcc8",
  furnitureLine: "#5c4a32",
  fixture: "#f4f7f8",
  titleSize: 16,
  nameSize: 11,
  dimSize: 9,
  doorWeight: 1.35,
} as const;

const TITLE = `Flat ${A1_META.unit} - ${A1_META.type} - Carpet ${A1_META.carpetSft} sq ft`;

const points = [
  ...A1_ROOMS.flatMap((room) => room.polygon),
  ...A1_WALLS.flatMap((wall) => [
    { x: wall.x1, y: wall.y1 },
    { x: wall.x2, y: wall.y2 },
  ]),
];

function pathOf(ring: A1Point[], frame: PlanFrame) {
  return `${ring
    .map((point, index) => {
      const svg = planToSvg(point.x, point.y, frame);
      return `${index === 0 ? "M" : "L"}${svg.x.toFixed(1)} ${svg.y.toFixed(1)}`;
    })
    .join(" ")} Z`;
}

function localPoint(item: A1Furniture, lx: number, ly: number) {
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: item.x + lx * cos - ly * sin, y: item.y + lx * sin + ly * cos };
}

function furnitureRing(item: A1Furniture) {
  return [
    localPoint(item, 0, 0),
    localPoint(item, item.width, 0),
    localPoint(item, item.width, item.depth),
    localPoint(item, 0, item.depth),
  ];
}

function roomFill(id: string, floor: "vitrified" | "anti-skid") {
  if (id === "balcony") return PLAN.balcony;
  return floor === "vitrified" ? PLAN.vitrified : PLAN.antiSkid;
}

function openingQuad(wall: A1Wall, opening: A1Opening) {
  const start = alongWall(wall, opening.offset);
  const end = alongWall(wall, opening.offset + opening.width);
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  const px = (-dy / length) * (wall.thickness / 2);
  const py = (dx / length) * (wall.thickness / 2);
  return [
    { x: start.x + px, y: start.y + py },
    { x: end.x + px, y: end.y + py },
    { x: end.x - px, y: end.y - py },
    { x: start.x - px, y: start.y - py },
  ];
}

function doorSymbol(opening: A1Opening, wall: A1Wall, frame: PlanFrame) {
  if (!opening.hinge || !opening.swingInto) return null;
  const room = A1_ROOMS.find((item) => item.id === opening.swingInto);
  if (!room) return null;
  const hingeAt = opening.hinge === "start" ? opening.offset : opening.offset + opening.width;
  const latchAt = opening.hinge === "start" ? opening.offset + opening.width : opening.offset;
  const hinge = alongWall(wall, hingeAt);
  const latch = alongWall(wall, latchAt);
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  const px = -dy / length;
  const py = dx / length;
  const midX = (hinge.x + latch.x) / 2;
  const midY = (hinge.y + latch.y) / 2;
  const sign = pointInPolygon(midX + px * 0.4, midY + py * 0.4, room.polygon) ? 1 : -1;
  const leaf = { x: hinge.x + px * sign * opening.width, y: hinge.y + py * sign * opening.width };
  const hingeSvg = planToSvg(hinge.x, hinge.y, frame);
  const latchSvg = planToSvg(latch.x, latch.y, frame);
  const leafSvg = planToSvg(leaf.x, leaf.y, frame);
  const vx = latchSvg.x - hingeSvg.x;
  const vy = latchSvg.y - hingeSvg.y;
  const cross = vx * (leafSvg.y - hingeSvg.y) - vy * (leafSvg.x - hingeSvg.x);
  const radius = Math.hypot(vx, vy);
  const sweep = cross > 0 ? 1 : 0;
  return {
    leaf: `M ${hingeSvg.x.toFixed(1)} ${hingeSvg.y.toFixed(1)} L ${leafSvg.x.toFixed(1)} ${leafSvg.y.toFixed(1)}`,
    arc: `M ${latchSvg.x.toFixed(1)} ${latchSvg.y.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 ${sweep} ${leafSvg.x.toFixed(1)} ${leafSvg.y.toFixed(1)}`,
  };
}

function downloadSvg(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "flat-a1-3bhk-w.svg";
  link.click();
  URL.revokeObjectURL(url);
}

export function A1PlanView({ homeLabel }: { readonly homeLabel?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showFurniture, setShowFurniture] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const frame = planFrame(points, PLAN.pxPerFt, PLAN.padX, PLAN.padY);
  const size = frameSize(frame, PLAN.footer);
  const walls = new Map(A1_WALLS.map((wall) => [wall.id, wall]));

  return (
    <figure className="rounded-lg border border-[rgba(27,58,47,0.12)] bg-[#fffcf5] p-3">
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={showFurniture}
          onClick={() => setShowFurniture((on) => !on)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${showFurniture ? "bg-[#1b3a2f] text-[#fffcf5]" : "bg-[#efe8da] text-[#14241c]"}`}
        >
          Furniture
        </button>
        <button
          type="button"
          aria-pressed={showDimensions}
          onClick={() => setShowDimensions((on) => !on)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${showDimensions ? "bg-[#1b3a2f] text-[#fffcf5]" : "bg-[#efe8da] text-[#14241c]"}`}
        >
          Dimensions
        </button>
        <button
          type="button"
          onClick={() => {
            if (svgRef.current) downloadSvg(svgRef.current);
          }}
          className="rounded-full bg-[#efe8da] px-3 py-1.5 text-xs font-semibold text-[#14241c]"
        >
          Download SVG
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size.width} ${size.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={TITLE}
      >
        <rect width={size.width} height={size.height} fill={PLAN.paper} />
        <text
          x={size.width / 2}
          y={homeLabel ? 30 : 40}
          textAnchor="middle"
          fill={PLAN.ink}
          fontSize={PLAN.titleSize}
          fontWeight="700"
        >
          {TITLE}
        </text>
        {homeLabel ? (
          <text x={size.width / 2} y={50} textAnchor="middle" fill={PLAN.muted} fontSize="12">
            {homeLabel}
          </text>
        ) : null}
        <g aria-label="North">
          <line x1={size.width - 46} y1={22} x2={size.width - 46} y2={58} stroke={PLAN.ink} strokeWidth="1.4" />
          <polygon points={`${size.width - 46},14 ${size.width - 52},28 ${size.width - 40},28`} fill={PLAN.ink} />
          <text x={size.width - 46} y={72} textAnchor="middle" fill={PLAN.ink} fontSize="11" fontWeight="700">
            N
          </text>
        </g>
        {A1_ROOMS.map((room) => (
          <path key={room.id} d={pathOf(room.polygon, frame)} fill={roomFill(room.id, room.floor)} />
        ))}
        {showFurniture
          ? A1_FURNITURE.map((item) => (
              <g key={item.id}>
                <path
                  d={pathOf(furnitureRing(item), frame)}
                  fill={item.type === "wc" || item.type === "basin" ? PLAN.fixture : PLAN.furniture}
                  stroke={PLAN.furnitureLine}
                  strokeWidth="1"
                />
                {item.type === "bed" ? (
                  <path
                    d={pathOf(
                      [
                        localPoint(item, 0.35, item.depth - 1.5),
                        localPoint(item, item.width - 0.35, item.depth - 1.5),
                        localPoint(item, item.width - 0.35, item.depth - 0.25),
                        localPoint(item, 0.35, item.depth - 0.25),
                      ],
                      frame,
                    )}
                    fill="#f7f2e6"
                    stroke={PLAN.furnitureLine}
                    strokeWidth="0.8"
                  />
                ) : null}
              </g>
            ))
          : null}
        {A1_WALLS.map((wall) =>
          splitWall(wall, A1_OPENINGS).map((span, index) => {
            const start = planToSvg(span.x1, span.y1, frame);
            const end = planToSvg(span.x2, span.y2, frame);
            return (
              <line
                key={`${wall.id}-${index}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={PLAN.wall}
                strokeWidth={wall.thickness * PLAN.pxPerFt}
                strokeLinecap="square"
              />
            );
          }),
        )}
        {A1_OPENINGS.map((opening) => {
          const wall = walls.get(opening.wallId);
          if (!wall) return null;
          if (opening.kind === "window") {
            const endA = alongWall(wall, opening.offset);
            const endB = alongWall(wall, opening.offset + opening.width);
            const start = planToSvg(endA.x, endA.y, frame);
            const finish = planToSvg(endB.x, endB.y, frame);
            return (
              <g key={opening.id}>
                <path d={pathOf(openingQuad(wall, opening), frame)} fill={PLAN.window} />
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={finish.x}
                  y2={finish.y}
                  stroke={PLAN.windowLine}
                  strokeWidth="1.2"
                />
              </g>
            );
          }
          const door = doorSymbol(opening, wall, frame);
          if (!door) return null;
          return (
            <g key={opening.id} fill="none" stroke={PLAN.door} strokeWidth={PLAN.doorWeight}>
              <path d={door.leaf} />
              <path d={door.arc} />
            </g>
          );
        })}
        {A1_ROOMS.map((room) => {
          const label = polygonLabelPoint(room.polygon);
          const svg = planToSvg(label.x, label.y, frame);
          return (
            <text key={`${room.id}-label`} x={svg.x} y={svg.y} textAnchor="middle" fill={PLAN.ink}>
              <tspan x={svg.x} fontSize={PLAN.nameSize} fontWeight="700">
                {room.label}
              </tspan>
              {showDimensions && room.printed ? (
                <tspan x={svg.x} dy="13" fontSize={PLAN.dimSize} fill={PLAN.muted}>
                  {room.printed}
                </tspan>
              ) : null}
            </text>
          );
        })}
        <g aria-label={`${PLAN.scaleBarFt} foot scale`}>
          <line
            x1={PLAN.padX}
            y1={size.height - 22}
            x2={PLAN.padX + PLAN.scaleBarFt * PLAN.pxPerFt}
            y2={size.height - 22}
            stroke={PLAN.ink}
            strokeWidth="1.4"
          />
          <line x1={PLAN.padX} y1={size.height - 28} x2={PLAN.padX} y2={size.height - 16} stroke={PLAN.ink} strokeWidth="1.4" />
          <line
            x1={PLAN.padX + PLAN.scaleBarFt * PLAN.pxPerFt}
            y1={size.height - 28}
            x2={PLAN.padX + PLAN.scaleBarFt * PLAN.pxPerFt}
            y2={size.height - 16}
            stroke={PLAN.ink}
            strokeWidth="1.4"
          />
          <text
            x={PLAN.padX + (PLAN.scaleBarFt * PLAN.pxPerFt) / 2}
            y={size.height - 32}
            textAnchor="middle"
            fill={PLAN.muted}
            fontSize="10"
          >
            {PLAN.scaleBarFt} ft
          </text>
        </g>
      </svg>
    </figure>
  );
}
