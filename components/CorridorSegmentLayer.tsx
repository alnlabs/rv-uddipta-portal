"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  type Camera,
  Vector3,
} from "three";
import {
  CORRIDOR_FOOT_MARKS,
  CORRIDOR_GAPS,
  CORRIDOR_SEGMENTS,
  type CorridorSegment,
} from "@/lib/corridorSegments";

export type CorridorLabelReport = {
  detected: number
  labelled: number
  missingIds: string[]
  active: boolean
};
import { FLOOR_COUNT, corridorMarkY, floorBaseY } from "@/lib/layout3d";

type ZoomTier = "far" | "mid" | "near";

type Placed = {
  key: string
  id: string
  label: string
  x: number
  z: number
  ax: number
  az: number
  lead: boolean
};

function tierOf(distance: number): ZoomTier {
  if (distance > 42) return "far";
  if (distance > 20) return "mid";
  return "near";
}

function project(camera: Camera, x: number, y: number, z: number, width: number, height: number) {
  const scratch = new Vector3(x, y, z).project(camera);
  return {
    z: scratch.z,
    sx: (scratch.x * 0.5 + 0.5) * width,
    sy: (-scratch.y * 0.5 + 0.5) * height,
  };
}

function overlap1d(a0: number, a1: number, b0: number, b1: number) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

/** Typical double-loaded aisle width (metres). Half-pieces are each under this. */
const AISLE_W = 1.05;
const HALF_MAX = 0.7;

/** True when `other` is the other half of the same aisle (mid-cut face). */
function isHalfSplitMate(
  segment: CorridorSegment,
  other: CorridorSegment,
  axis: "x" | "z",
): boolean {
  const sw = segment.x1 - segment.x0;
  const sd = segment.z1 - segment.z0;
  const ow = other.x1 - other.x0;
  const od = other.z1 - other.z0;
  if (axis === "x") {
    if (sw >= HALF_MAX || ow >= HALF_MAX) return false;
    if (Math.abs(sw + ow - AISLE_W) > 0.3) return false;
    const span = Math.min(sd, od);
    return span > 0.2 && overlap1d(segment.z0, segment.z1, other.z0, other.z1) > span * 0.7;
  }
  if (sd >= HALF_MAX || od >= HALF_MAX) return false;
  if (Math.abs(sd + od - AISLE_W) > 0.3) return false;
  const span = Math.min(sw, ow);
  return span > 0.2 && overlap1d(segment.x0, segment.x1, other.x0, other.x1) > span * 0.7;
}

function midCutEast(segment: CorridorSegment) {
  return CORRIDOR_SEGMENTS.some(
    (other) =>
      other.id !== segment.id &&
      Math.abs(other.x1 - segment.x0) < 0.06 &&
      isHalfSplitMate(segment, other, "x"),
  );
}

function midCutWest(segment: CorridorSegment) {
  return CORRIDOR_SEGMENTS.some(
    (other) =>
      other.id !== segment.id &&
      Math.abs(other.x0 - segment.x1) < 0.06 &&
      isHalfSplitMate(segment, other, "x"),
  );
}

function midCutSouth(segment: CorridorSegment) {
  return CORRIDOR_SEGMENTS.some(
    (other) =>
      other.id !== segment.id &&
      Math.abs(other.z1 - segment.z0) < 0.06 &&
      isHalfSplitMate(segment, other, "z"),
  );
}

function midCutNorth(segment: CorridorSegment) {
  return CORRIDOR_SEGMENTS.some(
    (other) =>
      other.id !== segment.id &&
      Math.abs(other.z0 - segment.z1) < 0.06 &&
      isHalfSplitMate(segment, other, "z"),
  );
}

function chainNorth(segment: CorridorSegment) {
  const w = segment.x1 - segment.x0;
  return CORRIDOR_SEGMENTS.some((other) => {
    if (other.id === segment.id) return false;
    if (Math.abs(other.z0 - segment.z1) >= 0.06) return false;
    const ow = other.x1 - other.x0;
    return overlap1d(segment.x0, segment.x1, other.x0, other.x1) > 0.5 * Math.min(w, ow);
  });
}

function chainSouth(segment: CorridorSegment) {
  const w = segment.x1 - segment.x0;
  return CORRIDOR_SEGMENTS.some((other) => {
    if (other.id === segment.id) return false;
    if (Math.abs(other.z1 - segment.z0) >= 0.06) return false;
    const ow = other.x1 - other.x0;
    return overlap1d(segment.x0, segment.x1, other.x0, other.x1) > 0.5 * Math.min(w, ow);
  });
}

/** Any corridor flush on this face (spur against a wider aisle, etc.). */
function flushEast(segment: CorridorSegment) {
  const d = segment.z1 - segment.z0;
  return CORRIDOR_SEGMENTS.some((other) => {
    if (other.id === segment.id) return false;
    if (Math.abs(other.x1 - segment.x0) >= 0.06) return false;
    return overlap1d(segment.z0, segment.z1, other.z0, other.z1) > 0.35 * Math.min(d, other.z1 - other.z0);
  });
}

function flushWest(segment: CorridorSegment) {
  const d = segment.z1 - segment.z0;
  return CORRIDOR_SEGMENTS.some((other) => {
    if (other.id === segment.id) return false;
    if (Math.abs(other.x0 - segment.x1) >= 0.06) return false;
    return overlap1d(segment.z0, segment.z1, other.z0, other.z1) > 0.35 * Math.min(d, other.z1 - other.z0);
  });
}

function flushSouth(segment: CorridorSegment) {
  const w = segment.x1 - segment.x0;
  return CORRIDOR_SEGMENTS.some((other) => {
    if (other.id === segment.id) return false;
    if (Math.abs(other.z1 - segment.z0) >= 0.06) return false;
    return overlap1d(segment.x0, segment.x1, other.x0, other.x1) > 0.35 * Math.min(w, other.x1 - other.x0);
  });
}

function flushNorth(segment: CorridorSegment) {
  const w = segment.x1 - segment.x0;
  return CORRIDOR_SEGMENTS.some((other) => {
    if (other.id === segment.id) return false;
    if (Math.abs(other.z0 - segment.z1) >= 0.06) return false;
    return overlap1d(segment.x0, segment.x1, other.x0, other.x1) > 0.35 * Math.min(w, other.x1 - other.x0);
  });
}

/**
 * Chips on the real corridor outer edges (next to flats), never the mid-cut
 * of a double-loaded half-split, and never the end joints between pieces.
 */
function sideMarks(segment: CorridorSegment): {
  key: string
  label: string
  x: number
  z: number
  ax: number
  az: number
}[] {
  const w = segment.x1 - segment.x0;
  const d = segment.z1 - segment.z0;
  const cx = (segment.x0 + segment.x1) / 2;
  const cz = (segment.z0 + segment.z1) / 2;
  // Sit on the flat side of each edge so the walk stays clear.
  const out = 0.28;

  const cutE = midCutEast(segment);
  const cutW = midCutWest(segment);
  const cutS = midCutSouth(segment);
  const cutN = midCutNorth(segment);
  const ns =
    (chainNorth(segment) ? 1 : 0) + (chainSouth(segment) ? 1 : 0);

  // Walk along Z → label east/west edges (aisle sides next to flats).
  let alongZ: boolean;
  if (cutE || cutW) alongZ = true;
  else if (cutS || cutN) alongZ = false;
  // Full-width cell in a north–south aisle (BN1/BN4/BN7…): sides are E/W even when square.
  else if (Math.abs(w - AISLE_W) < 0.2 && ns > 0) alongZ = true;
  // Clearly wider than deep → east–west aisle, label N/S.
  else if (w > d + 0.12) alongZ = false;
  else alongZ = d >= w;

  const marks: {
    key: string
    label: string
    x: number
    z: number
    ax: number
    az: number
  }[] = [];

  // Narrow spurs only keep the free outer face (the face not flush to another deck).
  const narrowX = w < HALF_MAX;
  const narrowZ = d < HALF_MAX;

  if (alongZ) {
    if (!cutE && !(narrowX && flushEast(segment))) {
      marks.push({
        key: `${segment.id}-e`,
        label: `${segment.id}·e`,
        x: segment.x0 - out,
        z: cz,
        ax: cx,
        az: cz,
      });
    }
    if (!cutW && !(narrowX && flushWest(segment))) {
      marks.push({
        key: `${segment.id}-w`,
        label: `${segment.id}·w`,
        x: segment.x1 + out,
        z: cz,
        ax: cx,
        az: cz,
      });
    }
    return marks;
  }

  if (!cutS && !(narrowZ && flushSouth(segment))) {
    marks.push({
      key: `${segment.id}-s`,
      label: `${segment.id}·s`,
      x: cx,
      z: segment.z0 - out,
      ax: cx,
      az: cz,
    });
  }
  if (!cutN && !(narrowZ && flushNorth(segment))) {
    marks.push({
      key: `${segment.id}-n`,
      label: `${segment.id}·n`,
      x: cx,
      z: segment.z1 + out,
      ax: cx,
      az: cz,
    });
  }
  return marks;
}

function placeSegments(
  tier: ZoomTier,
  camera: Camera,
  y: number,
  width: number,
  height: number,
): Placed[] {
  const gap = tier === "far" ? 14 : tier === "mid" ? 10 : 7;
  const spots: { sx: number; sy: number }[] = [];
  const placed: Placed[] = [];
  for (const segment of CORRIDOR_SEGMENTS) {
    for (const side of sideMarks(segment)) {
      const screen = project(camera, side.x, y, side.z, width, height);
      if (screen.z < -1 || screen.z > 1) continue;
      const room = spots.reduce((min, spot) => {
        return Math.min(min, Math.hypot(spot.sx - screen.sx, spot.sy - screen.sy));
      }, 9999);
      // Keep both outer edges of the same piece; only thin against other pieces.
      const sameSegment = placed.some((mark) => mark.id === segment.id);
      if (room < gap * 0.35 && !sameSegment) continue;
      spots.push({ sx: screen.sx, sy: screen.sy });
      placed.push({
        key: side.key,
        id: segment.id,
        label: side.label,
        x: side.x,
        z: side.z,
        ax: side.ax,
        az: side.az,
        lead: true,
      });
    }
  }
  return placed;
}

function loopGeometry(x0: number, x1: number, z0: number, z1: number, y: number) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], 3),
  );
  return geometry;
}

function floorsFor(focusFloor: number) {
  if (focusFloor > 0) return [focusFloor];
  return Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1);
}

function deckY(floor: number) {
  return floorBaseY(floor) + 0.24;
}

export function CorridorSegmentLayer({
  focusFloor,
  showIds,
  showDimensions,
  showCoverage,
  showFeet,
  onReport,
}: {
  focusFloor: number
  showIds: boolean
  showDimensions: boolean
  showCoverage: boolean
  showFeet: boolean
  onReport?: (report: CorridorLabelReport) => void
}) {
  const { camera, gl, controls } = useThree();
  const [tier, setTier] = useState<ZoomTier>("far");
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const signature = useRef("");
  const y = corridorMarkY(focusFloor);
  const showChips =
    showIds || (showDimensions && tier !== "far") || showCoverage;
  const activeId = hoverId;

  const leaders = useMemo(() => {
    const coords: number[] = [];
    for (const mark of placed) {
      if (!mark.lead) continue;
      coords.push(mark.ax, y, mark.az, mark.x, y, mark.z);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(coords, 3));
    return geometry;
  }, [placed, y]);

  const outlines = useMemo(() => {
    return floorsFor(focusFloor).flatMap((floor) => {
      const height = deckY(floor);
      return CORRIDOR_SEGMENTS.map((segment) => ({
        key: `${floor}-${segment.id}`,
        segment,
        geometry: loopGeometry(segment.x0, segment.x1, segment.z0, segment.z1, height),
      }));
    });
  }, [focusFloor]);

  const gapOutlines = useMemo(() => {
    return floorsFor(focusFloor).flatMap((floor) => {
      const height = deckY(floor);
      return CORRIDOR_GAPS.map((gap, index) => ({
        key: `${floor}-gap-${index}`,
        geometry: loopGeometry(gap.x0, gap.x1, gap.z0, gap.z1, height + 0.02),
      }));
    });
  }, [focusFloor]);

  useEffect(() => () => leaders.dispose(), [leaders]);
  useEffect(() => {
    return () => {
      for (const outline of outlines) outline.geometry.dispose();
    };
  }, [outlines]);
  useEffect(() => {
    return () => {
      for (const gap of gapOutlines) gap.geometry.dispose();
    };
  }, [gapOutlines]);

  useEffect(() => {
    if (!onReport) return;
    const active = showIds || showCoverage;
    if (active && placed.length === 0 && CORRIDOR_SEGMENTS.length > 0) return;
    if (!active) {
      onReport({
        detected: CORRIDOR_SEGMENTS.length,
        labelled: 0,
        missingIds: [],
        active: false,
      });
      return;
    }
    const labelled = new Set(placed.map((mark) => mark.id));
    onReport({
      detected: CORRIDOR_SEGMENTS.length,
      labelled: labelled.size,
      missingIds: CORRIDOR_SEGMENTS.filter((segment) => !labelled.has(segment.id)).map(
        (segment) => segment.id,
      ),
      active: true,
    });
  }, [onReport, placed, showIds, showCoverage]);

  useFrame(() => {
    const orbit = controls as { target?: Vector3 } | null;
    const target = orbit?.target;
    const distance = target ? camera.position.distanceTo(target) : camera.position.length();
    const nextTier = tierOf(distance);
    if (nextTier !== tier) setTier(nextTier);
    if (!showIds && !showDimensions && !showCoverage) {
      if (signature.current !== "") {
        signature.current = "";
        setPlaced([]);
      }
      return;
    }
    const next = placeSegments(
      nextTier,
      camera as Camera,
      y,
      gl.domElement.clientWidth,
      gl.domElement.clientHeight,
    );
    const sign = `${nextTier}|${next.map((mark) => `${mark.key}@${mark.x.toFixed(2)},${mark.z.toFixed(2)}`).join("|")}`;
    if (sign === signature.current) return;
    signature.current = sign;
    setPlaced(next);
  });

  return (
    <group>
      {floorsFor(focusFloor).map((floor) =>
        CORRIDOR_SEGMENTS.map((segment) => {
          const active = activeId === segment.id;
          const dim = Boolean(activeId) && !active;
          const interactive = showCoverage || showIds || showDimensions;
          if (!interactive && !active && !dim) return null;
          return (
            <mesh
              key={`fill-${floor}-${segment.id}`}
              position={[
                (segment.x0 + segment.x1) / 2,
                deckY(floor),
                (segment.z0 + segment.z1) / 2,
              ]}
              scale={[segment.x1 - segment.x0, 0.04, segment.z1 - segment.z0]}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHoverId(segment.id);
              }}
              onPointerOut={() => setHoverId((current) => (current === segment.id ? null : current))}
              onClick={(event) => event.stopPropagation()}
            >
              <boxGeometry />
              <meshBasicMaterial
                color={active || (showCoverage && !dim) ? "#c9a45c" : "#14241c"}
                transparent
                opacity={active ? 0.55 : dim ? 0.38 : showCoverage ? 0.28 : 0}
                depthWrite={false}
              />
            </mesh>
          );
        }),
      )}
      {showCoverage || activeId
        ? outlines.map((outline) => {
            const active = activeId === outline.segment.id;
            if (!showCoverage && !active) return null;
            return (
              <lineLoop key={outline.key} geometry={outline.geometry} raycast={() => undefined}>
                <lineBasicMaterial
                  color={active ? "#f7f2e6" : "#c9a45c"}
                  transparent
                  opacity={active ? 1 : 0.75}
                  depthWrite={false}
                />
              </lineLoop>
            );
          })
        : null}
      {showCoverage
        ? gapOutlines.map((gap) => (
            <lineLoop key={gap.key} geometry={gap.geometry} raycast={() => undefined}>
              <lineBasicMaterial color="#d4543c" transparent opacity={0.95} depthWrite={false} />
            </lineLoop>
          ))
        : null}
      {showChips && placed.some((mark) => mark.lead) ? (
        <lineSegments geometry={leaders} raycast={() => undefined}>
          <lineBasicMaterial color="#c9a45c" transparent opacity={0.7} depthWrite={false} />
        </lineSegments>
      ) : null}
      {showChips
        ? placed.map((mark) => (
            <SegmentChip
              key={mark.key}
              label={mark.label}
              position={[mark.x, y, mark.z]}
              showIds={showIds || showCoverage}
              active={activeId === mark.id}
            />
          ))
        : null}
      {showFeet
        ? CORRIDOR_FOOT_MARKS.map((mark) => (
            <Html
              key={mark.key}
              position={[mark.x, y, mark.z]}
              center
              zIndexRange={[8, 0]}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <span className="pointer-events-none block rounded-[3px] bg-[#0d1a14]/90 px-0.5 py-px text-[8px] leading-none font-semibold text-[#e8d5a3] ring-1 ring-[rgba(232,213,163,0.35)] select-none">
                {mark.foot}′
              </span>
            </Html>
          ))
        : null}
    </group>
  );
}

function SegmentChip({
  label,
  position,
  showIds,
  active,
}: {
  label: string
  position: [number, number, number]
  showIds: boolean
  active: boolean
}) {
  if (!showIds) return null;
  return (
    <Html position={position} zIndexRange={[12, 0]} style={{ pointerEvents: "none", userSelect: "none" }}>
      <span
        className={`pointer-events-none inline-flex rounded-[4px] px-1 py-px text-[9px] leading-none font-semibold whitespace-nowrap ring-1 select-none ${
          active
            ? "bg-[#c9a45c] text-[#14241c] ring-[#f7f2e6]"
            : "bg-[#0d1a14]/90 text-[#f7f2e6] ring-[rgba(232,213,163,0.4)]"
        }`}
      >
        {label}
      </span>
    </Html>
  );
}
