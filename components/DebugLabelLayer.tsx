"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { BufferGeometry, Float32BufferAttribute, Vector3, type Camera } from "three";
import {
  DEBUG_LAYER_OPTIONS,
  type DebugLabel,
  type DebugLayer,
  type DebugZoom,
} from "@/lib/debugLabel";

const ZOOM_RANK: Record<DebugZoom, number> = { far: 0, mid: 1, near: 2 };

const NUDGES: [number, number][] = [
  [0, 0],
  [0.45, 0],
  [-0.45, 0],
  [0, 0.45],
  [0, -0.45],
  [0.7, 0.35],
  [-0.7, 0.35],
  [0.7, -0.35],
  [-0.7, -0.35],
  [1.05, 0],
  [-1.05, 0],
  [0, 1.05],
  [0, -1.05],
];

type Placed = {
  id: string
  value: string
  x: number
  y: number
  z: number
  ax: number
  ay: number
  az: number
  lead: boolean
};

const scratch = new Vector3();

function tierOf(distance: number): DebugZoom {
  if (distance > 42) return "far";
  if (distance > 20) return "mid";
  return "near";
}

function project(camera: Camera, x: number, y: number, z: number, width: number, height: number) {
  scratch.set(x, y, z);
  const projected = scratch.clone().project(camera);
  return {
    z: projected.z,
    sx: (projected.x * 0.5 + 0.5) * width,
    sy: (-projected.y * 0.5 + 0.5) * height,
  };
}

function placeLabels(
  labels: DebugLabel[],
  enabled: Record<DebugLayer, boolean>,
  tier: DebugZoom,
  camera: Camera,
  width: number,
  height: number,
) {
  const rank = ZOOM_RANK[tier];
  const gap = tier === "far" ? 36 : tier === "mid" ? 18 : 12;
  const pool = labels
    .filter(
      (label) =>
        label.type !== "dimensions" &&
        label.type !== "corridors" &&
        enabled[label.type] &&
        ZOOM_RANK[label.minZoom] <= rank,
    )
    .sort((a, b) => a.priority - b.priority || a.value.localeCompare(b.value));
  const spots: { sx: number; sy: number }[] = [];
  const placed: Placed[] = [];
  for (const label of pool) {
    const [ax, ay, az] = label.anchor;
    let chosen: { x: number; z: number; sx: number; sy: number } | null = null;
    for (const [dx, dz] of NUDGES) {
      const x = ax + dx;
      const z = az + dz;
      const screen = project(camera, x, ay, z, width, height);
      if (screen.z < -1 || screen.z > 1) continue;
      if (screen.sx < -8 || screen.sy < -8 || screen.sx > width + 8 || screen.sy > height + 8) {
        continue;
      }
      if (spots.some((spot) => Math.hypot(spot.sx - screen.sx, spot.sy - screen.sy) < gap)) {
        continue;
      }
      chosen = { x, z, sx: screen.sx, sy: screen.sy };
      break;
    }
    if (!chosen) continue;
    spots.push({ sx: chosen.sx, sy: chosen.sy });
    const lead = Math.hypot(chosen.x - ax, chosen.z - az) > 0.2;
    placed.push({
      id: label.id,
      value: label.value,
      x: chosen.x,
      y: ay,
      z: chosen.z,
      ax,
      ay,
      az,
      lead,
    });
    if (placed.length >= (tier === "far" ? 48 : tier === "mid" ? 140 : 260)) break;
  }
  return placed;
}

export function DebugLabelLayer({
  labels,
  enabled,
}: {
  labels: DebugLabel[]
  enabled: Record<DebugLayer, boolean>
}) {
  const { camera, gl, controls } = useThree();
  const [placed, setPlaced] = useState<Placed[]>([]);
  const signature = useRef("");
  const leaders = useMemo(() => {
    const coords: number[] = [];
    for (const mark of placed) {
      if (!mark.lead) continue;
      coords.push(mark.ax, mark.ay, mark.az, mark.x, mark.y, mark.z);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(coords, 3));
    return geometry;
  }, [placed]);

  useFrame(() => {
    const orbit = controls as { target?: Vector3 } | null;
    const target = orbit?.target;
    const distance = target ? camera.position.distanceTo(target) : camera.position.length();
    const tier = tierOf(distance);
    const next = placeLabels(
      labels,
      enabled,
      tier,
      camera as Camera,
      gl.domElement.clientWidth,
      gl.domElement.clientHeight,
    );
    const sign = next.map((mark) => `${mark.id}@${mark.x.toFixed(2)},${mark.z.toFixed(2)}`).join("|");
    if (sign === signature.current) return;
    signature.current = sign;
    setPlaced(next);
  });

  return (
    <group>
      {placed.some((mark) => mark.lead) ? (
        <lineSegments geometry={leaders} raycast={() => undefined}>
          <lineBasicMaterial color="#c9a45c" transparent opacity={0.55} depthWrite={false} />
        </lineSegments>
      ) : null}
      {placed.map((mark) => (
        <Html
          key={mark.id}
          position={[mark.x, mark.y, mark.z]}
          center
          zIndexRange={[6, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <span className="pointer-events-none inline-flex items-baseline gap-1 rounded-[4px] bg-[#0d1a14]/90 px-1 py-px text-[9px] leading-none font-semibold whitespace-nowrap text-[#f7f2e6] ring-1 ring-[rgba(232,213,163,0.35)] select-none">
            {mark.value}
          </span>
        </Html>
      ))}
    </group>
  );
}

export function DebugLayerPanel({
  value,
  onChange,
  coverage,
  onCoverage,
  report,
}: {
  value: Record<DebugLayer, boolean>
  onChange: (next: Record<DebugLayer, boolean>) => void
  coverage: boolean
  onCoverage: (next: boolean) => void
  report: {
    detected: number
    labelled: number
    missingIds: string[]
    active: boolean
  } | null
}) {
  const setAll = (on: boolean) => {
    onChange(
      Object.fromEntries(DEBUG_LAYER_OPTIONS.map((option) => [option.key, on])) as Record<
        DebugLayer,
        boolean
      >,
    );
    onCoverage(on);
  };
  return (
    <div className="w-[15.5rem] rounded-2xl bg-[#14241c] p-2 shadow-lg ring-1 ring-[rgba(232,213,163,0.22)]">
      <div className="mb-1 flex gap-1 px-1">
        <button
          type="button"
          className="flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#e8d5a3] hover:bg-[rgba(232,213,163,0.12)]"
          onClick={() => setAll(true)}
        >
          Show all
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#e8d5a3] hover:bg-[rgba(232,213,163,0.12)]"
          onClick={() => setAll(false)}
        >
          Hide all
        </button>
      </div>
      <ul className="flex flex-col gap-0.5">
        {DEBUG_LAYER_OPTIONS.map((option) => {
          const checked = value[option.key];
          return (
            <li key={option.key}>
              <button
                type="button"
                aria-pressed={checked}
                onClick={() => onChange({ ...value, [option.key]: !checked })}
                className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold ${
                  checked ? "bg-[#c9a45c] text-[#14241c]" : "text-[#e8d5a3]"
                }`}
              >
                {option.label}
                <span aria-hidden>{checked ? "On" : "Off"}</span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-pressed={coverage}
            onClick={() => onCoverage(!coverage)}
            className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold ${
              coverage ? "bg-[#c9a45c] text-[#14241c]" : "text-[#e8d5a3]"
            }`}
          >
            Corridor coverage
            <span aria-hidden>{coverage ? "On" : "Off"}</span>
          </button>
          {report ? (
            <div className="px-3 pt-1 pb-2 text-[11px] leading-snug font-medium text-[#e8d5a3]">
              <div>Detected corridor segments: {report.detected}</div>
              <div>Labelled corridor segments: {report.active ? report.labelled : "—"}</div>
              <div>Missing: {report.active ? report.missingIds.length : "—"}</div>
              {report.active && report.missingIds.length > 0 ? (
                <div className="mt-1 break-words text-[#f0c7b0]">{report.missingIds.join(", ")}</div>
              ) : null}
            </div>
          ) : null}
        </li>
      </ul>
    </div>
  );
}
