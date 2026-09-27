"use client";

import { A1ArchitecturalPlan } from "@/components/A1ArchitecturalPlan";
import { A2ArchitecturalPlan } from "@/components/A2ArchitecturalPlan";
import { A3ArchitecturalPlan } from "@/components/A3ArchitecturalPlan";
import { A4ArchitecturalPlan } from "@/components/A4ArchitecturalPlan";
import { A6ArchitecturalPlan } from "@/components/A6ArchitecturalPlan";
import { A7ArchitecturalPlan } from "@/components/A7ArchitecturalPlan";
import { A8ArchitecturalPlan } from "@/components/A8ArchitecturalPlan";
import { A10ArchitecturalPlan } from "@/components/A10ArchitecturalPlan";
import { B1ArchitecturalPlan } from "@/components/B1ArchitecturalPlan";
import { B2ArchitecturalPlan } from "@/components/B2ArchitecturalPlan";
import { B3ArchitecturalPlan } from "@/components/B3ArchitecturalPlan";
import { B4ArchitecturalPlan } from "@/components/B4ArchitecturalPlan";
import { B5ArchitecturalPlan } from "@/components/B5ArchitecturalPlan";
import { B6ArchitecturalPlan } from "@/components/B6ArchitecturalPlan";
import { B7ArchitecturalPlan } from "@/components/B7ArchitecturalPlan";
import { B8ArchitecturalPlan } from "@/components/B8ArchitecturalPlan";
import { B9ArchitecturalPlan } from "@/components/B9ArchitecturalPlan";
import { B10ArchitecturalPlan } from "@/components/B10ArchitecturalPlan";
import { B11ArchitecturalPlan } from "@/components/B11ArchitecturalPlan";
import { B12ArchitecturalPlan } from "@/components/B12ArchitecturalPlan";
import { B13ArchitecturalPlan } from "@/components/B13ArchitecturalPlan";
import { B14ArchitecturalPlan } from "@/components/B14ArchitecturalPlan";
import { B15ArchitecturalPlan } from "@/components/B15ArchitecturalPlan";
import { INVENTORY } from "@/lib/inventory";
import {
  edgesForPlan,
  planCaption,
  planForFlat,
  type FlatPlanInput,
  type PlanFurnish,
  type PlanKind,
} from "@/lib/flatPlan";
import { UNIT_FOOTPRINT, unitPlanSize } from "@/lib/layout3d";
import { isA1Unit } from "@/lib/plans/a1";
import { isA2Unit } from "@/lib/plans/a2";
import { isA3Unit } from "@/lib/plans/a3";
import { isA4Unit } from "@/lib/plans/a4";
import { isA6Unit } from "@/lib/plans/a6";
import { isA7Unit } from "@/lib/plans/a7";
import { isA8Unit } from "@/lib/plans/a8";
import { isA10Unit } from "@/lib/plans/a10";
import { isB1Unit } from "@/lib/plans/b1";
import { isB2Unit } from "@/lib/plans/b2";
import { isB3Unit } from "@/lib/plans/b3";
import { isB4Unit } from "@/lib/plans/b4";
import { isB5Unit } from "@/lib/plans/b5";
import { isB6Unit } from "@/lib/plans/b6";
import { isB7Unit } from "@/lib/plans/b7";
import { isB8Unit } from "@/lib/plans/b8";
import { isB9Unit } from "@/lib/plans/b9";
import { isB10Unit } from "@/lib/plans/b10";
import { isB11Unit } from "@/lib/plans/b11";
import { isB12Unit } from "@/lib/plans/b12";
import { isB13Unit } from "@/lib/plans/b13";
import { isB14Unit } from "@/lib/plans/b14";
import { isB15Unit } from "@/lib/plans/b15";

const KIND_FILL: Record<PlanKind, string> = {
  room: "#f8f2e6",
  foyer: "#f3ead8",
  wet: "#d7e0e7",
  balcony: "#d2c09a",
};

function FurnitureMark({ piece }: { piece: PlanFurnish }) {
  const { x, y, w, h, kind } = piece;
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (kind === "bed") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#efe2c8" stroke="#6d4d22" strokeWidth="0.32" rx="0.5" />
        <rect x={x} y={y} width={w} height={Math.min(2.4, h * 0.16)} fill="#7a5c22" />
        <rect x={x + 0.8} y={y + 0.7} width={w * 0.38} height={Math.min(2.1, h * 0.14)} fill="#f7f2e6" rx="0.4" />
        <rect x={x + w * 0.52} y={y + 0.7} width={w * 0.38} height={Math.min(2.1, h * 0.14)} fill="#f7f2e6" rx="0.4" />
        <line x1={x + 0.8} y1={cy} x2={x + w - 0.8} y2={cy} stroke="#c9b48a" strokeWidth="0.22" />
      </g>
    );
  }
  if (kind === "sofa") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#5f7468" stroke="#1b3a2f" strokeWidth="0.28" rx="1.1" />
        <rect x={x + 1} y={y + 1.1} width={w - 2} height={h - 2.4} fill="#7d9488" rx="0.6" />
      </g>
    );
  }
  if (kind === "table") {
    return (
      <rect x={x} y={y} width={w} height={h} fill="#e2cfab" stroke="#7a5c22" strokeWidth="0.3" rx="0.5" />
    );
  }
  if (kind === "chair") {
    return (
      <rect x={x} y={y} width={w} height={h} fill="#d8c4a0" stroke="#7a5c22" strokeWidth="0.22" rx="0.4" />
    );
  }
  if (kind === "wardrobe") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#c9a45c" stroke="#7a5c22" strokeWidth="0.28" />
        <line x1={cx} y1={y + 0.4} x2={cx} y2={y + h - 0.4} stroke="#7a5c22" strokeWidth="0.2" />
      </g>
    );
  }
  if (kind === "wc") {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={w * 0.38} ry={h * 0.36} fill="#f7f2e6" stroke="#4a5a62" strokeWidth="0.28" />
        <rect x={x + w * 0.2} y={y} width={w * 0.6} height={h * 0.28} fill="#e8eef2" stroke="#4a5a62" strokeWidth="0.2" />
      </g>
    );
  }
  if (kind === "basin") {
    return (
      <rect x={x} y={y} width={w} height={h} fill="#f7f2e6" stroke="#4a5a62" strokeWidth="0.28" rx="1.1" />
    );
  }
  if (kind === "stove") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#2a2a2a" rx="0.4" />
        <circle cx={x + w * 0.3} cy={cy} r={1.1} fill="none" stroke="#c9a45c" strokeWidth="0.25" />
        <circle cx={x + w * 0.7} cy={cy} r={1.1} fill="none" stroke="#c9a45c" strokeWidth="0.25" />
      </g>
    );
  }
  return (
    <rect x={x} y={y} width={w} height={h} fill="#c9895a" stroke="#6d3a22" strokeWidth="0.28" />
  );
}

type PlateBox = {
  id: string
  flatNumber: string
  x: number
  z: number
  w: number
  d: number
  active: boolean
};

function boxesForFloor(floor: number, highlight?: string): PlateBox[] {
  return INVENTORY.filter((row) => row.floor === floor)
    .map((row) => {
      const id = `${row.wing}${row.unit}`;
      const center = UNIT_FOOTPRINT[id];
      if (!center) return null;
      const [w, d] = unitPlanSize(id);
      return {
        id,
        flatNumber: row.flatNumber,
        x: center[0] - w / 2,
        z: center[1] - d / 2,
        w,
        d,
        active: row.flatNumber === highlight,
      };
    })
    .filter((row): row is PlateBox => Boolean(row));
}

export function FloorPlate2D({
  floor,
  highlight,
  onSelectUnit,
}: {
  readonly floor: number
  readonly highlight?: string
  readonly onSelectUnit?: (flatNumber: string) => void
}) {
  const boxes = boxesForFloor(floor, highlight);
  if (!boxes.length) {
    return <p className="text-sm text-[#3d5247]">No plate for this floor.</p>;
  }

  const pad = 0.7;
  const minX = Math.min(...boxes.map((box) => box.x)) - pad;
  const maxX = Math.max(...boxes.map((box) => box.x + box.w)) + pad;
  const minZ = Math.min(...boxes.map((box) => box.z)) - pad;
  const maxZ = Math.max(...boxes.map((box) => box.z + box.d)) + pad;

  return (
    <svg
      viewBox={`${minX} ${minZ} ${maxX - minX} ${maxZ - minZ}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Floor ${floor} plate${highlight ? `, ${highlight} highlighted` : ""}`}
    >
      <rect x={minX} y={minZ} width={maxX - minX} height={maxZ - minZ} fill="#d8d0c2" />
      {boxes.map((box) => (
        <g
          key={box.id}
          onClick={onSelectUnit ? () => onSelectUnit(box.flatNumber) : undefined}
          className={onSelectUnit ? "cursor-pointer" : undefined}
        >
          <rect
            x={box.x}
            y={box.z}
            width={box.w}
            height={box.d}
            fill={box.active ? "#1b3a2f" : "#f8f2e6"}
            stroke={box.active ? "#c9a45c" : "#1b3a2f"}
            strokeWidth={box.active ? 0.12 : 0.05}
          />
          <text
            x={box.x + box.w / 2}
            y={box.z + box.d / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={box.active ? "#e8d5a3" : "#14241c"}
            fontSize={Math.min(box.w, box.d) * 0.26}
            fontWeight="700"
          >
            {box.flatNumber}
          </text>
        </g>
      ))}
      <text
        x={(minX + maxX) / 2}
        y={minZ + 0.4}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="0.3"
        fontWeight="700"
      >
        N
      </text>
    </svg>
  );
}

function TypicalUnitPlan({ flat }: { readonly flat: FlatPlanInput }) {
  const plan = planForFlat(flat);
  const edges = edgesForPlan(plan);
  const entry = plan.openings.find((item) => item.id === "entry");
  const facingX = plan.facing === "W" ? 2 : plan.width - 2;

  return (
    <figure className="rounded-2xl bg-[#ebe6dc] p-3 ring-1 ring-[rgba(27,58,47,0.12)] md:p-4">
      <figcaption className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
        <span>Unit plan</span>
        <span className="normal-case tracking-normal text-[#7a5c22]">
          {plan.facing === "W" ? "West facing" : "East facing"}
        </span>
      </figcaption>
      <svg
        viewBox={`-6 -6 ${plan.width + 12} ${plan.height + 14}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${flat.flatNumber} brochure typical plan`}
      >
        <rect
          x={-6}
          y={-6}
          width={plan.width + 12}
          height={plan.height + 14}
          fill="#cfc7b8"
        />
        {plan.rooms.map((item) => (
          <rect
            key={item.id}
            x={item.x}
            y={item.y}
            width={item.w}
            height={item.h}
            fill={KIND_FILL[item.kind]}
          />
        ))}
        {plan.furniture.map((item) => (
          <FurnitureMark key={item.id} piece={item} />
        ))}
        {plan.rooms
          .filter((item) => item.kind !== "balcony")
          .map((item) => (
            <text
              key={`${item.id}-label`}
              x={item.x + item.w / 2}
              y={item.y + 3.6}
              textAnchor="middle"
              fill="#3d5247"
              fontSize={item.w < 14 ? 2.5 : 3}
              fontWeight="700"
            >
              {item.label}
            </text>
          ))}
        {edges.map((edge, index) => (
          <line
            key={`${edge.x1}-${edge.y1}-${index}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="#14241c"
            strokeWidth={edge.outer ? 1.35 : 0.62}
            strokeLinecap="square"
          />
        ))}
        {plan.openings
          .filter((item) => item.kind === "window")
          .map((item) => (
            <g key={item.id}>
              <rect
                x={item.x}
                y={item.y}
                width={item.w}
                height={item.h}
                fill="#cfe0ea"
                stroke="#1b3a2f"
                strokeWidth="0.28"
              />
              <line
                x1={item.x + item.w / 2}
                y1={item.y}
                x2={item.x + item.w / 2}
                y2={item.y + item.h}
                stroke="#1b3a2f"
                strokeWidth="0.2"
              />
            </g>
          ))}
        {plan.openings
          .filter((item) => item.kind === "door")
          .map((item) => {
            const vertical = item.h > item.w;
            const r = vertical ? item.h : item.w;
            const hingeX = plan.facing === "W" ? item.x + item.w : item.x;
            const hingeY = item.y;
            return (
              <path
                key={item.id}
                d={
                  vertical
                    ? `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 1 ${hingeX + (plan.facing === "W" ? -r : r)} ${hingeY}`
                    : `M ${item.x} ${item.y} A ${r} ${r} 0 0 1 ${item.x} ${item.y + r}`
                }
                fill="none"
                stroke="#7a5c22"
                strokeWidth="0.28"
              />
            );
          })}
        {entry ? (
          <text
            x={plan.facing === "W" ? plan.width + 1.2 : -1.2}
            y={entry.y + entry.h / 2}
            textAnchor={plan.facing === "W" ? "start" : "end"}
            dominantBaseline="middle"
            fill="#14241c"
            fontSize="3.1"
            fontWeight="700"
          >
            Entry
          </text>
        ) : null}
        <text
          x={facingX}
          y={-2.2}
          textAnchor={plan.facing === "W" ? "start" : "end"}
          fill="#14241c"
          fontSize="3.1"
          fontWeight="700"
        >
          {plan.facing === "W" ? "← Facing west" : "Facing east →"}
        </text>
      </svg>
      <p className="mt-2 text-xs text-[#3d5247]">{planCaption(flat)}</p>
    </figure>
  );
}

export function FlatPlan2D({
  flat,
}: {
  readonly flat: FlatPlanInput
}) {
  if (isA1Unit(flat)) return <A1ArchitecturalPlan />;
  if (isA2Unit(flat)) return <A2ArchitecturalPlan />;
  if (isA3Unit(flat)) return <A3ArchitecturalPlan />;
  if (isA4Unit(flat)) return <A4ArchitecturalPlan />;
  if (isA6Unit(flat)) return <A6ArchitecturalPlan />;
  if (isA7Unit(flat)) return <A7ArchitecturalPlan />;
  if (isA8Unit(flat)) return <A8ArchitecturalPlan />;
  if (isA10Unit(flat)) return <A10ArchitecturalPlan />;
  if (isB1Unit(flat)) return <B1ArchitecturalPlan />;
  if (isB2Unit(flat)) return <B2ArchitecturalPlan />;
  if (isB3Unit(flat)) return <B3ArchitecturalPlan />;
  if (isB4Unit(flat)) return <B4ArchitecturalPlan />;
  if (isB5Unit(flat)) return <B5ArchitecturalPlan />;
  if (isB6Unit(flat)) return <B6ArchitecturalPlan />;
  if (isB7Unit(flat)) return <B7ArchitecturalPlan />;
  if (isB8Unit(flat)) return <B8ArchitecturalPlan />;
  if (isB9Unit(flat)) return <B9ArchitecturalPlan />;
  if (isB10Unit(flat)) return <B10ArchitecturalPlan />;
  if (isB11Unit(flat)) return <B11ArchitecturalPlan />;
  if (isB12Unit(flat)) return <B12ArchitecturalPlan />;
  if (isB13Unit(flat)) return <B13ArchitecturalPlan />;
  if (isB14Unit(flat)) return <B14ArchitecturalPlan />;
  if (isB15Unit(flat)) return <B15ArchitecturalPlan />;
  return <TypicalUnitPlan flat={flat} />;
}
