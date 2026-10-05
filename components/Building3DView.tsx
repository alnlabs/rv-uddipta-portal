"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from "react";
import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Path,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Group,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CommunityWalkers } from "@/components/CommunityWalkers";
import { CorridorSegmentLayer, type CorridorLabelReport } from "@/components/CorridorSegmentLayer";
import { DebugLabelLayer, DebugLayerPanel } from "@/components/DebugLabelLayer";
import { FloorMeasureGrid } from "@/components/FloorMeasureGrid";
import { buildDebugLabels, DEBUG_LAYER_OPTIONS, type DebugLayer } from "@/lib/debugLabel";
import { CompassHud, CompassSync } from "@/components/ViewCompass";
import {
  CARDINAL_LABEL,
  SITE_ORIENTATION,
  cardinalIdForDir,
} from "@/lib/siteOrientation";
import { FlatTextFacts, FlatViews, toPlanInput } from "@/components/FlatViews";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import { BUILDING } from "@/lib/building";
import { getWalkFlatFloorHint, isWalkableFlat } from "@/lib/walkFlatInterior";
import {
  BUILDING_CENTER,
  CAMERA_START,
  CLUBHOUSE_ID,
  COMPOUND_ID,
  CORRIDORS,
  CORRIDOR_WALLS,
  A4_CORRIDOR_FILLS,
  A4_ENTRANCE,
  A8_CORRIDOR_FILLS,
  A8_ENTRANCE,
  B3_CORRIDOR_FILLS,
  B3_ENTRANCE,
  LIFT_A4,
  LIFT_AS1,
  LIFT_BE5,
  LIFT_BN5,
  STAIR_A4,
  STAIR_A8,
  STAIR_B3,
  STAIR_BN7,
  STAIR_U,
  FACE_MARKS,
  FLOOR_COUNT,
  FLOOR_HEIGHT,
  FOOTPRINT_IDS,
  SITE,
  SITE_AREA_LABELS,
  SITE_AREA_LABEL_TEXT,
  AMENITY_LABEL_IDS,
  AMENITY_LEGEND,
  LAWN_PARTS,
  SITE_MARK_LABEL_IDS,
  PARK_WIDTH,
  TRACK_WIDTH,
  compoundNorthFace,
  CRICKET_NETS,
  DRIVE_PATH,
  INNER_SHORT_WALL,
  KIDS_PLAY_AREA,
  WALL_TREES,
  PERIMETER_BANDS,
  STILT_STRUCTURE,
  buildingTopY,
  floorBaseY,
  COMPOUND_FACE_MARKS,
  clubhouseMarkPosition,
  compoundExtraMarks,
  compoundGatePosition,
  COMPOUND_GATE,
  compoundMarkPosition,
  debugMarkPosition,
  groundLabelY,
  isClubhousePodiumFlat,
  labelPosition,
  UNIT_SIZE,
  unitBoxSize,
  unitPosition,
} from "@/lib/layout3d";

type LabelKey =
  | "myFlat"
  | "units"
  | "corridors"
  | "compound"
  | "siteMarks"
  | "amenities"
  | "clubhouse"
  | "gate"
  | "faces";

type LabelVisibility = Record<LabelKey, boolean>;

const AMENITY_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  AMENITY_LEGEND.flatMap((entry) => entry.ids.map((id) => [id, entry.label])),
);

const LABEL_OPTIONS: { key: LabelKey; label: string }[] = [
  { key: "myFlat", label: "My flat" },
  { key: "units", label: "Flats" },
  { key: "corridors", label: "Corridors" },
  { key: "amenities", label: "Amenities" },
  { key: "compound", label: "Compound" },
  { key: "siteMarks", label: "Site marks" },
  { key: "clubhouse", label: "Clubhouse" },
  { key: "gate", label: "Gate" },
  { key: "faces", label: "Face marks" },
];

const IS_DEV = process.env.NODE_ENV === "development";

/** Labels available to every signed-in owner (not just development). */
const PROD_LABEL_KEYS = new Set<LabelKey>(["myFlat", "amenities"]);

const DEFAULT_LABELS: LabelVisibility = {
  myFlat: true,
  units: IS_DEV,
  corridors: IS_DEV,
  compound: false,
  siteMarks: false,
  amenities: false,
  clubhouse: false,
  gate: false,
  faces: false,
};

/** Everything except prod toggles is development-only. */
const DEV_ONLY_LABEL_KEYS = new Set<LabelKey>(
  LABEL_OPTIONS.filter((option) => !PROD_LABEL_KEYS.has(option.key)).map(
    (option) => option.key,
  ),
);

const HEAVY_LABEL =
  "pointer-events-none block rounded-md bg-[#0d1a14] px-2 py-1 text-[12px] leading-none font-black tracking-wide text-[#f7f2e6] shadow-[0_1px_4px_rgba(0,0,0,0.45)] ring-1 ring-[rgba(232,213,163,0.4)] select-none";
const HEAVY_LABEL_SM =
  "pointer-events-none block rounded bg-[#0d1a14] px-1.5 py-0.5 text-[10px] leading-none font-extrabold tracking-wide text-[#e8d5a3] shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-1 ring-[rgba(232,213,163,0.35)] select-none";
export type ModelFlat = {
  flatNumber: string
  wing: string
  floor: number
  unit: number
  type: string
  facing: string
  areaSqft: number | null
  saleStatus?: "unsold" | "sold"
  occupancyLabel?: string | null
  openForRent?: boolean
  openForResale?: boolean
  ownerName?: string
  ownerEmail?: string
  phoneMasked?: string
  tenantName?: string
  tenantPhoneMasked?: string
  memberNames?: string[]
  statusLabel?: string | null
};

const TONE = {
  grey: "#b0b5b2",
  greyDim: "#6e7471",
  floor: "#6d8fb8",
  bought: "#2f9a66",
  boughtDim: "#247a52",
  mine: "#c9a45c",
  selected: "#e8d5a3",
  hover: "#f4ead0",
  clubhouse: "#e2d4c2",
} as const;

const ZOOM_STEP = 1.03;
const ZOOM_MIN = 6;
const ZOOM_MAX = 90;

const PAVING_LIGHT = "#d2d5d3";
const PAVING_DARK = "#b6bab8";
const PAVING_LINE = "rgba(110,114,112,0.28)";
const PAVING_TILE = 2.35;
const TRACK_SURFACE = "#c4b8a4";
const TRACK_ROUGHNESS = 0.82;
/** East-wall lawn columns beside parkE — match L199 park green (gap to trackE). */
const EAST_PARK_GAP_LAWN_IDS = new Set([
  // L314 → L188 (+ south continuation)
  "L188",
  "L200",
  "L211",
  "L222",
  "L233",
  "L244",
  "L255",
  "L265",
  "L275",
  "L285",
  "L295",
  "L305",
  "L314",
  // L294 → L187
  "L187",
  "L199",
  "L210",
  "L221",
  "L232",
  "L243",
  "L254",
  "L264",
  "L274",
  "L284",
  "L294",
  "L304",
]);

function createCheckeredPavingTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cells = 4;
  const cell = size / cells;
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? PAVING_LIGHT : PAVING_DARK;
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
  // Interior grid only — skip texture edges so abutting meshes don't get a dark/light seam.
  ctx.strokeStyle = PAVING_LINE;
  ctx.lineWidth = 1.25;
  for (let i = 1; i < cells; i += 1) {
    const p = i * cell + 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(1, 1);
  texture.needsUpdate = true;
  return texture;
}

/** Map UVs from world XZ so every paved mesh shares one continuous checker. */
function applyWorldPavingUVs(
  geometry: BufferGeometry,
  tile: number,
  offsetX = 0,
  offsetZ = 0,
) {
  const pos = geometry.attributes.position;
  if (!geometry.attributes.uv) {
    geometry.setAttribute(
      "uv",
      new Float32BufferAttribute(new Float32Array(pos.count * 2), 2),
    );
  }
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    const wx = pos.getX(i) + offsetX;
    // Shape/plane lie in XY before -90° X rotation → local Y becomes -world Z.
    const wz = -pos.getY(i) + offsetZ;
    uv.setXY(i, wx / tile, wz / tile);
  }
  uv.needsUpdate = true;
}

function useCheckeredPaving() {
  const texture = useMemo(() => createCheckeredPavingTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function nudgeZoom(controls: OrbitControlsImpl, inward: boolean) {
  const offset = controls.object.position.clone().sub(controls.target);
  const distance = offset.length();
  const next = inward ? distance / ZOOM_STEP : distance * ZOOM_STEP;
  offset.setLength(Math.min(controls.maxDistance, Math.max(controls.minDistance, next)));
  controls.object.position.copy(controls.target).add(offset);
  controls.update();
}

function isBought(flat: ModelFlat) {
  return flat.saleStatus === "sold" || Boolean(flat.ownerName);
}

/** Keep 3D HTML labels under the HUD and the flat popup. */
function SceneHtml({
  zIndexRange: _zIndexRange,
  style,
  ...props
}: ComponentProps<typeof Html>) {
  return (
    <Html
      {...props}
      zIndexRange={[8, 0]}
      style={{ pointerEvents: "none", userSelect: "none", ...style }}
    />
  );
}

function colorFor(
  flat: ModelFlat,
  selected: boolean,
  hovered: boolean,
  dimmed: boolean,
  mine: boolean,
  onFocusFloor: boolean,
) {
  if (mine) return TONE.mine;
  if (selected) return TONE.selected;
  if (hovered) return TONE.hover;
  if (isBought(flat)) return dimmed ? TONE.boughtDim : TONE.bought;
  if (onFocusFloor) return TONE.floor;
  if (dimmed) return TONE.greyDim;
  return TONE.grey;
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("3D view failed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center bg-[#1b3a2f] p-4 text-center">
          <div>
            <p className="text-[#e8d5a3]">The 3D view stopped. Reload it to continue.</p>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-full bg-[#c9a45c] px-4 font-semibold text-[#14241c]"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReset();
              }}
            >
              Reload 3D
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function UnitMesh({
  flat,
  selected,
  dimmed,
  mine,
  showMyLabel,
  onFocusFloor,
  geometry,
  onSelect,
  walkMode,
  walkFloor,
}: {
  flat: ModelFlat
  selected: boolean
  dimmed: boolean
  mine: boolean
  showMyLabel: boolean
  onFocusFloor: boolean
  geometry: BoxGeometry
  onSelect: (flat: ModelFlat) => void
  walkMode?: boolean
  walkFloor?: number
}) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const position = unitPosition(flat.wing, flat.unit, flat.floor);
  const size = unitBoxSize(flat.wing, flat.unit);
  const bought = isBought(flat);
  const keepBright = selected || hovered || mine || bought;
  const faded = dimmed && !keepBright;
  // Hollow CAD stacks on the walker's floor — WalkFlatInteriors draws them.
  const hideForWalkInterior =
    !!walkMode &&
    walkFloor != null &&
    flat.floor === walkFloor &&
    isWalkableFlat(flat.wing, flat.unit);

  useFrame(({ clock }) => {
    if (!meshRef.current || hideForWalkInterior) return;
    const mat = meshRef.current.material as MeshStandardMaterial;
    if (mine) {
      const pulse = 0.28 + Math.sin(clock.elapsedTime * 2.2) * 0.14;
      mat.emissive.set(TONE.mine);
      mat.emissiveIntensity = pulse;
      return;
    }
    if (bought && !selected && !hovered) {
      mat.emissive.set(TONE.bought);
      mat.emissiveIntensity = 0.16;
    }
  });

  if (hideForWalkInterior) return null;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={
          mine
            ? ([size[0] * 1.04, size[1] * 1.03, size[2] * 1.04] as [
                number,
                number,
                number,
              ])
            : bought
              ? ([size[0] * 1.015, size[1] * 1.01, size[2] * 1.015] as [
                  number,
                  number,
                  number,
                ])
              : size
        }
        geometry={geometry}
        renderOrder={faded ? 0 : mine ? 3 : bought ? 2 : 1}
        raycast={faded ? () => null : undefined}
        onClick={
          faded
            ? undefined
            : (event) => {
                event.stopPropagation();
                onSelect(flat);
              }
        }
        onPointerOver={
          faded
            ? undefined
            : (event) => {
                event.stopPropagation();
                setHovered(true);
                document.body.style.cursor = "pointer";
              }
        }
        onPointerOut={
          faded
            ? undefined
            : () => {
                setHovered(false);
                document.body.style.cursor = "auto";
              }
        }
      >
        <meshStandardMaterial
          color={colorFor(flat, selected, hovered, dimmed, mine, onFocusFloor)}
          transparent={dimmed && !keepBright}
          opacity={faded ? 0.18 : dimmed && !keepBright ? 0.45 : 1}
          depthWrite={!faded}
          roughness={mine || bought ? 0.4 : dimmed && !keepBright ? 0.78 : 0.55}
          metalness={mine ? 0.18 : bought ? 0.12 : dimmed && !keepBright ? 0.02 : 0.08}
          emissive={mine ? TONE.mine : bought ? TONE.bought : "#000000"}
          emissiveIntensity={mine ? 0.28 : bought ? 0.16 : 0}
        />
      </mesh>
      {mine && showMyLabel ? (
        <SceneHtml
          position={[0, size[1] * 0.58, 0]}
          center
          distanceFactor={22}
          zIndexRange={[40, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="rounded bg-[#c9a45c] px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wide text-[#14241c] shadow-sm">
              {flat.flatNumber}
            </span>
            <span
              className="block size-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-[#c9a45c]"
              aria-hidden
            />
          </div>
        </SceneHtml>
      ) : null}
    </group>
  );
}

function ringToShape(
  outer: [number, number][],
  hole?: [number, number][],
) {
  const shape = new Shape();
  const [x0, z0] = outer[0];
  shape.moveTo(x0, -z0);
  for (let i = 1; i < outer.length; i += 1) {
    const [x, z] = outer[i];
    shape.lineTo(x, -z);
  }
  shape.closePath();
  if (hole && hole.length > 0) {
    const path = new Path();
    const [hx0, hz0] = hole[0];
    path.moveTo(hx0, -hz0);
    for (let i = 1; i < hole.length; i += 1) {
      const [x, z] = hole[i];
      path.lineTo(x, -z);
    }
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

function PerimeterBands() {
  const parkGeoms = useMemo(
    () =>
      PERIMETER_BANDS.park.parts.map((part) => ({
        id: part.id,
        geometry: new ShapeGeometry(ringToShape(part.ring)),
      })),
    [],
  );
  const trackGeoms = useMemo(
    () =>
      PERIMETER_BANDS.track.parts.map((part) => ({
        id: part.id,
        geometry: new ShapeGeometry(ringToShape(part.ring)),
      })),
    [],
  );

  useEffect(
    () => () => {
      for (const part of parkGeoms) part.geometry.dispose();
      for (const part of trackGeoms) part.geometry.dispose();
    },
    [parkGeoms, trackGeoms],
  );

  return (
    <>
      {parkGeoms.map((part) => (
        <mesh
          key={part.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          geometry={part.geometry}
          renderOrder={1}
        >
          <meshStandardMaterial
            color="#4a7a58"
            roughness={0.9}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
      {trackGeoms.map((part) => (
        <mesh
          key={part.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.028, 0]}
          geometry={part.geometry}
          renderOrder={2}
        >
          <meshStandardMaterial
            color={TRACK_SURFACE}
            roughness={0.82}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            depthWrite
          />
        </mesh>
      ))}
    </>
  );
}

function GateFoldPanel({
  width,
  height,
  metal,
  accent,
}: {
  width: number
  height: number
  metal: string
  accent: string
}) {
  const bars = 3;
  return (
    <group>
      <mesh position={[0, height / 2, width / 2]}>
        <boxGeometry args={[0.045, height, width]} />
        <meshStandardMaterial
          color={metal}
          roughness={0.42}
          metalness={0.5}
          transparent
          opacity={0.2}
        />
      </mesh>
      <mesh position={[0, height - 0.03, width / 2]}>
        <boxGeometry args={[0.055, 0.055, width]} />
        <meshStandardMaterial color={metal} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, width / 2]}>
        <boxGeometry args={[0.055, 0.055, width]} />
        <meshStandardMaterial color={metal} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.055, height, 0.055]} />
        <meshStandardMaterial color={metal} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, height / 2, width]}>
        <boxGeometry args={[0.055, height, 0.055]} />
        <meshStandardMaterial color={metal} roughness={0.35} metalness={0.6} />
      </mesh>
      {Array.from({ length: bars }, (_, i) => {
        const u = (i + 1) / (bars + 1);
        return (
          <mesh key={`v-${i}`} position={[0, height / 2, width * u]}>
            <boxGeometry args={[0.032, height * 0.9, 0.035]} />
            <meshStandardMaterial color={metal} roughness={0.38} metalness={0.58} />
          </mesh>
        );
      })}
      <mesh position={[0, height * 0.38, width / 2]}>
        <boxGeometry args={[0.038, 0.038, width * 0.92]} />
        <meshStandardMaterial color={accent} roughness={0.45} metalness={0.4} />
      </mesh>
    </group>
  );
}

function useGateTitleTexture(titleW: number, titleH: number) {
  const texture = useMemo(() => {
    // Match board aspect so letters aren't stretched on the plane.
    const h = 512;
    const w = Math.max(256, Math.round(h * (titleW / Math.max(titleH, 0.01))));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1612";
    ctx.fillRect(0, 0, w, h);
    const pad = Math.max(14, Math.round(h * 0.04));
    ctx.strokeStyle = "#c9a45c";
    ctx.lineWidth = Math.max(8, Math.round(h * 0.025));
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.strokeStyle = "rgba(232,213,163,0.35)";
    ctx.lineWidth = Math.max(2, Math.round(h * 0.008));
    ctx.strokeRect(pad * 1.8, pad * 1.8, w - pad * 3.6, h - pad * 3.6);

    const label = BUILDING.name.toUpperCase();
    let fontSize = Math.floor(h * 0.42);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e8d5a3";
    const maxTextW = w - pad * 5;
    do {
      ctx.font = `700 ${fontSize}px Georgia, 'Times New Roman', serif`;
      if (ctx.measureText(label).width <= maxTextW) break;
      fontSize -= 4;
    } while (fontSize > 24);
    ctx.fillText(label, w / 2, h / 2 + fontSize * 0.04);

    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
    return map;
  }, [titleH, titleW]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function CompoundArchGate() {
  const {
    position,
    clearSpan,
    archR,
    archRise,
    springY,
    archDepth,
    archThick,
    pillarH,
    capH,
    pillarW,
    pillarD,
    pillarOffset,
    grilleH,
    titleH,
    titleW,
  } = COMPOUND_GATE;
  const stone = "#d8d2c6";
  const stoneDeep = "#c4b9a8";
  const stoneTrim = "#ebe4d6";
  const metal = "#6a6e72";
  const accent = "#c9a45c";
  const [open, setOpen] = useState(true);
  const leftOuterRef = useRef<Group>(null);
  const leftFoldRef = useRef<Group>(null);
  const rightOuterRef = useRef<Group>(null);
  const rightFoldRef = useRef<Group>(null);
  const titleMap = useGateTitleTexture(titleW, titleH);

  const archGeom = useMemo(() => {
    // Smooth segmental arch ring in ZY (extruded along X).
    const outerR = archR + archThick * 0.55;
    const innerR = Math.max(archR - archThick * 0.55, 0.2);
    const shape = new Shape();
    const segs = 36;
    shape.moveTo(-outerR, 0);
    for (let i = 0; i <= segs; i += 1) {
      const a = Math.PI * (i / segs);
      shape.lineTo(-outerR * Math.cos(a), outerR * Math.sin(a));
    }
    for (let i = segs; i >= 0; i -= 1) {
      const a = Math.PI * (i / segs);
      shape.lineTo(-innerR * Math.cos(a), innerR * Math.sin(a));
    }
    shape.closePath();
    const geom = new ExtrudeGeometry(shape, {
      depth: archDepth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 2,
      curveSegments: 1,
    });
    geom.translate(0, 0, -archDepth / 2);
    return geom;
  }, [archDepth, archR, archThick]);

  useEffect(() => () => archGeom.dispose(), [archGeom]);

  const panelW = clearSpan * 0.245;
  const lintelW = Math.max(titleW + 0.35, clearSpan + pillarW * 1.4);
  const lintelY = springY + archRise + archThick * 0.25;
  const titleY = lintelY + 0.2 + titleH / 2;

  useFrame((_, delta) => {
    // Bi-fold: outer swings ~90°, inner folds back ~180° relative → panels stack.
    const outerTarget = open ? Math.PI * 0.5 : 0;
    const foldTarget = open ? -Math.PI : 0;
    const k = 1 - Math.exp(-delta * 6.5);
    if (leftOuterRef.current) {
      leftOuterRef.current.rotation.y = MathUtils.lerp(
        leftOuterRef.current.rotation.y,
        outerTarget,
        k,
      );
    }
    if (leftFoldRef.current) {
      leftFoldRef.current.rotation.y = MathUtils.lerp(
        leftFoldRef.current.rotation.y,
        foldTarget,
        k,
      );
    }
    if (rightOuterRef.current) {
      rightOuterRef.current.rotation.y = MathUtils.lerp(
        rightOuterRef.current.rotation.y,
        -outerTarget,
        k,
      );
    }
    if (rightFoldRef.current) {
      rightFoldRef.current.rotation.y = MathUtils.lerp(
        rightFoldRef.current.rotation.y,
        -foldTarget,
        k,
      );
    }
  });

  const bifold = (side: "left" | "right") => {
    const hingeZ = side === "left" ? -clearSpan / 2 : clearSpan / 2;
    const dir = side === "left" ? 1 : -1;
    const outerRef = side === "left" ? leftOuterRef : rightOuterRef;
    const foldRef = side === "left" ? leftFoldRef : rightFoldRef;
    return (
      <group ref={outerRef} position={[0.04, 0, hingeZ]}>
        <group scale={[1, 1, dir]}>
          <GateFoldPanel
            width={panelW}
            height={grilleH}
            metal={metal}
            accent={accent}
          />
          <group ref={foldRef} position={[0, 0, panelW]}>
            <GateFoldPanel
              width={panelW}
              height={grilleH}
              metal={metal}
              accent={accent}
            />
          </group>
        </group>
      </group>
    );
  };

  return (
    <group position={position}>
      {/* Stepped pillars */}
      {([-1, 1] as const).map((side) => (
        <group key={`pillar-${side}`} position={[0, 0, side * pillarOffset]}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[pillarD * 1.2, 0.16, pillarW * 1.25]} />
            <meshStandardMaterial color={stoneDeep} roughness={0.88} metalness={0.02} />
          </mesh>
          <mesh position={[0, pillarH / 2, 0]}>
            <boxGeometry args={[pillarD, pillarH, pillarW]} />
            <meshStandardMaterial color={stone} roughness={0.86} metalness={0.02} />
          </mesh>
          <mesh position={[0, pillarH - 0.02, 0]}>
            <boxGeometry args={[pillarD * 1.12, 0.1, pillarW * 1.15]} />
            <meshStandardMaterial color={stoneTrim} roughness={0.8} metalness={0.03} />
          </mesh>
          <mesh position={[0, pillarH + capH / 2, 0]}>
            <boxGeometry args={[pillarD * 1.28, capH, pillarW * 1.32]} />
            <meshStandardMaterial color={stoneDeep} roughness={0.82} metalness={0.04} />
          </mesh>
        </group>
      ))}

      {/* Low segmental arch — leaves room for the title board */}
      <mesh
        position={[0, springY, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[1, archRise / archR, 1]}
        geometry={archGeom}
      >
        <meshStandardMaterial color={stone} roughness={0.82} metalness={0.03} />
      </mesh>

      {/* Wide lintel backing the title */}
      <mesh position={[0, lintelY, 0]}>
        <boxGeometry args={[pillarD * 1.1, 0.16, lintelW]} />
        <meshStandardMaterial color={stoneTrim} roughness={0.8} metalness={0.03} />
      </mesh>
      <mesh position={[0, lintelY + 0.14, 0]}>
        <boxGeometry args={[pillarD * 1.22, 0.12, lintelW + 0.16]} />
        <meshStandardMaterial color={stoneDeep} roughness={0.84} metalness={0.04} />
      </mesh>

      {/* Title board — out in front of lintel so name stays visible */}
      <group position={[-pillarD * 0.72, titleY, 0]}>
        {/* Gold frame (hollow look: back plate + rim edges only via slightly larger plate behind) */}
        <mesh position={[0.02, 0, 0]}>
          <boxGeometry args={[0.04, titleH + 0.12, titleW + 0.14]} />
          <meshStandardMaterial color={accent} roughness={0.45} metalness={0.28} />
        </mesh>
        <mesh position={[0.005, 0, 0]}>
          <boxGeometry args={[0.035, titleH + 0.04, titleW + 0.04]} />
          <meshStandardMaterial color="#1a1612" roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Name texture facing outside (−X), readable left-to-right */}
        <mesh
          position={[-0.025, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          renderOrder={4}
        >
          <planeGeometry args={[titleW, titleH]} />
          <meshBasicMaterial
            map={titleMap}
            toneMapped={false}
            depthTest
            side={DoubleSide}
          />
        </mesh>
      </group>

      {/* Bi-fold leaves — click to fold open / closed */}
      <group
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {bifold("left")}
        {bifold("right")}
      </group>
    </group>
  );
}

function CompoundLawn() {
  const geometries = useMemo(
    () =>
      LAWN_PARTS.filter((part) => {
        if (part.mesh === false) return false;
        const [x, , z] = part.position;
        // Keep the arch-gate throat clear of lawn / park fill.
        const { west, gateN, gateS } = SITE.compound.bounds;
        if (
          x <= west + PARK_WIDTH + TRACK_WIDTH + 0.85 &&
          z >= gateN - 0.25 &&
          z <= gateS + 0.35
        ) {
          return false;
        }
        // Don't paint grey lawn under park / walking track (covers the bands).
        const face = compoundNorthFace(x);
        if (z < face + PARK_WIDTH + TRACK_WIDTH + 0.06) return false;
        const underBand = (bands: { ring: [number, number][] }[]) =>
          bands.some((band) => {
            const xs = band.ring.map((p) => p[0]);
            const zs = band.ring.map((p) => p[1]);
            return (
              x >= Math.min(...xs) - 0.05 &&
              x <= Math.max(...xs) + 0.05 &&
              z >= Math.min(...zs) - 0.05 &&
              z <= Math.max(...zs) + 0.05
            );
          });
        if (underBand(PERIMETER_BANDS.track.parts)) return false;
        if (underBand(PERIMETER_BANDS.park.parts)) return false;
        return true;
      }).map((part) => {
        const shape = new Shape();
        const [x0, z0] = part.ring[0];
        shape.moveTo(x0, -z0);
        for (let i = 1; i < part.ring.length; i += 1) {
          const [x, z] = part.ring[i];
          shape.lineTo(x, -z);
        }
        shape.closePath();
        const isCricket = (CRICKET_NETS.ids as readonly string[]).includes(part.id);
        const isKids = (KIDS_PLAY_AREA.ids as readonly string[]).includes(part.id);
        // East-wall gap columns (L314→L188, L294→L187) — match L199 park green.
        const isEastParkGap = EAST_PARK_GAP_LAWN_IDS.has(part.id);
        return {
          id: part.id,
          color: isCricket
            ? "#3d6b4f"
            : isKids
              ? "#6b8f4e"
              : isEastParkGap
                ? "#4a7a58"
                : part.color,
          geometry: new ShapeGeometry(shape),
        };
      }),
    [],
  );

  useEffect(
    () => () => {
      for (const part of geometries) part.geometry.dispose();
    },
    [geometries],
  );

  return (
    <>
      {geometries.map((part) => (
        <mesh
          key={part.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          geometry={part.geometry}
        >
          <meshStandardMaterial color={part.color} roughness={0.92} side={DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function BasketballCourt() {
  const { ring, hoop, rotation, position, netH, posts, edges } = SITE.basketball;
  const geometry = useMemo(() => {
    const shape = new Shape();
    const [x0, z0] = ring[0];
    shape.moveTo(x0, -z0);
    for (let i = 1; i < ring.length; i += 1) {
      const [x, z] = ring[i];
      shape.lineTo(x, -z);
    }
    shape.closePath();
    return new ShapeGeometry(shape);
  }, [ring]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const [hx, hy, hz] = hoop;
  const [cx, , cz] = position;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, hy, 0]} geometry={geometry}>
        <meshStandardMaterial color="#c45c2a" roughness={0.85} side={DoubleSide} />
      </mesh>
      {/* cricket-style cage around the triangle court */}
      {posts.map((post, index) => (
        <mesh key={`bball-post-${index}`} position={[post[0], netH / 2, post[2]]}>
          <cylinderGeometry args={[0.04, 0.045, netH, 8]} />
          <meshStandardMaterial color="#8a9096" metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
      {edges.map((edge, index) => (
        <mesh
          key={`bball-net-${index}`}
          position={edge.position}
          rotation={edge.rotation}
        >
          <boxGeometry args={edge.size} />
          <meshStandardMaterial
            color="#d8dde2"
            transparent
            opacity={0.3}
            depthWrite={false}
            wireframe
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, netH, 0]} geometry={geometry}>
        <meshStandardMaterial
          color="#d8dde2"
          transparent
          opacity={0.22}
          depthWrite={false}
          wireframe
          side={DoubleSide}
        />
      </mesh>
      {/* paint marks + hoop, oriented along the slant edge */}
      <group position={[hx, hy, hz]} rotation={rotation}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.35, 0.01, 0.55]}>
          <circleGeometry args={[0.32, 20]} />
          <meshStandardMaterial color="#d9d4cc" roughness={0.7} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.55, 0.012, 1.05]}>
          <ringGeometry args={[0.2, 0.26, 20]} />
          <meshStandardMaterial color="#f2eee6" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 1.1, 8]} />
          <meshStandardMaterial color="#6a6e72" metalness={0.35} roughness={0.4} />
        </mesh>
        <mesh position={[0.22, 1.05, 0]}>
          <boxGeometry args={[0.04, 0.45, 0.65]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.55} />
        </mesh>
        <mesh position={[0.32, 0.92, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.15, 0.018, 8, 20]} />
          <meshStandardMaterial color="#c45c2a" metalness={0.2} roughness={0.45} />
        </mesh>
        {/* rim net */}
        <mesh position={[0.32, 0.76, 0]}>
          <cylinderGeometry args={[0.145, 0.07, 0.32, 14, 1, true]} />
          <meshStandardMaterial
            color="#e8e4dc"
            transparent
            opacity={0.55}
            side={DoubleSide}
            roughness={0.7}
            depthWrite={false}
          />
        </mesh>
      </group>
      {/* centroid spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, hy + 0.015, cz]}>
        <circleGeometry args={[0.12, 16]} />
        <meshStandardMaterial color="#f2eee6" roughness={0.65} />
      </mesh>
    </group>
  );
}

function GroundTree({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.04, 0.055, 0.55, 6]} />
        <meshStandardMaterial color="#5c4634" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.32, 10, 8]} />
        <meshStandardMaterial color="#2f5a48" roughness={0.85} />
      </mesh>
      <mesh position={[0.12, 0.9, -0.08]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#3a6b54" roughness={0.85} />
      </mesh>
    </group>
  );
}

function WallTrees() {
  return (
    <>
      {WALL_TREES.map((tree) => (
        <GroundTree
          key={`wall-tree-${tree.id}`}
          x={tree.position[0]}
          y={tree.position[1]}
          z={tree.position[2]}
        />
      ))}
    </>
  );
}

function DrivePath() {
  const geometry = useMemo(() => {
    const { outer, inner } = DRIVE_PATH;
    const geom = new ShapeGeometry(ringToShape(outer, inner));
    applyWorldPavingUVs(geom, PAVING_TILE);
    return geom;
  }, []);
  const map = useCheckeredPaving();

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} geometry={geometry}>
      <meshStandardMaterial
        color="#ffffff"
        map={map}
        roughness={0.86}
        side={DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function InnerShortWall() {
  const { position, size } = INNER_SHORT_WALL;
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#cfc8bc" roughness={0.88} metalness={0.02} />
    </mesh>
  );
}

function KidsPlayArea() {
  const { walls, pad, roundSeat, tree } = KIDS_PLAY_AREA;
  const seatSegments = 16;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={pad.position}>
        <planeGeometry args={pad.size} />
        <meshStandardMaterial color="#e8a54b" roughness={0.85} />
      </mesh>
      {/* simple play marks */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[pad.position[0], pad.position[1] + 0.01, pad.position[2]]}
      >
        <circleGeometry args={[Math.min(pad.size[0], pad.size[1]) * 0.22, 20]} />
        <meshStandardMaterial color="#f2d48a" roughness={0.75} />
      </mesh>
      {walls.map((wall, index) => (
        <mesh key={`kids-wall-${index}`} position={wall.position}>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color="#b7c4a3" roughness={0.88} />
        </mesh>
      ))}
      {/* Round seating on inner side of L200, tree in the middle */}
      <group position={roundSeat.position}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry
            args={[
              roundSeat.radius - roundSeat.benchThick,
              roundSeat.radius + 0.02,
              seatSegments,
            ]}
          />
          <meshStandardMaterial color="#c4b49a" roughness={0.82} />
        </mesh>
        {Array.from({ length: seatSegments }, (_, i) => {
          const a = (i / seatSegments) * Math.PI * 2;
          const r = roundSeat.radius;
          return (
            <mesh
              key={`kids-seat-${i}`}
              position={[Math.cos(a) * r, roundSeat.benchHeight / 2, Math.sin(a) * r]}
              rotation={[0, -a, 0]}
            >
              <boxGeometry
                args={[roundSeat.benchThick * 1.6, roundSeat.benchHeight, 0.2]}
              />
              <meshStandardMaterial color="#a89078" roughness={0.88} />
            </mesh>
          );
        })}
      </group>
      <GroundTree x={tree.position[0]} y={tree.position[1]} z={tree.position[2]} />
    </group>
  );
}

function CricketNets() {
  const { ring, posts, width, length, rotation, position } = CRICKET_NETS;
  const netH = 2.35;
  const geometry = useMemo(() => {
    const shape = new Shape();
    const [x0, z0] = ring[0];
    shape.moveTo(x0, -z0);
    for (let i = 1; i < ring.length; i += 1) {
      const [x, z] = ring[i];
      shape.lineTo(x, -z);
    }
    shape.closePath();
    return new ShapeGeometry(shape);
  }, [ring]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      {/* turf pad flush to compound wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} geometry={geometry}>
        <meshStandardMaterial color="#3d6b4f" roughness={0.9} side={DoubleSide} />
      </mesh>
      {/* posts on the wall line */}
      {posts.map((post, index) => (
        <mesh key={`cricket-post-${index}`} position={[post[0], netH / 2, post[2]]}>
          <cylinderGeometry args={[0.045, 0.05, netH, 8]} />
          <meshStandardMaterial color="#8a9096" metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
      {/* cage: wall net + side + front, uniform width */}
      <group position={position} rotation={rotation}>
        {/* back net on compound wall */}
        <mesh position={[-width / 2 + 0.02, netH / 2, 0]}>
          <boxGeometry args={[0.03, netH, length]} />
          <meshStandardMaterial
            color="#d8dde2"
            transparent
            opacity={0.35}
            depthWrite={false}
            wireframe
          />
        </mesh>
        {/* front net */}
        <mesh position={[width / 2 - 0.02, netH / 2, 0]}>
          <boxGeometry args={[0.03, netH, length]} />
          <meshStandardMaterial
            color="#d8dde2"
            transparent
            opacity={0.28}
            depthWrite={false}
            wireframe
          />
        </mesh>
        {/* side nets */}
        <mesh position={[0, netH / 2, -length / 2 + 0.02]}>
          <boxGeometry args={[width, netH, 0.03]} />
          <meshStandardMaterial
            color="#d8dde2"
            transparent
            opacity={0.28}
            depthWrite={false}
            wireframe
          />
        </mesh>
        <mesh position={[0, netH / 2, length / 2 - 0.02]}>
          <boxGeometry args={[width, netH, 0.03]} />
          <meshStandardMaterial
            color="#d8dde2"
            transparent
            opacity={0.28}
            depthWrite={false}
            wireframe
          />
        </mesh>
        {/* roof net */}
        <mesh position={[0, netH, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, length]} />
          <meshStandardMaterial
            color="#cfd5da"
            transparent
            opacity={0.22}
            depthWrite={false}
            side={DoubleSide}
            wireframe
          />
        </mesh>
        {/* lane dividers — bays along L104/L105 → L140/L141 */}
        {[-0.25, 0, 0.25].map((t, index) => (
          <mesh key={`cricket-lane-${index}`} position={[0, netH / 2, length * t]}>
            <boxGeometry args={[width, netH, 0.02]} />
            <meshStandardMaterial
              color="#b8c0c8"
              transparent
              opacity={0.3}
              depthWrite={false}
              wireframe
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Site() {
  const map = useCheckeredPaving();
  // Courtyard slab follows drive inner (clamped inside NE track so it never
  // bleeds outside the L16→L162→L184 wall).
  const plotGeom = useMemo(() => {
    const { inner } = DRIVE_PATH;
    const shape = new Shape();
    const [x0, z0] = inner[0];
    shape.moveTo(x0, -z0);
    for (let i = 1; i < inner.length; i += 1) {
      const [x, z] = inner[i];
      shape.lineTo(x, -z);
    }
    shape.closePath();
    return new ShapeGeometry(shape);
  }, []);
  const courtABGeom = useMemo(() => {
    const [w, d] = SITE.courtAB.size;
    const shape = new Shape();
    shape.moveTo(-w / 2, d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(-w / 2, -d / 2);
    shape.closePath();
    const geom = new ShapeGeometry(shape);
    applyWorldPavingUVs(
      geom,
      PAVING_TILE,
      SITE.courtAB.position[0],
      SITE.courtAB.position[2],
    );
    return geom;
  }, []);
  const courtBGeom = useMemo(() => {
    const [w, d] = SITE.courtB.size;
    const shape = new Shape();
    shape.moveTo(-w / 2, d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(-w / 2, -d / 2);
    shape.closePath();
    const geom = new ShapeGeometry(shape);
    applyWorldPavingUVs(
      geom,
      PAVING_TILE,
      SITE.courtB.position[0],
      SITE.courtB.position[2],
    );
    return geom;
  }, []);

  useEffect(
    () => () => {
      plotGeom.dispose();
      courtABGeom.dispose();
      courtBGeom.dispose();
    },
    [plotGeom, courtABGeom, courtBGeom],
  );

  return (
    <>
      <CompoundLawn />
      <PerimeterBands />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} geometry={plotGeom}>
        <meshStandardMaterial color={TRACK_SURFACE} roughness={TRACK_ROUGHNESS} />
      </mesh>
      <BasketballCourt />
      <DrivePath />
      <InnerShortWall />
      <KidsPlayArea />
      <CricketNets />
      <WallTrees />
      {SITE.compound.walls.map((wall, index) => (
        <mesh
          key={`compound-${index}`}
          position={wall.position}
          rotation={wall.rotation ?? [0, 0, 0]}
        >
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color="#d8d2c6" roughness={0.86} metalness={0.02} />
        </mesh>
      ))}
      <CompoundArchGate />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={SITE.courtAB.position}
        geometry={courtABGeom}
      >
        <meshStandardMaterial color="#ffffff" map={map} roughness={0.84} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={SITE.courtB.position}
        geometry={courtBGeom}
      >
        <meshStandardMaterial color="#ffffff" map={map} roughness={0.84} />
      </mesh>
      <Clubhouse />
      <StiltLevel />
      <group position={SITE.north}>
        <mesh
          position={[
            SITE_ORIENTATION.south.x * 0.35,
            0.08,
            SITE_ORIENTATION.south.z * 0.35,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <coneGeometry args={[0.22, 0.85, 3]} />
          <meshStandardMaterial color="#e8d5a3" />
        </mesh>
        <SceneHtml position={[0, 1.1, 0]} center transform style={{ pointerEvents: "none" }}>
          <span className="text-sm font-semibold text-[#e8d5a3]">
            {CARDINAL_LABEL[cardinalIdForDir(SITE_ORIENTATION.south.x, SITE_ORIENTATION.south.z)]}
          </span>
        </SceneHtml>
      </group>
    </>
  );
}

function RoofTree({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.025, 0.032, 0.16, 6]} />
        <meshStandardMaterial color="#5c4634" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <coneGeometry args={[0.09, 0.26, 7]} />
        <meshStandardMaterial color="#3a6b54" roughness={0.8} />
      </mesh>
    </group>
  );
}

function StiltLevel() {
  const { pillars, slabs } = STILT_STRUCTURE;
  const topGeoms = useMemo(
    () =>
      slabs.map((slab) => {
        const [w, h, d] = slab.size;
        const shape = new Shape();
        shape.moveTo(-w / 2, d / 2);
        shape.lineTo(w / 2, d / 2);
        shape.lineTo(w / 2, -d / 2);
        shape.lineTo(-w / 2, -d / 2);
        shape.closePath();
        const geom = new ShapeGeometry(shape);
        return {
          id: slab.id,
          geom,
          body: slab,
          topY: slab.position[1] + h / 2 + 0.002,
        };
      }),
    [slabs],
  );
  useEffect(
    () => () => {
      for (const slab of topGeoms) slab.geom.dispose();
    },
    [topGeoms],
  );
  return (
    <group>
      {topGeoms.map(({ id, geom, body, topY }) => (
        <group key={`stilt-slab-${id}`}>
          <mesh position={body.position}>
            <boxGeometry args={body.size} />
            <meshStandardMaterial
              color={TRACK_SURFACE}
              roughness={TRACK_ROUGHNESS}
              metalness={0.03}
            />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[body.position[0], topY, body.position[2]]}
            geometry={geom}
          >
            <meshStandardMaterial
              color={TRACK_SURFACE}
              roughness={TRACK_ROUGHNESS}
              metalness={0.03}
            />
          </mesh>
        </group>
      ))}
      {pillars.map((pillar) => (
        <mesh key={`stilt-pillar-${pillar.id}`} position={pillar.position}>
          <cylinderGeometry args={[pillar.radius, pillar.radius * 1.08, pillar.height, 10]} />
          <meshStandardMaterial color="#9a9590" roughness={0.82} metalness={0.06} />
        </mesh>
      ))}
    </group>
  );
}

function Clubhouse() {
  const court = SITE.clubhouse.court;
  const [x, y, z] = court.position;
  const [sx, sy, sz] = court.size;
  const roofY = y + sy / 2;
  const cols = 2;
  const rows = 3;
  const gap = 0.16;
  const pad = 0.08;
  const subCols = 4;
  const subRows = 4;
  const grout = 0.022;
  const inset = 0.018;
  const tileW = (sx - pad * 2 - gap * (cols - 1)) / cols;
  const tileD = (sz - pad * 2 - gap * (rows - 1)) / rows;
  const originX = x - sx / 2 + pad + tileW / 2;
  const originZ = z - sz / 2 + pad + tileD / 2;
  const innerW = (tileW - inset * 2 - grout * (subCols - 1)) / subCols;
  const innerD = (tileD - inset * 2 - grout * (subRows - 1)) / subRows;
  const tiles = [];
  const trees = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tx = originX + col * (tileW + gap);
      const tz = originZ + row * (tileD + gap);
      tiles.push(
        <mesh key={`grout-${row}-${col}`} position={[tx, roofY + 0.02, tz]}>
          <boxGeometry args={[tileW, 0.04, tileD]} />
          <meshStandardMaterial color="#cfc6b8" roughness={0.78} />
        </mesh>,
      );
      const innerOriginX = tx - tileW / 2 + inset + innerW / 2;
      const innerOriginZ = tz - tileD / 2 + inset + innerD / 2;
      for (let sr = 0; sr < subRows; sr += 1) {
        for (let sc = 0; sc < subCols; sc += 1) {
          tiles.push(
            <mesh
              key={`tile-${row}-${col}-${sr}-${sc}`}
              position={[
                innerOriginX + sc * (innerW + grout),
                roofY + 0.042,
                innerOriginZ + sr * (innerD + grout),
              ]}
            >
              <boxGeometry args={[innerW, 0.03, innerD]} />
              <meshStandardMaterial color="#f4efe6" roughness={0.4} />
            </mesh>,
          );
        }
      }
      if (col < cols - 1) {
        trees.push(
          <RoofTree
            key={`tree-x-${row}-${col}`}
            x={tx + tileW / 2 + gap / 2}
            y={roofY}
            z={tz}
          />,
        );
      }
      if (row < rows - 1) {
        trees.push(
          <RoofTree
            key={`tree-z-${row}-${col}`}
            x={tx}
            y={roofY}
            z={tz + tileD / 2 + gap / 2}
          />,
        );
      }
    }
  }
  const wallT = 0.06;
  const wallH = 0.2;
  const wallY = roofY + wallH / 2;
  return (
    <group>
      {SITE.clubhouse.stacks.map((stack) => (
        <mesh key={stack.id} position={stack.position}>
          <boxGeometry args={stack.size} />
          <meshStandardMaterial
            color={TONE.clubhouse}
            roughness={0.78}
            metalness={0.02}
          />
        </mesh>
      ))}
      <mesh position={court.position}>
        <boxGeometry args={court.size} />
        <meshStandardMaterial
          color={TONE.clubhouse}
          roughness={0.78}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[x, wallY, z - sz / 2 + wallT / 2]}>
        <boxGeometry args={[sx, wallH, wallT]} />
        <meshStandardMaterial color="#d5c8b6" roughness={0.82} />
      </mesh>
      <mesh position={[x, wallY, z + sz / 2 - wallT / 2]}>
        <boxGeometry args={[sx, wallH, wallT]} />
        <meshStandardMaterial color="#d5c8b6" roughness={0.82} />
      </mesh>
      <mesh position={[x - sx / 2 + wallT / 2, wallY, z]}>
        <boxGeometry args={[wallT, wallH, sz]} />
        <meshStandardMaterial color="#d5c8b6" roughness={0.82} />
      </mesh>
      <mesh position={[x + sx / 2 - wallT / 2, wallY, z]}>
        <boxGeometry args={[wallT, wallH, sz]} />
        <meshStandardMaterial color="#d5c8b6" roughness={0.82} />
      </mesh>
      {tiles}
      {trees}
    </group>
  );
}

function GroundLabels({
  labels,
  focusFloor,
}: {
  labels: LabelVisibility
  focusFloor: number
}) {
  const groundY = groundLabelY();
  const withGroundY = (position: [number, number, number]) =>
    [position[0], groundY, position[2]] as [number, number, number];
  // Floor labels sit on the roof (all floors) or on the selected floor.
  const floorFocus = focusFloor === 0 ? 0 : focusFloor;

  return (
    <>
      {labels.units
        ? FOOTPRINT_IDS.map((id) => (
            <SceneHtml
              key={`fl-unit-${id}`}
              position={labelPosition(id, floorFocus)}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL}>{id}</span>
            </SceneHtml>
          ))
        : null}

      {labels.clubhouse ? (
        <SceneHtml
          position={(() => {
            const [x, , z] = clubhouseMarkPosition(0, 0);
            const y =
              floorFocus === 0
                ? buildingTopY() + 0.35
                : Math.min(floorFocus, 3) * FLOOR_HEIGHT + STILT_STRUCTURE.height + 0.35;
            return [x, y, z] as [number, number, number];
          })()}
          center
          style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
        >
          <span className={HEAVY_LABEL}>{CLUBHOUSE_ID}</span>
        </SceneHtml>
      ) : null}

      {labels.gate ? (
        <SceneHtml
          position={withGroundY(compoundGatePosition())}
          center
          style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
        >
          <span className={HEAVY_LABEL}>Gate</span>
        </SceneHtml>
      ) : null}

      {labels.siteMarks
        ? SITE_AREA_LABELS.filter((area) => SITE_MARK_LABEL_IDS.has(area.id)).map(
            (area) => (
              <SceneHtml
                key={`gf-site-${area.id}`}
                position={area.position}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className={HEAVY_LABEL}>
                  {SITE_AREA_LABEL_TEXT[area.id] ?? area.id}
                </span>
              </SceneHtml>
            ),
          )
        : null}

      {labels.amenities
        ? SITE_AREA_LABELS.filter((area) => AMENITY_LABEL_IDS.has(area.id)).map(
            (area) => {
              const name = AMENITY_NAME_BY_ID[area.id];
              if (!name) return null;
              return (
                <SceneHtml
                  key={`gf-amenity-${area.id}`}
                  position={area.position}
                  center
                  style={{
                    pointerEvents: "none",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className={HEAVY_LABEL}>{name}</span>
                </SceneHtml>
              );
            },
          )
        : null}

      {labels.compound ? (
        <>
          {COMPOUND_FACE_MARKS.filter((mark) => mark.abbr !== "e").map((mark) => (
            <SceneHtml
              key={`gf-${COMPOUND_ID}-${mark.abbr}`}
              position={withGroundY(compoundMarkPosition(mark.dx, mark.dz))}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL}>
                {COMPOUND_ID}
                {mark.abbr}
              </span>
            </SceneHtml>
          ))}
          {compoundExtraMarks().map((mark) => (
            <SceneHtml
              key={`gf-${COMPOUND_ID}-${mark.abbr}`}
              position={withGroundY(mark.position)}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL_SM}>
                {COMPOUND_ID}
                {mark.abbr}
              </span>
            </SceneHtml>
          ))}
          {INNER_SHORT_WALL.labels.map((mark) => (
            <SceneHtml
              key={`gf-${INNER_SHORT_WALL.id}-${mark.abbr || "mid"}`}
              position={mark.position}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL}>
                {INNER_SHORT_WALL.id}
                {mark.abbr}
              </span>
            </SceneHtml>
          ))}
        </>
      ) : null}

      {labels.faces ? (
        <>
          {FOOTPRINT_IDS.flatMap((id) =>
            FACE_MARKS.map((mark) => (
              <SceneHtml
                key={`fl-face-${id}-${mark.abbr}`}
                position={debugMarkPosition(id, mark.dx, mark.dz, floorFocus)}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className={HEAVY_LABEL_SM}>
                  {id}
                  {mark.abbr}
                </span>
              </SceneHtml>
            )),
          )}
          {FACE_MARKS.map((mark) => (
            <SceneHtml
              key={`fl-face-${CLUBHOUSE_ID}-${mark.abbr}`}
              position={(() => {
                const [x, , z] = clubhouseMarkPosition(mark.dx, mark.dz);
                const y =
                  floorFocus === 0
                    ? buildingTopY() + 0.35
                    : Math.min(floorFocus, 3) * FLOOR_HEIGHT +
                      STILT_STRUCTURE.height +
                      0.35;
                return [x, y, z] as [number, number, number];
              })()}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL_SM}>
                {CLUBHOUSE_ID}
                {mark.abbr}
              </span>
            </SceneHtml>
          ))}
        </>
      ) : null}
    </>
  );
}

function Corridors({ focusFloor }: { focusFloor: number }) {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const height = 0.2;
  const wallH = 0.48;

  return (
    <>
      {Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1).flatMap((floor) => {
        const dimmed = focusFloor !== 0 && floor !== focusFloor;
        const y = floorBaseY(floor) + height / 2;
        const wallY = floorBaseY(floor) + height + wallH / 2;
        const decks = CORRIDORS.map((corridor, corridorIndex) => (
          <mesh
            key={`corridor-${floor}-${corridorIndex}`}
            position={[corridor.x, y, corridor.z]}
            scale={[corridor.size[0], height, corridor.size[1]]}
            geometry={geometry}
            renderOrder={dimmed ? 0 : 1}
            onClick={(event) => event.stopPropagation()}
          >
            <meshStandardMaterial
              color={dimmed ? "#8b908e" : "#c8cccf"}
              transparent={dimmed}
              opacity={dimmed ? 0.22 : 1}
              depthWrite={!dimmed}
              roughness={0.82}
              metalness={0.03}
            />
          </mesh>
        ));
        const walls = CORRIDOR_WALLS.map((wall, wallIndex) => (
          <mesh
            key={`corridor-wall-${floor}-${wallIndex}`}
            position={[wall.x, wallY, wall.z]}
            scale={[wall.size[0], wallH, wall.size[1]]}
            geometry={geometry}
            renderOrder={dimmed ? 0 : 1}
            onClick={(event) => event.stopPropagation()}
          >
            <meshStandardMaterial
              color={dimmed ? "#6f7472" : "#8d9391"}
              transparent={dimmed}
              opacity={dimmed ? 0.22 : 1}
              depthWrite={!dimmed}
              roughness={0.88}
              metalness={0.02}
            />
          </mesh>
        ));
        return [...decks, ...walls];
      })}
    </>
  );
}

function LiftShaft({
  focusFloor,
  walkMode,
  x0,
  x1,
  z0,
  z1,
  wallFace,
  opening,
  doorAxis,
  doorDir = -1,
}: {
  focusFloor: number
  walkMode?: boolean
  x0: number
  x1: number
  z0: number
  z1: number
  wallFace: number
  opening: number
  doorAxis: "x" | "z"
  doorDir?: -1 | 1
}) {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const top = buildingTopY();
  const doorH = 0.72;
  const frameT = 0.012;
  const doorT = 0.03;
  const wallT = 0.05;
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
  const along = (offset: number) => wallFace + doorDir * offset;

  return (
    <group>
      {walkMode ? (
        <>
          {/*
            Outer shell only — sit OUTSIDE the shaft AABB so it never
            z-fights the walk-mode cabin walls (same plane = flashing).
          */}
          {(doorAxis === "z" || Math.abs(x0 - wallFace) > Math.abs(x1 - wallFace)) && (
            <mesh position={[x0 - wallT / 2, top / 2, cz]} onClick={stop}>
              <boxGeometry args={[wallT, top, z1 - z0 + wallT * 2]} />
              <meshStandardMaterial color="#6a7270" roughness={0.85} metalness={0.06} />
            </mesh>
          )}
          {(doorAxis === "z" || Math.abs(x1 - wallFace) > Math.abs(x0 - wallFace)) && (
            <mesh position={[x1 + wallT / 2, top / 2, cz]} onClick={stop}>
              <boxGeometry args={[wallT, top, z1 - z0 + wallT * 2]} />
              <meshStandardMaterial color="#6a7270" roughness={0.85} metalness={0.06} />
            </mesh>
          )}
          {(doorAxis === "x" || Math.abs(z0 - wallFace) > Math.abs(z1 - wallFace)) && (
            <mesh position={[cx, top / 2, z0 - wallT / 2]} onClick={stop}>
              <boxGeometry args={[x1 - x0 + wallT * 2, top, wallT]} />
              <meshStandardMaterial color="#6a7270" roughness={0.85} metalness={0.06} />
            </mesh>
          )}
          {(doorAxis === "x" || Math.abs(z1 - wallFace) > Math.abs(z0 - wallFace)) && (
            <mesh position={[cx, top / 2, z1 + wallT / 2]} onClick={stop}>
              <boxGeometry args={[x1 - x0 + wallT * 2, top, wallT]} />
              <meshStandardMaterial color="#6a7270" roughness={0.85} metalness={0.06} />
            </mesh>
          )}
        </>
      ) : (
        <mesh position={[cx, top / 2, cz]} onClick={stop}>
          <boxGeometry args={[x1 - x0, top, z1 - z0]} />
          <meshStandardMaterial color="#5c6563" roughness={0.84} metalness={0.04} />
        </mesh>
      )}
      {/* Static floor doors — hidden in walk mode (interactive cabin owns doors). */}
      {!walkMode &&
        Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1).map((floor) => {
          const dimmed = focusFloor !== 0 && floor !== focusFloor;
          const doorY = floorBaseY(floor) + 0.2 + doorH / 2;
          const framePos =
            doorAxis === "x"
              ? ([along(frameT / 2), doorY, cz] as const)
              : ([cx, doorY, along(frameT / 2)] as const);
          const leafPos =
            doorAxis === "x"
              ? ([along(frameT + doorT / 2), doorY, cz] as const)
              : ([cx, doorY, along(frameT + doorT / 2)] as const);
          const frameSize =
            doorAxis === "x"
              ? ([frameT, doorH + 0.035, opening] as const)
              : ([opening, doorH + 0.035, frameT] as const);
          const leafSize =
            doorAxis === "x"
              ? ([doorT, doorH, opening - 0.04] as const)
              : ([opening - 0.04, doorH, doorT] as const);
          return (
            <group key={`lift-door-${floor}`}>
              <mesh position={[...framePos]} onClick={stop}>
                <boxGeometry args={[...frameSize]} />
                <meshStandardMaterial
                  color="#c9a45c"
                  transparent={dimmed}
                  opacity={dimmed ? 0.35 : 1}
                  roughness={0.38}
                  metalness={0.5}
                />
              </mesh>
              <mesh position={[...leafPos]} onClick={stop}>
                <boxGeometry args={[...leafSize]} />
                <meshStandardMaterial
                  color={dimmed ? "#3a403e" : "#1e2623"}
                  transparent={dimmed}
                  opacity={dimmed ? 0.35 : 1}
                  roughness={0.42}
                  metalness={0.4}
                />
              </mesh>
            </group>
          );
        })}
    </group>
  );
}

function LiftAtBE5({
  focusFloor,
  walkMode,
}: {
  focusFloor: number
  walkMode?: boolean
}) {
  const { x0, x1, z0, z1, wallFace, opening } = LIFT_BE5;
  return (
    <LiftShaft
      focusFloor={focusFloor}
      walkMode={walkMode}
      x0={x0}
      x1={x1}
      z0={z0}
      z1={z1}
      wallFace={wallFace}
      opening={opening}
      doorAxis="x"
      doorDir={-1}
    />
  );
}

function LiftAtBN5({
  focusFloor,
  walkMode,
}: {
  focusFloor: number
  walkMode?: boolean
}) {
  const { x0, x1, z0, z1, wallFace, opening, doorDir } = LIFT_BN5;
  return (
    <LiftShaft
      focusFloor={focusFloor}
      walkMode={walkMode}
      x0={x0}
      x1={x1}
      z0={z0}
      z1={z1}
      wallFace={wallFace}
      opening={opening}
      doorAxis="x"
      doorDir={doorDir}
    />
  );
}

function LiftAtAS1({
  focusFloor,
  walkMode,
}: {
  focusFloor: number
  walkMode?: boolean
}) {
  const { x0, x1, z0, z1, wallFace, opening, doorDir } = LIFT_AS1;
  return (
    <LiftShaft
      focusFloor={focusFloor}
      walkMode={walkMode}
      x0={x0}
      x1={x1}
      z0={z0}
      z1={z1}
      wallFace={wallFace}
      opening={opening}
      doorAxis="x"
      doorDir={doorDir}
    />
  );
}

/** A4 lobby lift — between north flat door and stair; door faces the stair. */
function LiftAtA4({
  focusFloor,
  walkMode,
}: {
  focusFloor: number
  walkMode?: boolean
}) {
  const { x0, x1, z0, z1, wallFace, opening, doorDir, doorAxis } = LIFT_A4;
  return (
    <LiftShaft
      focusFloor={focusFloor}
      walkMode={walkMode}
      x0={x0}
      x1={x1}
      z0={z0}
      z1={z1}
      wallFace={wallFace}
      opening={opening}
      doorAxis={doorAxis}
      doorDir={doorDir}
    />
  );
}

/** Restore B3 mass on the corridor face outside the stair notch / door path. */
function B3CorridorFills({ focusFloor }: { focusFloor: number }) {
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
  return (
    <group name="b3-corridor-fills">
      {Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1).flatMap((floor) => {
        const dimmed = focusFloor !== 0 && floor !== focusFloor;
        const y = floorBaseY(floor) + UNIT_SIZE[1] / 2;
        return B3_CORRIDOR_FILLS.map((fill) => (
          <mesh
            key={`${fill.id}-${floor}`}
            name={fill.id}
            position={[
              (fill.x0 + fill.x1) / 2,
              y,
              (fill.z0 + fill.z1) / 2,
            ]}
            onClick={stop}
          >
            <boxGeometry
              args={[fill.x1 - fill.x0, UNIT_SIZE[1], fill.z1 - fill.z0]}
            />
            <meshStandardMaterial
              color={dimmed ? "#8d8882" : "#c5bbb0"}
              transparent={dimmed}
              opacity={dimmed ? 0.28 : 1}
              roughness={0.62}
              metalness={0.06}
            />
          </mesh>
        ));
      })}
    </group>
  );
}

/** Restore A-wing mass on the corridor face (A4 / A8 fills are empty by design). */
function AWingCorridorFills({
  focusFloor,
  fills,
  name,
}: {
  focusFloor: number
  fills: readonly { id: string; x0: number; x1: number; z0: number; z1: number }[]
  name: string
}) {
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
  return (
    <group name={name}>
      {Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1).flatMap((floor) => {
        const dimmed = focusFloor !== 0 && floor !== focusFloor;
        const y = floorBaseY(floor) + UNIT_SIZE[1] / 2;
        return fills.map((fill) => (
          <mesh
            key={`${fill.id}-${floor}`}
            name={fill.id}
            position={[
              (fill.x0 + fill.x1) / 2,
              y,
              (fill.z0 + fill.z1) / 2,
            ]}
            onClick={stop}
          >
            <boxGeometry
              args={[fill.x1 - fill.x0, UNIT_SIZE[1], fill.z1 - fill.z0]}
            />
            <meshStandardMaterial
              color={dimmed ? "#8d8882" : "#c5bbb0"}
              transparent={dimmed}
              opacity={dimmed ? 0.28 : 1}
              roughness={0.62}
              metalness={0.06}
            />
          </mesh>
        ));
      })}
    </group>
  );
}

/** B3 flat door + flat walk to the corridor — north of STAIR_B3, never on treads. */
function B3EntranceDoor({ focusFloor }: { focusFloor: number }) {
  const { wallFace, z0, z1, opening, doorDir, pathX0, pathX1 } = B3_ENTRANCE;
  const cz = (z0 + z1) / 2;
  const doorH = 0.72;
  const frameT = 0.012;
  const doorT = 0.03;
  const deck = 0.2;
  const pathH = 0.04;
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
  const along = (offset: number) => wallFace + doorDir * offset;

  return (
    <group name="b3-entrance">
      {Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1).map((floor) => {
        const dimmed = focusFloor !== 0 && floor !== focusFloor;
        const base = floorBaseY(floor) + deck;
        const doorY = floorBaseY(floor) + 0.2 + doorH / 2;
        return (
          <group key={`b3-entrance-${floor}`}>
            {/* Door → corridor path (north of stair only). */}
            <mesh
              name="b3-entrance-path"
              position={[(pathX0 + pathX1) / 2, base - pathH / 2, cz]}
              onClick={stop}
            >
              <boxGeometry args={[pathX1 - pathX0, pathH, z1 - z0]} />
              <meshStandardMaterial
                color={dimmed ? "#8d8882" : "#c8cccf"}
                transparent={dimmed}
                opacity={dimmed ? 0.28 : 1}
                roughness={0.82}
                metalness={0.02}
              />
            </mesh>
            <mesh position={[along(frameT / 2), doorY, cz]} onClick={stop}>
              <boxGeometry args={[frameT, doorH + 0.035, opening]} />
              <meshStandardMaterial
                color="#c9a45c"
                transparent={dimmed}
                opacity={dimmed ? 0.35 : 1}
                roughness={0.38}
                metalness={0.5}
              />
            </mesh>
            <mesh position={[along(frameT + doorT / 2), doorY, cz]} onClick={stop}>
              <boxGeometry args={[doorT, doorH, opening - 0.04]} />
              <meshStandardMaterial
                color={dimmed ? "#5c3d18" : "#4a3014"}
                transparent={dimmed}
                opacity={dimmed ? 0.35 : 1}
                roughness={0.55}
                metalness={0.08}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** A4 / A8 flat door + walk to cA — north of the stair; empty lobby stays open. */
function AWingEntranceDoor({
  focusFloor,
  entrance,
  name,
}: {
  focusFloor: number
  entrance: typeof A8_ENTRANCE
  name: string
}) {
  const { wallFace, z0, z1, opening, doorDir, pathX0, pathX1 } = entrance;
  const cz = (z0 + z1) / 2;
  const doorH = 0.72;
  const frameT = 0.012;
  const doorT = 0.03;
  const deck = 0.2;
  const pathH = 0.04;
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
  const along = (offset: number) => wallFace + doorDir * offset;

  return (
    <group name={name}>
      {Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1).map((floor) => {
        const dimmed = focusFloor !== 0 && floor !== focusFloor;
        const base = floorBaseY(floor) + deck;
        const doorY = floorBaseY(floor) + 0.2 + doorH / 2;
        return (
          <group key={`${name}-${floor}`}>
            <mesh
              name={`${name}-path`}
              position={[(pathX0 + pathX1) / 2, base - pathH / 2, cz]}
              onClick={stop}
            >
              <boxGeometry args={[pathX1 - pathX0, pathH, z1 - z0]} />
              <meshStandardMaterial
                color={dimmed ? "#8d8882" : "#c8cccf"}
                transparent={dimmed}
                opacity={dimmed ? 0.28 : 1}
                roughness={0.82}
                metalness={0.02}
              />
            </mesh>
            <mesh position={[along(frameT / 2), doorY, cz]} onClick={stop}>
              <boxGeometry args={[frameT, doorH + 0.035, opening]} />
              <meshStandardMaterial
                color="#c9a45c"
                transparent={dimmed}
                opacity={dimmed ? 0.35 : 1}
                roughness={0.38}
                metalness={0.5}
              />
            </mesh>
            <mesh position={[along(frameT + doorT / 2), doorY, cz]} onClick={stop}>
              <boxGeometry args={[doorT, doorH, opening - 0.04]} />
              <meshStandardMaterial
                color={dimmed ? "#5c3d18" : "#4a3014"}
                transparent={dimmed}
                opacity={dimmed ? 0.35 : 1}
                roughness={0.55}
                metalness={0.08}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function placedBox(xa: number, xb: number, ya: number, yb: number, za: number, zb: number) {
  const geometry = new BoxGeometry(xb - xa, yb - ya, zb - za);
  geometry.translate((xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2);
  return geometry;
}

/** Keep stacked stair boxes from sharing a face (z-fight / flashing). */
const STAIR_SEAM = 0.0012;
/** Thin mid-landing slab — avoids overlapping the last riser of flight 1. */
const STAIR_LANDING_T = 0.036;

function stairLevelBaseY(floor: number, deck: number) {
  // floor 0 starts at true ground (no raised curb); floor 1+ uses slab + deck.
  return floor <= 0 ? 0 : floorBaseY(floor) + deck;
}

/** Top of the walkable deck reached after climbing from `fromFloor` (not slab underside). */
function stairArrivalY(fromFloor: number, deck: number) {
  if (fromFloor < FLOOR_COUNT) return stairLevelBaseY(fromFloor + 1, deck);
  return stairLevelBaseY(fromFloor, deck) + FLOOR_HEIGHT;
}

/** Dim other floors; keep ground (0) visible with floor 1 so the stilt run stays clear. */
function stairFloorDimmed(focusFloor: number, floor: number) {
  if (focusFloor === 0) return false;
  if (floor === focusFloor) return false;
  if (focusFloor === 1 && floor === 0) return false;
  return true;
}

/** Stair tread/landing material — no transparent fade in walk mode (causes flash). */
function StairSurfaceMaterial({
  dimmed,
  concrete,
  walkMode,
}: {
  dimmed: boolean
  concrete: boolean
  walkMode?: boolean
}) {
  const fade = dimmed && !walkMode;
  return (
    <meshStandardMaterial
      color={fade ? "#8d8882" : concrete ? "#c8c2b6" : "#c8cccf"}
      transparent={fade}
      opacity={fade ? 0.28 : 1}
      depthWrite={!fade}
      roughness={concrete ? 0.84 : 0.82}
      metalness={0.02}
      polygonOffset
      polygonOffsetFactor={1}
      polygonOffsetUnits={1}
    />
  );
}

function UStairAtLift({
  focusFloor,
  walkMode,
}: {
  focusFloor: number
  walkMode?: boolean
}) {
  const { x0, z1, flight: flightW, wallInner, zRun1, entryZ0, entryZ1 } = STAIR_U;
  const wallFace = LIFT_BE5.wallFace;
  const wallT = 0.07;
  const deck = 0.2;
  const refHalf = FLOOR_HEIGHT / 2;
  const count = Math.round(refHalf / (refHalf / 4 / 2));
  const going = (zRun1 - entryZ1) / count;
  const outerX0 = wallInner - flightW;
  const innerX1 = x0 + flightW;
  const wallBase = 0;
  const wallTop = buildingTopY();
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  const built = useMemo(() => {
    const flights: { name: string; floor: number; geometry: BufferGeometry }[] = [];
    for (let floor = 0; floor <= FLOOR_COUNT; floor += 1) {
      const base = stairLevelBaseY(floor, deck);
      const arrival = stairArrivalY(floor, deck);
      const half = (arrival - base) / 2;
      const rise = half / count;
      const flight1: BufferGeometry[] = [];
      const flight2: BufferGeometry[] = [];
      for (let step = 0; step < count; step += 1) {
        const y0 = base + rise * step + (step === 0 ? 0 : STAIR_SEAM);
        const y1 = base + rise * (step + 1) - STAIR_SEAM * 0.5;
        const z0 = entryZ1 + going * step + (step === 0 ? 0 : STAIR_SEAM);
        const z1Step = entryZ1 + going * (step + 1) - STAIR_SEAM;
        flight1.push(placedBox(outerX0, wallInner, y0, y1, z0, z1Step));
        const y2_0 = base + half + rise * step + (step === 0 ? STAIR_SEAM : STAIR_SEAM);
        const y2_1 =
          base + half + rise * (step + 1) - (step === count - 1 ? STAIR_SEAM : STAIR_SEAM * 0.5);
        const zFar = zRun1 - going * step - (step === 0 ? 0 : STAIR_SEAM);
        const zNear = zRun1 - going * (step + 1) + STAIR_SEAM;
        flight2.push(placedBox(x0, innerX1, y2_0, y2_1, zNear, zFar));
      }
      flights.push(
        {
          name: "staircase-flight-1",
          floor,
          geometry: mergeGeometries(flight1, false)!,
        },
        {
          name: "staircase-flight-2",
          floor,
          geometry: mergeGeometries(flight2, false)!,
        },
        {
          name: "staircase-landing",
          floor,
          geometry: placedBox(
            x0,
            wallInner,
            base + half - STAIR_LANDING_T,
            base + half,
            zRun1 + STAIR_SEAM,
            z1,
          ),
        },
      );
      // No raised curb at ground — treads start at y=0. Upper floors keep entry landing.
      if (floor > 0) {
        flights.push({
          name: "staircase-corridor-entry",
          floor,
          geometry: placedBox(
            x0,
            wallFace,
            base - deck,
            base - STAIR_SEAM,
            entryZ0,
            entryZ1,
          ),
        });
      }
      if (floor === FLOOR_COUNT) {
        flights.push({
          name: "staircase-corridor-entry",
          floor,
          geometry: placedBox(
            x0,
            wallFace,
            arrival - deck,
            arrival - STAIR_SEAM,
            entryZ0,
            entryZ1,
          ),
        });
      }
      for (const piece of flight1) piece.dispose();
      for (const piece of flight2) piece.dispose();
    }
    return flights;
  }, [count, deck, entryZ0, entryZ1, flightW, going, innerX1, outerX0, wallFace, wallInner, x0, z1, zRun1]);

  useEffect(() => {
    return () => {
      for (const part of built) part.geometry.dispose();
    };
  }, [built]);

  const wall = (name: string, xa: number, xb: number, za: number, zb: number) => (
    <mesh
      name={name}
      position={[(xa + xb) / 2, (wallBase + wallTop) / 2, (za + zb) / 2]}
      onClick={stop}
    >
      <boxGeometry args={[xb - xa, wallTop - wallBase, zb - za]} />
      <meshStandardMaterial color="#8d9391" roughness={0.88} metalness={0.02} />
    </mesh>
  );

  return (
    <group name="staircase-core">
      {wall("staircase-wall-outer", x0 - wallT, x0, LIFT_BE5.z1, z1 + wallT)}
      {wall("staircase-wall-core", x0, wallInner, LIFT_BE5.z1, entryZ0)}
      {wall("staircase-wall-inner", x0, wallInner, z1, z1 + wallT)}
      {built.map((part, index) => {
        const dimmed = stairFloorDimmed(focusFloor, part.floor);
        const concrete = part.name !== "staircase-corridor-entry";
        return (
          <mesh key={`${part.name}-${part.floor}-${index}`} name={part.name} geometry={part.geometry} onClick={stop}>
            <StairSurfaceMaterial
              dimmed={dimmed}
              concrete={concrete}
              walkMode={walkMode}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Brochure U-stair in front of B3 only — two parallel flights, mid landing,
 * corridor entry landing, no lift. Corridor-side wall spans living↔bedroom mids.
 */
function StairAtB3({
  focusFloor,
  walkMode,
}: {
  focusFloor: number
  walkMode?: boolean
}) {
  const {
    x0,
    x1,
    z0,
    z1,
    wallT,
    wallInner,
    flight: flightW,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    zEntry0,
    zEntry1,
    zRun1,
    zLand0,
    zLand1,
    doorX0,
    doorX1,
    perFlight,
    going,
  } = STAIR_B3;
  const deck = 0.2;
  const count = perFlight;
  const wallBase = 0;
  const wallTop = buildingTopY();
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  const built = useMemo(() => {
    const flights: { name: string; floor: number; geometry: BufferGeometry }[] = [];
    for (let floor = 0; floor <= FLOOR_COUNT; floor += 1) {
      const base = stairLevelBaseY(floor, deck);
      const arrival = stairArrivalY(floor, deck);
      const half = (arrival - base) / 2;
      const stepRise = half / count;
      const flight1: BufferGeometry[] = [];
      const flight2: BufferGeometry[] = [];
      for (let step = 0; step < count; step += 1) {
        const y0 = base + stepRise * step + (step === 0 ? 0 : STAIR_SEAM);
        const y1 = base + stepRise * (step + 1) - STAIR_SEAM * 0.5;
        // Flight 1 (corridor-side strip): south entry → north mid landing.
        const z1Lo = zEntry1 + going * step + (step === 0 ? 0 : STAIR_SEAM);
        const z1Hi = zEntry1 + going * (step + 1) - STAIR_SEAM;
        flight1.push(placedBox(flight1X0, flight1X1, y0, y1, z1Lo, z1Hi));
        // Flight 2 (apartment-side strip): north mid → south, return to upper level.
        const y2_0 = base + half + stepRise * step + STAIR_SEAM;
        const y2_1 =
          base +
          half +
          stepRise * (step + 1) -
          (step === count - 1 ? STAIR_SEAM : STAIR_SEAM * 0.5);
        const z2Hi = zRun1 - going * step - (step === 0 ? 0 : STAIR_SEAM);
        const z2Lo = zRun1 - going * (step + 1) + STAIR_SEAM;
        flight2.push(placedBox(flight2X0, flight2X1, y2_0, y2_1, z2Lo, z2Hi));
      }
      flights.push(
        {
          name: "staircase-b3-flight-1",
          floor,
          geometry: mergeGeometries(flight1, false)!,
        },
        {
          name: "staircase-b3-flight-2",
          floor,
          geometry: mergeGeometries(flight2, false)!,
        },
        {
          name: "staircase-b3-landing-mid",
          floor,
          geometry: placedBox(
            x0,
            wallInner,
            base + half - STAIR_LANDING_T,
            base + half,
            zLand0 + STAIR_SEAM,
            zLand1,
          ),
        },
      );
      if (floor > 0) {
        flights.push(
          {
            name: "staircase-b3-entry",
            floor,
            geometry: placedBox(x0, x1, base - deck, base - STAIR_SEAM, zEntry0, zEntry1),
          },
          {
            // Flat approach through the south door toward B5 / BN6.
            name: "staircase-b3-approach",
            floor,
            geometry: placedBox(
              doorX0,
              doorX1,
              base - deck,
              base - STAIR_SEAM,
              z0 - 0.22,
              z0 + wallT,
            ),
          },
        );
      }
      if (floor === FLOOR_COUNT) {
        flights.push(
          {
            name: "staircase-b3-entry",
            floor,
            geometry: placedBox(
              x0,
              x1,
              arrival - deck,
              arrival - STAIR_SEAM,
              zEntry0,
              zEntry1,
            ),
          },
          {
            name: "staircase-b3-approach",
            floor,
            geometry: placedBox(
              doorX0,
              doorX1,
              arrival - deck,
              arrival - STAIR_SEAM,
              z0 - 0.22,
              z0 + wallT,
            ),
          },
        );
      }
      for (const piece of flight1) piece.dispose();
      for (const piece of flight2) piece.dispose();
    }
    return flights;
  }, [
    count,
    deck,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    going,
    wallInner,
    x0,
    x1,
    doorX0,
    doorX1,
    wallT,
    z0,
    zEntry0,
    zEntry1,
    zLand0,
    zLand1,
    zRun1,
  ]);

  useEffect(() => {
    return () => {
      for (const part of built) part.geometry.dispose();
    };
  }, [built]);

  const wall = (name: string, xa: number, xb: number, za: number, zb: number) => {
    if (xb - xa < 0.01 || zb - za < 0.01) return null;
    return (
      <mesh
        key={name}
        name={name}
        position={[(xa + xb) / 2, (wallBase + wallTop) / 2, (za + zb) / 2]}
        onClick={stop}
      >
        <boxGeometry args={[xb - xa, wallTop - wallBase, zb - za]} />
        <meshStandardMaterial color="#8d9391" roughness={0.88} metalness={0.02} />
      </mesh>
    );
  };

  return (
    <group name="staircase-b3">
      {/* West face closed to the aisle. */}
      {wall("staircase-b3-wall-west", x1 - wallT, x1, z0, z1)}
      {wall("staircase-b3-wall-apt", x0, x0 + wallT, z0, z1)}
      {wall("staircase-b3-wall-north", x0, x1, z1 - wallT, z1)}
      {/* South opens toward B5 — wall returns only, door gap in the middle. */}
      {wall("staircase-b3-wall-south-e", x0, doorX0, z0, z0 + wallT)}
      {wall("staircase-b3-wall-south-w", doorX1, x1, z0, z0 + wallT)}
      {built.map((part, index) => {
        const dimmed = stairFloorDimmed(focusFloor, part.floor);
        const landing = !part.name.includes("flight");
        return (
          <mesh key={`${part.name}-${part.floor}-${index}`} name={part.name} geometry={part.geometry} onClick={stop}>
            <StairSurfaceMaterial
              dimmed={dimmed}
              concrete={!landing}
              walkMode={walkMode}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Brochure U-stair in an A-wing corridor lobby — two parallel flights, mid
 * landing at the south, entry at the north (aisle open; north face closed).
 */
function StairAtAWing({
  focusFloor,
  walkMode,
  stair,
  id,
  northWall = true,
}: {
  focusFloor: number
  walkMode?: boolean
  stair: typeof STAIR_A8
  id: string
  /** A4 omits this so LIFT_A4's south door faces the stair open. */
  northWall?: boolean
}) {
  const {
    x0,
    x1,
    z0,
    z1,
    wallT,
    wallInner,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    zEntry0,
    zEntry1,
    zRun1,
    zLand0,
    zLand1,
    perFlight,
    going,
  } = stair;
  const deck = 0.2;
  const count = perFlight;
  const wallBase = 0;
  const wallTop = buildingTopY();
  const prefix = `staircase-${id}`;
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  const built = useMemo(() => {
    const flights: { name: string; floor: number; geometry: BufferGeometry }[] = [];
    for (let floor = 0; floor <= FLOOR_COUNT; floor += 1) {
      const base = stairLevelBaseY(floor, deck);
      const arrival = stairArrivalY(floor, deck);
      const half = (arrival - base) / 2;
      const stepRise = half / count;
      const flight1: BufferGeometry[] = [];
      const flight2: BufferGeometry[] = [];
      for (let step = 0; step < count; step += 1) {
        const y0 = base + stepRise * step + (step === 0 ? 0 : STAIR_SEAM);
        const y1 = base + stepRise * (step + 1) - STAIR_SEAM * 0.5;
        const z1Hi = zEntry0 - going * step - (step === 0 ? 0 : STAIR_SEAM);
        const z1Lo = zEntry0 - going * (step + 1) + STAIR_SEAM;
        flight1.push(placedBox(flight1X0, flight1X1, y0, y1, z1Lo, z1Hi));
        const y2_0 = base + half + stepRise * step + STAIR_SEAM;
        const y2_1 =
          base +
          half +
          stepRise * (step + 1) -
          (step === count - 1 ? STAIR_SEAM : STAIR_SEAM * 0.5);
        const z2Lo = zRun1 + going * step + (step === 0 ? 0 : STAIR_SEAM);
        const z2Hi = zRun1 + going * (step + 1) - STAIR_SEAM;
        flight2.push(placedBox(flight2X0, flight2X1, y2_0, y2_1, z2Lo, z2Hi));
      }
      flights.push(
        {
          name: `${prefix}-flight-1`,
          floor,
          geometry: mergeGeometries(flight1, false)!,
        },
        {
          name: `${prefix}-flight-2`,
          floor,
          geometry: mergeGeometries(flight2, false)!,
        },
        {
          name: `${prefix}-landing-mid`,
          floor,
          geometry: placedBox(
            x0,
            wallInner,
            base + half - STAIR_LANDING_T,
            base + half,
            zLand0,
            zLand1 - STAIR_SEAM,
          ),
        },
      );
      if (floor > 0) {
        flights.push({
          name: `${prefix}-entry`,
          floor,
          geometry: placedBox(x0, x1, base - deck, base - STAIR_SEAM, zEntry0, zEntry1),
        });
      }
      if (floor === FLOOR_COUNT) {
        flights.push({
          name: `${prefix}-entry`,
          floor,
          geometry: placedBox(
            x0,
            x1,
            arrival - deck,
            arrival - STAIR_SEAM,
            zEntry0,
            zEntry1,
          ),
        });
      }
      for (const piece of flight1) piece.dispose();
      for (const piece of flight2) piece.dispose();
    }
    return flights;
  }, [
    count,
    deck,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    going,
    prefix,
    wallInner,
    x0,
    x1,
    zEntry0,
    zEntry1,
    zLand0,
    zLand1,
    zRun1,
  ]);

  useEffect(() => {
    return () => {
      for (const part of built) part.geometry.dispose();
    };
  }, [built]);

  const wall = (name: string, xa: number, xb: number, za: number, zb: number) => {
    if (xb - xa < 0.01 || zb - za < 0.01) return null;
    return (
      <mesh
        key={name}
        name={name}
        position={[(xa + xb) / 2, (wallBase + wallTop) / 2, (za + zb) / 2]}
        onClick={stop}
      >
        <boxGeometry args={[xb - xa, wallTop - wallBase, zb - za]} />
        <meshStandardMaterial color="#8d9391" roughness={0.88} metalness={0.02} />
      </mesh>
    );
  };

  return (
    <group name={prefix}>
      {wall(`${prefix}-wall-aisle`, x1 - wallT, x1, z0, zEntry0)}
      {wall(`${prefix}-wall-apt`, x0, x0 + wallT, z0, z1)}
      {wall(`${prefix}-wall-south`, x0, x1, z0, z0 + wallT)}
      {northWall ? wall(`${prefix}-wall-north`, x0, x1, z1 - wallT, z1) : null}
      {built.map((part, index) => {
        const dimmed = stairFloorDimmed(focusFloor, part.floor);
        const landing = !part.name.includes("flight");
        return (
          <mesh key={`${part.name}-${part.floor}-${index}`} name={part.name} geometry={part.geometry} onClick={stop}>
            <StairSurfaceMaterial
              dimmed={dimmed}
              concrete={!landing}
              walkMode={walkMode}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function StairAtBN7({
  focusFloor,
  walkMode,
}: {
  focusFloor: number
  walkMode?: boolean
}) {
  const {
    x0,
    deckNorth,
    flightX0,
    flightX1,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    zWalk,
    zTread0,
    zTread1,
    zStop,
    rise,
    treads,
    going,
    wallT,
  } = STAIR_BN7;
  const deck = 0.2;
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  const built = useMemo(() => {
    const parts: { name: string; floor: number; geometry: BufferGeometry }[] = [];
    const pushLevel = (floor: number, yTop: number, lowerName: string) => {
      parts.push(
        {
          name: "staircase-bn7-approach",
          floor,
          geometry: placedBox(
            flightX0,
            flightX1,
            yTop - deck,
            yTop - STAIR_SEAM,
            deckNorth,
            zWalk,
          ),
        },
        {
          name: lowerName,
          floor,
          geometry: placedBox(
            flightX0,
            flightX1,
            yTop - deck,
            yTop - STAIR_SEAM,
            zWalk + STAIR_SEAM,
            zTread0,
          ),
        },
      );
    };
    for (let floor = 1; floor <= FLOOR_COUNT; floor += 1) {
      const base = floorBaseY(floor) + deck;
      const midY = base - rise * (treads + 1);
      const yBottom = midY - rise * (treads + 1);
      const flight1: BufferGeometry[] = [];
      const flight2: BufferGeometry[] = [];
      for (let step = 0; step < treads; step += 1) {
        const yTop = base - rise * (step + 1);
        const yBot = yTop - rise + STAIR_SEAM;
        const z0 = zTread0 + going * step + (step === 0 ? 0 : STAIR_SEAM);
        const z1 = zTread0 + going * (step + 1) - STAIR_SEAM;
        flight1.push(placedBox(flight1X0, flight1X1, yBot, yTop - STAIR_SEAM * 0.5, z0, z1));
        const y2Top = midY - rise * (step + 1);
        const y2Bot = y2Top - rise + STAIR_SEAM;
        const zFar = zTread1 - going * step - (step === 0 ? 0 : STAIR_SEAM);
        const zNear = zTread1 - going * (step + 1) + STAIR_SEAM;
        flight2.push(
          placedBox(flight2X0, flight2X1, y2Bot, y2Top - STAIR_SEAM * 0.5, zNear, zFar),
        );
      }
      pushLevel(floor, base, "staircase-bn7-landing-top");
      parts.push(
        {
          name: "staircase-bn7-flight-1",
          floor,
          geometry: mergeGeometries(flight1, false)!,
        },
        {
          name: "staircase-bn7-landing-mid",
          floor,
          geometry: placedBox(
            flightX0,
            flightX1,
            midY - STAIR_LANDING_T,
            midY,
            zTread1 + STAIR_SEAM,
            zStop,
          ),
        },
        {
          name: "staircase-bn7-flight-2",
          floor,
          geometry: mergeGeometries(flight2, false)!,
        },
      );
      if (floor === 1) pushLevel(floor, yBottom, "staircase-bn7-landing-lower");
      for (const piece of flight1) piece.dispose();
      for (const piece of flight2) piece.dispose();
    }
    return parts;
  }, [
    deck,
    deckNorth,
    flight1X0,
    flight1X1,
    flight2X0,
    flight2X1,
    flightX0,
    flightX1,
    going,
    rise,
    treads,
    zStop,
    zTread0,
    zTread1,
    zWalk,
  ]);

  useEffect(() => {
    return () => {
      for (const part of built) part.geometry.dispose();
    };
  }, [built]);

  const wall = (name: string, xa: number, xb: number, za: number, zb: number, floor: number) => {
    const base = floorBaseY(floor) + deck;
    const y0 = base - FLOOR_HEIGHT;
    const y1 = base;
    const dimmed = stairFloorDimmed(focusFloor, floor);
    return (
      <mesh
        key={`${name}-${floor}`}
        name={name}
        position={[(xa + xb) / 2, (y0 + y1) / 2, (za + zb) / 2]}
        onClick={stop}
      >
        <boxGeometry args={[xb - xa, y1 - y0, zb - za]} />
        <meshStandardMaterial
          color={dimmed && !walkMode ? "#8d8882" : "#8d9391"}
          transparent={dimmed && !walkMode}
          opacity={dimmed && !walkMode ? 0.28 : 1}
          depthWrite={!(dimmed && !walkMode)}
          roughness={0.88}
          metalness={0.02}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    );
  };

  return (
    <group name="staircase-bn7">
      {Array.from({ length: FLOOR_COUNT }, (_, index) => index + 1).flatMap((floor) => [
        wall("staircase-bn7-wall-left", x0, flightX0, deckNorth + wallT, zStop, floor),
        wall("staircase-bn7-wall-right", flightX1, flightX1 + wallT, deckNorth + wallT, zStop, floor),
        wall("staircase-bn7-wall-end", x0, flightX1 + wallT, zStop, zStop + wallT, floor),
      ])}
      {built.map((part, index) => {
        const dimmed = stairFloorDimmed(focusFloor, part.floor);
        const landing = !part.name.includes("flight");
        return (
          <mesh key={`${part.name}-${part.floor}-${index}`} name={part.name} geometry={part.geometry} onClick={stop}>
            <StairSurfaceMaterial
              dimmed={dimmed}
              concrete={!landing}
              walkMode={walkMode}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function FocusMyFlat({
  flat,
  controlsRef,
}: {
  flat: ModelFlat | null
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree();
  const appliedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!flat) return;
    const key = flat.flatNumber;
    if (appliedKey.current === key) return;
    appliedKey.current = key;

    const [x, y, z] = unitPosition(flat.wing, flat.unit, flat.floor);
    const ox = CAMERA_START[0] - BUILDING_CENTER[0];
    const oy = CAMERA_START[1] - BUILDING_CENTER[1];
    const oz = CAMERA_START[2] - BUILDING_CENTER[2];
    const pull = 0.58;
    camera.position.set(
      x + ox * pull,
      Math.max(y + 12, BUILDING_CENTER[1] + oy * pull * 0.55),
      z + oz * pull,
    );
    camera.lookAt(x, y, z);
    camera.updateProjectionMatrix();

    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(x, y * 0.4, z);
      controls.update();
    }
  }, [flat, camera, controlsRef]);

  return null;
}

function ProjectSelectedAnchor({
  flat,
  onScreen,
}: {
  flat: ModelFlat | null
  onScreen: (point: { clientX: number; clientY: number; visible: boolean } | null) => void
}) {
  const { camera, gl } = useThree();
  const scratch = useMemo(() => new Vector3(), []);
  const last = useRef("");

  useFrame(() => {
    if (!flat) {
      if (last.current !== "") {
        last.current = "";
        onScreen(null);
      }
      return;
    }
    const [x, y, z] = unitPosition(flat.wing, flat.unit, flat.floor);
    scratch.set(x, y, z).project(camera);

    const rect = gl.domElement.getBoundingClientRect();
    const clientX = rect.left + (scratch.x * 0.5 + 0.5) * rect.width;
    const clientY = rect.top + (-scratch.y * 0.5 + 0.5) * rect.height;
    const visible =
      scratch.z < 1 &&
      clientX >= rect.left - 80 &&
      clientY >= rect.top - 80 &&
      clientX <= rect.right + 80 &&
      clientY <= rect.bottom + 80;

    const key = `${Math.round(clientX)}:${Math.round(clientY)}:${visible ? 1 : 0}:${flat.flatNumber}`;
    if (key === last.current) return;
    last.current = key;
    onScreen({ clientX, clientY, visible });
  });

  return null;
}

function FlatDetailCard({
  flat,
  myFlatNumber,
  onClose,
  cardRef,
}: {
  flat: ModelFlat
  myFlatNumber?: string | null
  onClose: () => void
  cardRef: RefObject<HTMLDivElement | null>
}) {
  const mine = flat.flatNumber === myFlatNumber;
  const sold = flat.saleStatus === "sold" || Boolean(flat.ownerName);
  const ownerTitle = sold
    ? flat.ownerName?.trim() || "Owner not named"
    : "Unsold";
  const unitBits = [
    flat.wing ? `Wing ${flat.wing}` : null,
    `Floor ${flat.floor}`,
    typeLabel(flat.type),
    flat.facing ? facingLabel(flat.facing) : null,
    flat.areaSqft ? `${flat.areaSqft.toLocaleString()} sft` : null,
  ].filter(Boolean);

  return (
    <aside
      ref={cardRef}
      className="pointer-events-auto absolute top-3 right-3 z-50 max-h-[min(38rem,calc(100%-1rem))] w-[min(28rem,calc(100%-1.25rem))] overflow-y-auto rounded-2xl border border-[rgba(232,213,163,0.22)] bg-[#0d1a14]/95 text-[#f7f2e6] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="relative border-b border-[rgba(232,213,163,0.14)] px-3.5 pt-3.5 pb-3">
        <button
          type="button"
          aria-label="Close flat details"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full text-lg text-[#d8c898] hover:bg-white/10"
        >
          ×
        </button>

        <div className="flex flex-wrap items-center gap-1.5 pr-10">
          <span className="rounded-full bg-[#c9a45c]/18 px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.12em] text-[#c9a45c] uppercase">
            {flat.flatNumber}
          </span>
          {mine ? (
            <span className="rounded-full bg-[#c9a45c] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-[#14241c] uppercase">
              Your flat
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase ${
              sold
                ? flat.occupancyLabel === "Rented"
                  ? "bg-[#6d3a22] text-[#f0c9a8]"
                  : "bg-[#2f5a48] text-[#b8e0c8]"
                : "bg-[#1b2e26] text-[#e8d5a3]"
            }`}
          >
            {flat.occupancyLabel || (sold ? "Sold" : "Unsold")}
          </span>
        </div>

        <p className="mt-2.5 text-[0.65rem] font-semibold tracking-[0.16em] text-[#b0a070] uppercase">
          {sold ? "Owner" : "Availability"}
        </p>
        <h2 className="mt-0.5 text-[1.35rem] leading-tight font-semibold tracking-tight">
          {ownerTitle}
        </h2>

        {sold && flat.ownerEmail ? (
          <a
            href={`mailto:${flat.ownerEmail}`}
            className="mt-1 block break-all text-sm text-[#e8d5a3] underline-offset-2 hover:underline"
          >
            {flat.ownerEmail}
          </a>
        ) : null}

        {sold && flat.phoneMasked ? (
          <p className="mt-1 text-sm tabular-nums text-[#d8c898]">
            {flat.phoneMasked}
          </p>
        ) : null}

        {sold && flat.memberNames && flat.memberNames.length > 0 ? (
          <p className="mt-1.5 text-xs leading-snug text-[#c0ae80]">
            with {flat.memberNames.join(", ")}
          </p>
        ) : null}

        {(flat.openForRent || flat.openForResale) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {flat.openForRent ? (
              <span className="rounded-full bg-[rgba(154,91,60,0.35)] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-[#f0c9a8] uppercase">
                Open for rent
              </span>
            ) : null}
            {flat.openForResale ? (
              <span className="rounded-full bg-[rgba(201,164,92,0.28)] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-[#e8d5a3] uppercase">
                Open for resale
              </span>
            ) : null}
          </div>
        )}

        {!sold ? (
          <p className="mt-1.5 text-xs text-[#c0ae80]">
            No owner linked on the community board yet.
          </p>
        ) : null}
      </header>

      <div className="space-y-3 px-3.5 py-3">
        {sold && flat.occupancyLabel === "Rented" && flat.tenantName ? (
          <section className="rounded-xl bg-white/6 px-3 py-2.5 ring-1 ring-[rgba(232,213,163,0.12)]">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#f0c9a8] uppercase">
              Tenant
            </p>
            <p className="mt-1 text-sm font-semibold">{flat.tenantName}</p>
            {flat.tenantPhoneMasked ? (
              <p className="mt-0.5 text-xs tabular-nums text-[#cbb98a]">
                {flat.tenantPhoneMasked}
              </p>
            ) : null}
          </section>
        ) : null}

        {flat.statusLabel ? (
          <section className="flex items-center justify-between gap-3">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#b0a070] uppercase">
              Journey
            </p>
            <p className="rounded-full bg-[#c9a45c]/18 px-2.5 py-1 text-xs font-semibold text-[#c9a45c]">
              {flat.statusLabel}
            </p>
          </section>
        ) : null}

        <section>
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#b0a070] uppercase">
            Unit
          </p>
          <p className="mt-1.5 mb-3 text-sm leading-snug font-medium text-[#f7f2e6]">
            {unitBits.join(" · ")}
          </p>
          <FlatViews
            flat={toPlanInput(flat)}
            tone="dark"
            text={
              <div className="space-y-3">
                <FlatTextFacts flat={toPlanInput(flat)} tone="dark" />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[#9a8a60]">Sale</dt>
                    <dd className="mt-0.5 font-semibold">
                      {sold ? "Sold" : "Unsold"}
                    </dd>
                  </div>
                  {flat.occupancyLabel ? (
                    <div>
                      <dt className="text-[#9a8a60]">Occupancy</dt>
                      <dd className="mt-0.5 font-semibold">
                        {flat.occupancyLabel}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            }
          />
        </section>
      </div>

      {mine ? (
        <div className="border-t border-[rgba(232,213,163,0.14)] px-3.5 py-3">
          <a
            href="/"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#c9a45c] px-4 text-sm font-semibold text-[#14241c]"
          >
            Open my flat
          </a>
        </div>
      ) : null}
    </aside>
  );
}

function SelectionLeaderLine({
  anchor,
  cardRef,
  containerRef,
}: {
  anchor: { clientX: number; clientY: number; visible: boolean } | null
  cardRef: RefObject<HTMLDivElement | null>
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const [line, setLine] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
  } | null>(null);

  useEffect(() => {
    let frame = 0;

    function update() {
      const container = containerRef.current;
      const card = cardRef.current;
      if (!container || !card || !anchor?.visible) {
        setLine((prev) => (prev ? null : prev));
        return;
      }
      const c = container.getBoundingClientRect();
      const r = card.getBoundingClientRect();
      const x1 = anchor.clientX - c.left;
      const y1 = anchor.clientY - c.top;
      const x2 = r.left - c.left + 2;
      const y2 = r.top - c.top + Math.min(56, r.height * 0.22);
      setLine((prev) => {
        if (
          prev &&
          Math.abs(prev.x1 - x1) < 0.5 &&
          Math.abs(prev.y1 - y1) < 0.5 &&
          Math.abs(prev.x2 - x2) < 0.5 &&
          Math.abs(prev.y2 - y2) < 0.5
        ) {
          return prev;
        }
        return { x1, y1, x2, y2 };
      });
    }

    function tick() {
      update();
      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
    };
  }, [anchor, cardRef, containerRef]);

  if (!line) return null;

  const midX = line.x1 + (line.x2 - line.x1) * 0.62;
  const path = `M ${line.x1} ${line.y1} L ${midX} ${line.y1} L ${midX} ${line.y2} L ${line.x2} ${line.y2}`;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-40 h-full w-full overflow-visible"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="#000000"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d={path}
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#c9a45c"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={line.x1} cy={line.y1} r="7" fill="#000000" opacity="0.55" />
      <circle
        cx={line.x1}
        cy={line.y1}
        r="5.5"
        fill="#c9a45c"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <circle cx={line.x2} cy={line.y2} r="6" fill="#000000" opacity="0.55" />
      <circle
        cx={line.x2}
        cy={line.y2}
        r="4.5"
        fill="#c9a45c"
        stroke="#ffffff"
        strokeWidth="2"
      />
    </svg>
  );
}

function Scene({
  flats,
  selected,
  focusFloor,
  myFlatNumber,
  labels,
  measure,
  walkMode,
  showAcross,
  showDown,
  debugMarks,
  debugLayers,
  corridorCoverage,
  debugOn,
  debugOpen,
  onCorridorReport,
  onSelect,
  controlsRef,
  roseRef,
  onSelectedScreen,
}: {
  flats: ModelFlat[]
  selected: string | null
  focusFloor: number
  myFlatNumber?: string | null
  labels: LabelVisibility
  measure: boolean
  walkMode: boolean
  showAcross: boolean
  showDown: boolean
  debugMarks: ReturnType<typeof buildDebugLabels>
  debugLayers: Record<DebugLayer, boolean>
  corridorCoverage: boolean
  debugOn: boolean
  debugOpen: boolean
  onCorridorReport: (report: CorridorLabelReport) => void
  onSelect: (flat: ModelFlat) => void
  controlsRef: RefObject<OrbitControlsImpl | null>
  roseRef: RefObject<HTMLDivElement | null>
  onSelectedScreen: (
    point: { clientX: number; clientY: number; visible: boolean } | null,
  ) => void
}) {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const [walkFloor, setWalkFloor] = useState(1);
  const myFlat = useMemo(
    () => flats.find((flat) => flat.flatNumber === myFlatNumber) ?? null,
    [flats, myFlatNumber],
  );
  const selectedFlat = useMemo(
    () => flats.find((flat) => flat.flatNumber === selected) ?? null,
    [flats, selected],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    if (!walkMode) return;
    const next = getWalkFlatFloorHint();
    setWalkFloor((prev) => (prev === next ? prev : next));
  });

  return (
    <>
      <color attach="background" args={["#d8d0c0"]} />
      <hemisphereLight args={["#f7f2e6", "#5c5a56", 0.85]} />
      <directionalLight position={[18, 22, 10]} intensity={1.15} />
      <ambientLight intensity={0.45} />

      <Site />
      {walkMode ? <CommunityWalkers /> : null}
      <Corridors focusFloor={focusFloor} />
      <LiftAtBE5 focusFloor={focusFloor} walkMode={walkMode} />
      <LiftAtBN5 focusFloor={focusFloor} walkMode={walkMode} />
      <LiftAtAS1 focusFloor={focusFloor} walkMode={walkMode} />
      <LiftAtA4 focusFloor={focusFloor} walkMode={walkMode} />
      <UStairAtLift focusFloor={focusFloor} walkMode={walkMode} />
      <AWingCorridorFills focusFloor={focusFloor} fills={A4_CORRIDOR_FILLS} name="a4-corridor-fills" />
      <AWingEntranceDoor focusFloor={focusFloor} entrance={A4_ENTRANCE} name="a4-entrance" />
      <StairAtAWing
        focusFloor={focusFloor}
        walkMode={walkMode}
        stair={STAIR_A4}
        id="a4"
        northWall={false}
      />
      <AWingCorridorFills focusFloor={focusFloor} fills={A8_CORRIDOR_FILLS} name="a8-corridor-fills" />
      <AWingEntranceDoor focusFloor={focusFloor} entrance={A8_ENTRANCE} name="a8-entrance" />
      <StairAtAWing focusFloor={focusFloor} walkMode={walkMode} stair={STAIR_A8} id="a8" />
      <B3CorridorFills focusFloor={focusFloor} />
      <StairAtB3 focusFloor={focusFloor} walkMode={walkMode} />
      <B3EntranceDoor focusFloor={focusFloor} />
      <StairAtBN7 focusFloor={focusFloor} walkMode={walkMode} />

      {flats.map((flat) =>
        isClubhousePodiumFlat(flat.wing, flat.unit, flat.floor) ? null : (
          <UnitMesh
            key={flat.flatNumber}
            flat={flat}
            selected={selected === flat.flatNumber}
            dimmed={focusFloor !== 0 && flat.floor !== focusFloor}
            mine={flat.flatNumber === myFlatNumber}
            showMyLabel={labels.myFlat}
            onFocusFloor={focusFloor !== 0 && flat.floor === focusFloor}
            geometry={geometry}
            onSelect={onSelect}
            walkMode={walkMode}
            walkFloor={walkFloor}
          />
        ),
      )}

      <GroundLabels labels={labels} focusFloor={focusFloor} />
      <CorridorSegmentLayer
        focusFloor={focusFloor}
        showIds={labels.corridors || debugOn || debugOpen}
        showDimensions={measure}
        showCoverage={corridorCoverage}
        showFeet={measure && (debugOn || debugOpen)}
        onReport={onCorridorReport}
      />
      {measure ? (
        <FloorMeasureGrid
          focusFloor={focusFloor}
          showX={showAcross}
          showZ={showDown}
        />
      ) : null}
      {debugMarks.length > 0 ? (
        <DebugLabelLayer labels={debugMarks} enabled={debugLayers} />
      ) : null}
      <FocusMyFlat flat={myFlat} controlsRef={controlsRef} />
      <ProjectSelectedAnchor flat={selectedFlat} onScreen={onSelectedScreen} />
      <CompassSync roseRef={roseRef} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!walkMode}
        enableRotate={!walkMode}
        enablePan={!walkMode}
        enableZoom={!walkMode}
        target={
          myFlat
            ? (() => {
                const [x, y, z] = unitPosition(
                  myFlat.wing,
                  myFlat.unit,
                  myFlat.floor,
                );
                return [x, y * 0.4, z] as [number, number, number];
              })()
            : [BUILDING_CENTER[0], 0, BUILDING_CENTER[2]]
        }
        zoomSpeed={0.2}
        minDistance={ZOOM_MIN}
        maxDistance={ZOOM_MAX}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

function ZoomButtons({
  onZoomIn,
  onZoomOut,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  const btn =
    "inline-flex size-11 items-center justify-center text-xl leading-none font-semibold text-[#e8d5a3] hover:bg-[#1b3a2f]";
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-[#14241c]/80 backdrop-blur-sm">
      <button type="button" className={btn} aria-label="Zoom in" onClick={onZoomIn}>
        +
      </button>
      <span className="h-px bg-[rgba(232,213,163,0.2)]" aria-hidden />
      <button type="button" className={btn} aria-label="Zoom out" onClick={onZoomOut}>
        −
      </button>
    </div>
  );
}

function LabelPicker({
  value,
  onChange,
}: {
  value: LabelVisibility
  onChange: (next: LabelVisibility) => void
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = useMemo(
    () =>
      LABEL_OPTIONS.filter(
        (option) => IS_DEV || PROD_LABEL_KEYS.has(option.key),
      ),
    [],
  );
  const activeCount = options.filter((option) => value[option.key]).length;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#14241c]/80 px-4 text-sm font-semibold text-[#e8d5a3] backdrop-blur-sm"
      >
        Labels
        <span className="rounded-full bg-[#c9a45c]/25 px-1.5 text-[11px] font-bold text-[#e8d5a3]">
          {activeCount}
        </span>
        <span className={`text-xs ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Ground-floor labels"
          className="absolute top-[calc(100%+0.4rem)] right-0 z-20 w-[15.5rem] max-h-[min(28rem,70vh)] overflow-y-auto rounded-2xl bg-[#14241c] p-2 shadow-lg ring-1 ring-[rgba(232,213,163,0.22)]"
        >
          {IS_DEV ? (
            <div className="mb-1 flex gap-1 px-1">
              <button
                type="button"
                className="flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#e8d5a3] hover:bg-[rgba(232,213,163,0.12)]"
                onClick={() =>
                  onChange(
                    Object.fromEntries(
                      LABEL_OPTIONS.map((option) => [option.key, true]),
                    ) as LabelVisibility,
                  )
                }
              >
                Show all
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#e8d5a3] hover:bg-[rgba(232,213,163,0.12)]"
                onClick={() =>
                  onChange(
                    Object.fromEntries(
                      LABEL_OPTIONS.map((option) => [option.key, false]),
                    ) as LabelVisibility,
                  )
                }
              >
                Hide all
              </button>
            </div>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {options.map((option) => {
              const checked = value[option.key];
              return (
                <li key={option.key}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() =>
                      onChange({ ...value, [option.key]: !checked })
                    }
                    className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold ${
                      checked
                        ? "bg-[#c9a45c] text-[#14241c]"
                        : "text-[#e8d5a3] hover:bg-[rgba(232,213,163,0.12)]"
                    }`}
                  >
                    {option.label}
                    <span aria-hidden>{checked ? "On" : "Off"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FloorPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (floor: number) => void
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const label = value === 0 ? "All floors" : `Floor ${value}`;

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#14241c]/80 px-4 text-sm font-semibold text-[#e8d5a3] backdrop-blur-sm"
      >
        {label}
        <span className={`text-xs ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Floor"
          className="absolute top-[calc(100%+0.4rem)] left-0 z-20 w-[13.5rem] rounded-2xl bg-[#14241c] p-2 shadow-lg ring-1 ring-[rgba(232,213,163,0.22)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === 0}
            onClick={() => {
              onChange(0);
              setOpen(false);
            }}
            className={`mb-1 flex min-h-10 w-full items-center rounded-xl px-3 text-sm font-semibold ${
              value === 0
                ? "bg-[#c9a45c] text-[#14241c]"
                : "text-[#e8d5a3] hover:bg-[rgba(232,213,163,0.12)]"
            }`}
          >
            All floors
          </button>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: FLOOR_COUNT }, (_, index) => {
              const floor = index + 1;
              const selected = value === floor;
              return (
                <button
                  key={floor}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(floor);
                    setOpen(false);
                  }}
                  className={`inline-flex min-h-10 items-center justify-center rounded-xl text-sm font-semibold ${
                    selected
                      ? "bg-[#c9a45c] text-[#14241c]"
                      : "text-[#e8d5a3] hover:bg-[rgba(232,213,163,0.12)]"
                  }`}
                >
                  {floor}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColorKey({ invert = false }: { invert?: boolean }) {
  const items = [
    { color: TONE.grey, label: "Unsold" },
    { color: TONE.bought, label: "Sold" },
    { color: TONE.mine, label: "Your flat" },
    { color: TONE.floor, label: "Selected floor" },
    { color: TONE.clubhouse, label: "Clubhouse" },
  ];
  return (
    <ul
      className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${invert ? "text-[#d8c898]" : "text-[#3d5247]"}`}
    >
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function AmenityLegend({ invert = false }: { invert?: boolean }) {
  return (
    <div
      className={`rounded-xl px-2.5 py-2 backdrop-blur-sm ${
        invert
          ? "bg-[#0d1a14]/78 text-[#e8d5a3]"
          : "bg-[#fffcf5]/92 text-[#14241c] ring-1 ring-[rgba(27,58,47,0.12)]"
      }`}
    >
      <p
        className={`mb-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase ${
          invert ? "text-[#c0ae80]" : "text-[#c9a45c]"
        }`}
      >
        Amenities
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-tight sm:grid-cols-1">
        {AMENITY_LEGEND.map((entry) => (
          <li
            key={entry.label}
            className={invert ? "text-[#e0d0a0]" : "text-[#3d5247]"}
          >
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Building3DView({
  flats,
  myFlatNumber,
}: {
  flats: ModelFlat[]
  myFlatNumber?: string | null
}) {
  const myFlat = useMemo(
    () => flats.find((flat) => flat.flatNumber === myFlatNumber) ?? null,
    [flats, myFlatNumber],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusFloor, setFocusFloor] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [labels, setLabels] = useState<LabelVisibility>(DEFAULT_LABELS);
  const [measure, setMeasure] = useState(false);
  const [walkMode, setWalkMode] = useState(false);
  const [showAcross, setShowAcross] = useState(true);
  const [showDown, setShowDown] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const [corridorCoverage, setCorridorCoverage] = useState(false);
  const [corridorReport, setCorridorReport] = useState<CorridorLabelReport | null>(null);
  const onCorridorReport = useCallback((report: CorridorLabelReport) => {
    setCorridorReport((current) => {
      if (
        current &&
        current.detected === report.detected &&
        current.labelled === report.labelled &&
        current.active === report.active &&
        current.missingIds.join() === report.missingIds.join()
      ) {
        return current;
      }
      return report;
    });
  }, []);
  const [debugLayers, setDebugLayers] = useState<Record<DebugLayer, boolean>>(() =>
    Object.fromEntries(DEBUG_LAYER_OPTIONS.map((option) => [option.key, false])) as Record<
      DebugLayer,
      boolean
    >,
  );
  const debugOn =
    corridorCoverage || DEBUG_LAYER_OPTIONS.some((option) => debugLayers[option.key]);
  const debugMarks = useMemo(
    () => (debugOn ? buildDebugLabels(flats, focusFloor) : []),
    [debugOn, flats, focusFloor],
  );
  const [anchor, setAnchor] = useState<{
    clientX: number
    clientY: number
    visible: boolean
  } | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const roseRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const cameraStart = useMemo((): [number, number, number] => {
    if (!myFlat) return CAMERA_START;
    const [x, y, z] = unitPosition(myFlat.wing, myFlat.unit, myFlat.floor);
    const ox = CAMERA_START[0] - BUILDING_CENTER[0];
    const oy = CAMERA_START[1] - BUILDING_CENTER[1];
    const oz = CAMERA_START[2] - BUILDING_CENTER[2];
    const pull = 0.58;
    return [
      x + ox * pull,
      Math.max(y + 12, BUILDING_CENTER[1] + oy * pull * 0.55),
      z + oz * pull,
    ];
  }, [myFlat]);

  // Production: keep non-amenity labels off even if state was somehow toggled.
  const visibleLabels = useMemo(() => {
    const next = { ...labels };
    if (!IS_DEV) {
      for (const key of DEV_ONLY_LABEL_KEYS) next[key] = false;
    }
    if (measure || debugOn) {
      next.units = false;
      next.compound = false;
      next.siteMarks = false;
      next.amenities = false;
      next.clubhouse = false;
      next.gate = false;
      next.faces = false;
    }
    return next;
  }, [labels, measure, debugOn]);
  const selected = useMemo(
    () => flats.find((flat) => flat.flatNumber === selectedId) ?? null,
    [flats, selectedId],
  );
  const remount = useCallback(() => setCanvasKey((key) => key + 1), []);
  const onSelect = useCallback((flat: ModelFlat) => {
    setSelectedId(flat.flatNumber);
  }, []);
  const onSelectedScreen = useCallback(
    (point: { clientX: number; clientY: number; visible: boolean } | null) => {
      setAnchor(point);
    },
    [],
  );
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setAnchor(null);
  }, []);
  const zoomBy = useCallback((inward: boolean) => {
    const controls = controlsRef.current;
    if (controls) nudgeZoom(controls, inward);
  }, []);

  useEffect(() => {
    if (!fullScreen && !selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedId) {
        clearSelection();
        return;
      }
      if (fullScreen) setFullScreen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = fullScreen ? document.body.style.overflow : null;
    if (fullScreen) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous !== null) document.body.style.overflow = previous;
    };
  }, [fullScreen, selectedId, clearSelection]);

  const floorControl = (
    <FloorPicker value={focusFloor} onChange={setFocusFloor} />
  );

  const showAmenityLegend = visibleLabels.amenities;

  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 z-50 flex flex-col bg-[#14241c]"
          : "flex h-full min-h-0 flex-col"
      }
    >
      <div
        ref={stageRef}
        className={
          fullScreen
            ? "relative min-h-0 flex-1 touch-none select-none"
            : "relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#1b3a2f]"
        }
      >
        <div className="absolute top-3 left-3 z-10">{floorControl}</div>
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 sm:flex-row">
          <div className="relative">
            <button
              type="button"
              aria-pressed={debugOpen}
              onClick={() => setDebugOpen((open) => !open)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold backdrop-blur-sm ${
                debugOn ? "bg-[#c9a45c] text-[#14241c]" : "bg-[#14241c]/80 text-[#e8d5a3]"
              }`}
            >
              Debug
            </button>
            {debugOpen ? (
              <div className="absolute top-[calc(100%+0.4rem)] right-0 z-20">
                <DebugLayerPanel
                  value={debugLayers}
                  onChange={setDebugLayers}
                  coverage={corridorCoverage}
                  onCoverage={setCorridorCoverage}
                  report={corridorReport}
                />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-pressed={walkMode}
            onClick={() => setWalkMode((on) => !on)}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold backdrop-blur-sm ${
              walkMode
                ? "bg-[#c9a45c] text-[#14241c]"
                : "bg-[#14241c]/80 text-[#e8d5a3]"
            }`}
          >
            Walk mode
          </button>
          <button
            type="button"
            aria-pressed={measure}
            onClick={() => setMeasure((on) => !on)}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold backdrop-blur-sm ${
              measure
                ? "bg-[#c9a45c] text-[#14241c]"
                : "bg-[#14241c]/80 text-[#e8d5a3]"
            }`}
          >
            Dimensions
          </button>
          {measure ? (
            <>
              <button
                type="button"
                aria-pressed={showAcross}
                onClick={() => setShowAcross((on) => !on)}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold backdrop-blur-sm ${
                  showAcross
                    ? "bg-[#c9a45c] text-[#14241c]"
                    : "bg-[#14241c]/80 text-[#e8d5a3]"
                }`}
              >
                Across
              </button>
              <button
                type="button"
                aria-pressed={showDown}
                onClick={() => setShowDown((on) => !on)}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold backdrop-blur-sm ${
                  showDown
                    ? "bg-[#c9a45c] text-[#14241c]"
                    : "bg-[#14241c]/80 text-[#e8d5a3]"
                }`}
              >
                Down
              </button>
            </>
          ) : null}
          <LabelPicker value={labels} onChange={setLabels} />
          <button
            type="button"
            onClick={() => setFullScreen((open) => !open)}
            className="inline-flex min-h-11 items-center rounded-full bg-[#14241c]/80 px-4 text-sm font-semibold text-[#e8d5a3] backdrop-blur-sm"
          >
            {fullScreen ? "Exit" : "Full screen"}
          </button>
        </div>
        <CompassHud roseRef={roseRef} />
        {showAmenityLegend ? (
          <div className="absolute bottom-[5.35rem] left-[5.75rem] z-10 max-h-[min(42vh,22rem)] max-w-[min(100%-8rem,18rem)] overflow-y-auto">
            <AmenityLegend invert />
          </div>
        ) : null}
        <div className="absolute right-3 bottom-16 z-10">
          <ZoomButtons
            onZoomIn={() => zoomBy(true)}
            onZoomOut={() => zoomBy(false)}
          />
        </div>
        <CanvasErrorBoundary onReset={remount}>
          <Canvas
            key={canvasKey}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: false }}
            camera={{ position: cameraStart, fov: 40 }}
            onPointerMissed={clearSelection}
            className="!absolute inset-0 h-full w-full"
          >
            <Scene
              flats={flats}
              selected={selectedId}
              focusFloor={focusFloor}
              myFlatNumber={myFlatNumber}
              labels={visibleLabels}
              measure={measure}
              walkMode={walkMode}
              showAcross={showAcross}
              showDown={showDown}
              debugMarks={debugMarks}
              debugLayers={debugLayers}
              corridorCoverage={corridorCoverage}
              debugOn={debugOn}
              debugOpen={debugOpen}
              onCorridorReport={onCorridorReport}
              onSelect={onSelect}
              controlsRef={controlsRef}
              roseRef={roseRef}
              onSelectedScreen={onSelectedScreen}
            />
          </Canvas>
        </CanvasErrorBoundary>

        <div
          className="absolute inset-x-0 bottom-0 z-10 border-t border-[rgba(232,213,163,0.16)] bg-[#14241c]/88 px-3 pt-2.5 backdrop-blur-sm"
          style={{
            paddingBottom: fullScreen
              ? "max(0.75rem, env(safe-area-inset-bottom))"
              : "0.65rem",
          }}
        >
          <div className="flex flex-col gap-1.5 text-[#e8d5a3] md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[#d0c090]">
              {measure
                ? "Dimensions. 0′ is the east–south corner. Across grows west. Down grows north."
                : walkMode
                  ? "At the gate · drag to look · WASD walk (walls block, stairs climb) · Esc releases mouse"
                  : selected
                    ? "Click empty space or × to close details"
                    : "Click a flat for details · Drag to orbit"}
              {fullScreen && !walkMode ? " · Esc to exit" : ""}
            </p>
          </div>
          <div className="mt-1.5">
            <ColorKey invert />
          </div>
        </div>

        {selected ? (
          <>
            <SelectionLeaderLine
              anchor={anchor}
              cardRef={cardRef}
              containerRef={stageRef}
            />
            <FlatDetailCard
              flat={selected}
              myFlatNumber={myFlatNumber}
              onClose={clearSelection}
              cardRef={cardRef}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
