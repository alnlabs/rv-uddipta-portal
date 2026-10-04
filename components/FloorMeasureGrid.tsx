"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  type Camera,
  type LineSegments,
} from "three";
import {
  FLOOR_COUNT,
  FOOTPRINT_IDS,
  FT,
  UNIT_FOOTPRINT,
  buildingTopY,
  floorBaseY,
  unitPlanSize,
} from "@/lib/layout3d";

const UNIT_TOP = 0.92;

type Axis = "x" | "z";
type Tier = "far" | "mid" | "near";

type Mark = {
  key: string
  text: string
  x: number
  z: number
  axis: Axis
  major: boolean
};

const scratch = new Vector3();

function floorBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const id of FOOTPRINT_IDS) {
    const spot = UNIT_FOOTPRINT[id];
    if (!spot) continue;
    const [w, d] = unitPlanSize(id);
    const [x, z] = spot;
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minZ = Math.min(minZ, z - d / 2);
    maxZ = Math.max(maxZ, z + d / 2);
  }
  const pad = 3 * FT;
  const originX = Math.floor((minX - pad) / FT) * FT;
  const originZ = Math.floor((minZ - pad) / FT) * FT;
  const endX = Math.ceil((maxX + pad) / FT) * FT;
  const endZ = Math.ceil((maxZ + pad) / FT) * FT;
  return {
    originX,
    originZ,
    xFeet: Math.round((endX - originX) / FT),
    zFeet: Math.round((endZ - originZ) / FT),
  };
}

function linePositions(
  bounds: ReturnType<typeof floorBounds>,
  axis: Axis,
  major: boolean,
) {
  const { xFeet, zFeet } = bounds;
  const coords: number[] = [];
  if (axis === "x") {
    for (let i = 0; i <= xFeet; i += 1) {
      if ((i % 5 === 0) !== major) continue;
      const x = i * FT;
      coords.push(x, 0, 0, x, 0, zFeet * FT);
    }
  } else {
    for (let i = 0; i <= zFeet; i += 1) {
      if ((i % 5 === 0) !== major) continue;
      const z = i * FT;
      coords.push(0, 0, z, xFeet * FT, 0, z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(coords, 3));
  return geometry;
}

function ignoreRaycast() {}

function tierOf(distance: number): Tier {
  if (distance > 42) return "far";
  if (distance > 20) return "mid";
  return "near";
}

function candidatesFor(
  bounds: ReturnType<typeof floorBounds>,
  tier: Tier,
  showX: boolean,
  showZ: boolean,
) {
  const step = tier === "far" ? 5 : 1;
  const repeat = tier === "far" ? 10_000 : tier === "mid" ? 20 : 8;
  const marks: Mark[] = [];
  if (showX) {
    for (let feet = 0; feet <= bounds.xFeet; feet += step) {
      for (let across = 0; across <= bounds.zFeet; across += repeat) {
        marks.push({
          key: `x-${feet}-${across}`,
          text: `${feet}′`,
          x: feet * FT,
          z: across * FT,
          axis: "x",
          major: feet % 5 === 0,
        });
      }
    }
  }
  if (showZ) {
    for (let feet = 0; feet <= bounds.zFeet; feet += step) {
      for (let across = 0; across <= bounds.xFeet; across += repeat) {
        marks.push({
          key: `z-${feet}-${across}`,
          text: `${feet}′`,
          x: across * FT,
          z: feet * FT,
          axis: "z",
          major: feet % 5 === 0,
        });
      }
    }
  }
  marks.sort((a, b) => Number(b.major) - Number(a.major));
  return marks;
}

function placeMarks(
  marks: Mark[],
  camera: Camera,
  width: number,
  height: number,
  originX: number,
  originZ: number,
  y: number,
  gap: number,
) {
  const kept: { key: string; text: string; x: number; z: number }[] = [];
  const spots: { sx: number; sy: number }[] = [];
  for (const mark of marks) {
    scratch.set(originX + mark.x, y, originZ + mark.z);
    const projected = scratch.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    const sx = (projected.x * 0.5 + 0.5) * width;
    const sy = (-projected.y * 0.5 + 0.5) * height;
    if (sx < -20 || sy < -20 || sx > width + 20 || sy > height + 20) continue;
    if (spots.some((spot) => Math.hypot(spot.sx - sx, spot.sy - sy) < gap)) continue;
    spots.push({ sx, sy });
    kept.push({ key: mark.key, text: mark.text, x: mark.x, z: mark.z });
    if (kept.length >= 160) break;
  }
  return kept;
}

export function FloorMeasureGrid({
  focusFloor,
  showX,
  showZ,
}: {
  focusFloor: number
  showX: boolean
  showZ: boolean
}) {
  const { camera, gl, controls } = useThree();
  const bounds = useMemo(() => floorBounds(), []);
  const minorX = useMemo(() => linePositions(bounds, "x", false), [bounds]);
  const majorX = useMemo(() => linePositions(bounds, "x", true), [bounds]);
  const minorZ = useMemo(() => linePositions(bounds, "z", false), [bounds]);
  const majorZ = useMemo(() => linePositions(bounds, "z", true), [bounds]);
  const pool = useMemo(
    () => ({
      far: candidatesFor(bounds, "far", showX, showZ),
      mid: candidatesFor(bounds, "mid", showX, showZ),
      near: candidatesFor(bounds, "near", showX, showZ),
    }),
    [bounds, showX, showZ],
  );
  const minorXRef = useRef<LineSegments>(null);
  const minorZRef = useRef<LineSegments>(null);
  const [placed, setPlaced] = useState<
    { key: string; text: string; x: number; z: number }[]
  >([]);
  const [tier, setTier] = useState<Tier>("far");
  const signature = useRef("");

  const y =
    focusFloor > 0
      ? floorBaseY(Math.min(focusFloor, FLOOR_COUNT)) + UNIT_TOP + 0.04
      : buildingTopY() + 0.06;

  useFrame(() => {
    const orbit = controls as { target?: Vector3 } | null;
    const target = orbit?.target;
    const distance = target ? camera.position.distanceTo(target) : camera.position.length();
    const nextTier = tierOf(distance);
    const showMinor = nextTier !== "far";
    if (minorXRef.current) minorXRef.current.visible = showMinor && showX;
    if (minorZRef.current) minorZRef.current.visible = showMinor && showZ;

    const width = gl.domElement.clientWidth;
    const height = gl.domElement.clientHeight;
    const gap = nextTier === "far" ? 42 : nextTier === "mid" ? 20 : 13;
    const next = placeMarks(
      pool[nextTier],
      camera as Camera,
      width,
      height,
      bounds.originX,
      bounds.originZ,
      y,
      gap,
    );
    const sign = `${nextTier}|${next.map((mark) => mark.key).join(",")}`;
    if (sign === signature.current) return;
    signature.current = sign;
    setTier(nextTier);
    setPlaced(next);
  });

  const labelClass =
    tier === "near"
      ? "pointer-events-none font-mono text-[11px] leading-none text-[#4a4034] select-none"
      : "pointer-events-none font-mono text-[8px] leading-none text-[#5c5346] select-none";

  return (
    <group position={[bounds.originX, y, bounds.originZ]}>
      {showX ? (
        <>
          <lineSegments geometry={majorX} raycast={ignoreRaycast}>
            <lineBasicMaterial color="#6d624f" transparent opacity={0.45} depthWrite={false} />
          </lineSegments>
          <lineSegments ref={minorXRef} geometry={minorX} raycast={ignoreRaycast}>
            <lineBasicMaterial color="#8a7d68" transparent opacity={0.2} depthWrite={false} />
          </lineSegments>
        </>
      ) : null}
      {showZ ? (
        <>
          <lineSegments geometry={majorZ} raycast={ignoreRaycast}>
            <lineBasicMaterial color="#6d624f" transparent opacity={0.45} depthWrite={false} />
          </lineSegments>
          <lineSegments ref={minorZRef} geometry={minorZ} raycast={ignoreRaycast}>
            <lineBasicMaterial color="#8a7d68" transparent opacity={0.2} depthWrite={false} />
          </lineSegments>
        </>
      ) : null}
      {placed.map((mark) => (
        <Html
          key={mark.key}
          position={[mark.x, 0.02, mark.z]}
          center
          distanceFactor={tier === "near" ? 16 : 26}
          zIndexRange={[4, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <span
            className={labelClass}
            style={{ textShadow: "0 0 2px rgba(255,252,245,0.95)", userSelect: "none" }}
          >
            {mark.text}
          </span>
        </Html>
      ))}
    </group>
  );
}
