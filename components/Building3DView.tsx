"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from "react";
import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Path,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  type BufferGeometry,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import {
  BUILDING_CENTER,
  CAMERA_START,
  CLUBHOUSE_ID,
  COMPOUND_ID,
  CORRIDORS,
  CORRIDOR_WALLS,
  FACE_MARKS,
  FLOOR_COUNT,
  FLOOR_HEIGHT,
  FOOTPRINT_IDS,
  SITE,
  SITE_AREA_LABELS,
  SITE_AREA_LABEL_TEXT,
  AMENITY_LABEL_IDS,
  LAWN_PARTS,
  LAWN_PARTS_BY_GROUP,
  LAWN_LABEL_GROUP_OPTIONS,
  type LawnLabelGroup,
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
  compoundMarkPosition,
  corridorDebugMarks,
  corridorEndMarks,
  corridorEndPosition,
  corridorMarkPosition,
  debugMarkPosition,
  groundLabelY,
  isClubhousePodiumFlat,
  labelPosition,
  unitBoxSize,
  unitPosition,
} from "@/lib/layout3d";

type LabelKey =
  | "units"
  | "corridors"
  | "compound"
  | "siteMarks"
  | "lawnN"
  | "lawnE"
  | "lawnW"
  | "lawnS"
  | "lawnYard"
  | "amenities"
  | "clubhouse"
  | "gate"
  | "faces";

type LabelVisibility = Record<LabelKey, boolean>;

const LAWN_GROUP_KEY: Record<LawnLabelGroup, LabelKey> = {
  n: "lawnN",
  e: "lawnE",
  w: "lawnW",
  s: "lawnS",
  yard: "lawnYard",
};

const LABEL_OPTIONS: { key: LabelKey; label: string }[] = [
  { key: "units", label: "Units" },
  { key: "corridors", label: "Corridors" },
  { key: "compound", label: "Compound" },
  { key: "siteMarks", label: "Site marks" },
  ...LAWN_LABEL_GROUP_OPTIONS.map((option) => ({
    key: LAWN_GROUP_KEY[option.key],
    label: option.label,
  })),
  { key: "amenities", label: "Amenities" },
  { key: "clubhouse", label: "Clubhouse" },
  { key: "gate", label: "Gate" },
  { key: "faces", label: "Face marks" },
];

const DEFAULT_LABELS: LabelVisibility = {
  units: true,
  corridors: true,
  compound: true,
  siteMarks: true,
  // L# grids off by default — each side is a few hundred Html nodes.
  lawnN: false,
  lawnE: false,
  lawnW: false,
  lawnS: false,
  lawnYard: false,
  amenities: true,
  clubhouse: true,
  gate: true,
  faces: false,
};

const HEAVY_LABEL =
  "block rounded-md bg-[#0d1a14]/92 px-2 py-1 text-[12px] leading-none font-black tracking-wide text-[#f7f2e6] shadow-[0_1px_4px_rgba(0,0,0,0.45)] ring-1 ring-[rgba(232,213,163,0.35)]";
const HEAVY_LABEL_SM =
  "block rounded bg-[#0d1a14]/9 px-1.5 py-0.5 text-[10px] leading-none font-extrabold tracking-wide text-[#e8d5a3] shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-1 ring-[rgba(232,213,163,0.28)]";
const HEAVY_LABEL_GROUND =
  "block rounded-lg bg-[#0d1a14]/95 px-3 py-1.5 text-[14px] leading-none font-black tracking-[0.08em] uppercase text-[#f7f2e6] shadow-[0_2px_8px_rgba(0,0,0,0.5)] ring-2 ring-[rgba(232,213,163,0.45)]";
const DEBUG_LAWN_LABEL =
  "block rounded bg-[#0d1a14]/88 px-1 py-0.5 text-[8px] leading-none font-bold text-[#e8d5a3] shadow-[0_1px_2px_rgba(0,0,0,0.35)] ring-1 ring-[rgba(232,213,163,0.25)]";

const GROUND_HEAVY_IDS = new Set([
  "plot",
  "plotE",
  "park",
  "parkNe",
  "parkLedge",
  "track",
  "trackNe",
  "kids",
  "sit",
]);

export type ModelFlat = {
  flatNumber: string
  wing: string
  floor: number
  unit: number
  type: string
  facing: string
  areaSqft: number | null
  ownerName?: string
  statusLabel?: string | null
};

const TONE = {
  grey: "#b0b5b2",
  greyDim: "#6e7471",
  floor: "#6d8fb8",
  bought: "#3d8a66",
  boughtDim: "#2f5c48",
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
  return Boolean(flat.ownerName);
}

function colorFor(
  flat: ModelFlat,
  selected: boolean,
  hovered: boolean,
  dimmed: boolean,
  mine: boolean,
  onFocusFloor: boolean,
) {
  if (selected) return TONE.selected;
  if (hovered) return TONE.hover;
  if (mine) return TONE.mine;
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
  onFocusFloor,
  geometry,
  onSelect,
}: {
  flat: ModelFlat
  selected: boolean
  dimmed: boolean
  mine: boolean
  onFocusFloor: boolean
  geometry: BoxGeometry
  onSelect: (flat: ModelFlat) => void
}) {
  const [hovered, setHovered] = useState(false);
  const position = unitPosition(flat.wing, flat.unit, flat.floor);
  const size = unitBoxSize(flat.wing, flat.unit);
  const keepBright = selected || hovered || mine;
  const faded = dimmed && !keepBright && !isBought(flat);

  return (
    <mesh
      position={position}
      scale={size}
      geometry={geometry}
      renderOrder={faded ? 0 : 2}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(flat);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <meshStandardMaterial
        color={colorFor(flat, selected, hovered, dimmed, mine, onFocusFloor)}
        transparent={dimmed && !keepBright}
        opacity={faded ? 0.22 : dimmed && !keepBright ? 0.55 : 1}
        depthWrite={!faded}
        roughness={dimmed && !keepBright ? 0.78 : 0.55}
        metalness={dimmed && !keepBright ? 0.02 : 0.08}
      />
    </mesh>
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
            color="#c4b8a4"
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

function CompoundLawn() {
  const geometries = useMemo(
    () =>
      LAWN_PARTS.filter((part) => {
        if (part.mesh === false) return false;
        const [x, , z] = part.position;
        // Don't paint grey lawn under park / walking track (covers the bands).
        const face = compoundNorthFace(x);
        if (z < face + PARK_WIDTH + TRACK_WIDTH + 0.06) return false;
        const inTrack = PERIMETER_BANDS.track.parts.some((band) => {
          const xs = band.ring.map((p) => p[0]);
          const zs = band.ring.map((p) => p[1]);
          return (
            x >= Math.min(...xs) - 0.05 &&
            x <= Math.max(...xs) + 0.05 &&
            z >= Math.min(...zs) - 0.05 &&
            z <= Math.max(...zs) + 0.05
          );
        });
        return !inTrack;
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
        return {
          id: part.id,
          color: isCricket ? "#3d6b4f" : isKids ? "#6b8f4e" : part.color,
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
    const geom = new ShapeGeometry(shape);
    applyWorldPavingUVs(geom, PAVING_TILE);
    return geom;
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
        <meshStandardMaterial color="#ffffff" map={map} roughness={0.86} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={SITE.pool.position}>
        <planeGeometry args={SITE.pool.size} />
        <meshStandardMaterial color="#5b7c8a" />
      </mesh>
      <Clubhouse />
      <StiltLevel />
      <group position={SITE.north}>
        <mesh position={[0, 0.08, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.22, 0.85, 3]} />
          <meshStandardMaterial color="#e8d5a3" />
        </mesh>
        <Html position={[0, 1.1, 0]} center transform style={{ pointerEvents: "none" }}>
          <span className="text-sm font-semibold text-[#e8d5a3]">N</span>
        </Html>
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
  const map = useCheckeredPaving();
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
        applyWorldPavingUVs(geom, PAVING_TILE, slab.position[0], slab.position[2]);
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
            <meshStandardMaterial color={PAVING_LIGHT} roughness={0.86} metalness={0.03} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[body.position[0], topY, body.position[2]]}
            geometry={geom}
          >
            <meshStandardMaterial color="#ffffff" map={map} roughness={0.86} metalness={0.03} />
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
            <Html
              key={`fl-unit-${id}`}
              position={labelPosition(id, floorFocus)}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL}>{id}</span>
            </Html>
          ))
        : null}

      {labels.clubhouse ? (
        <Html
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
        </Html>
      ) : null}

      {labels.gate ? (
        <Html
          position={withGroundY(compoundGatePosition())}
          center
          style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
        >
          <span className={HEAVY_LABEL}>Gate</span>
        </Html>
      ) : null}

      {LAWN_LABEL_GROUP_OPTIONS.map((group) =>
        labels[LAWN_GROUP_KEY[group.key]]
          ? LAWN_PARTS_BY_GROUP[group.key].map((part) => (
              <Html
                key={`gf-lawn-${part.id}`}
                position={part.position}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className={DEBUG_LAWN_LABEL}>{part.label}</span>
              </Html>
            ))
          : null,
      )}

      {labels.siteMarks
        ? SITE_AREA_LABELS.filter((area) => SITE_MARK_LABEL_IDS.has(area.id)).map(
            (area) => (
              <Html
                key={`gf-site-${area.id}`}
                position={area.position}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className={HEAVY_LABEL}>
                  {SITE_AREA_LABEL_TEXT[area.id] ?? area.id}
                </span>
              </Html>
            ),
          )
        : null}

      {labels.amenities
        ? SITE_AREA_LABELS.filter((area) => AMENITY_LABEL_IDS.has(area.id)).map(
            (area) => (
              <Html
                key={`gf-amenity-${area.id}`}
                position={area.position}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span
                  className={
                    GROUND_HEAVY_IDS.has(area.id) ? HEAVY_LABEL_GROUND : HEAVY_LABEL
                  }
                >
                  {SITE_AREA_LABEL_TEXT[area.id] ?? area.id}
                </span>
              </Html>
            ),
          )
        : null}

      {labels.compound ? (
        <>
          {COMPOUND_FACE_MARKS.filter((mark) => mark.abbr !== "e").map((mark) => (
            <Html
              key={`gf-${COMPOUND_ID}-${mark.abbr}`}
              position={withGroundY(compoundMarkPosition(mark.dx, mark.dz))}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL}>
                {COMPOUND_ID}
                {mark.abbr}
              </span>
            </Html>
          ))}
          {compoundExtraMarks().map((mark) => (
            <Html
              key={`gf-${COMPOUND_ID}-${mark.abbr}`}
              position={withGroundY(mark.position)}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL_SM}>
                {COMPOUND_ID}
                {mark.abbr}
              </span>
            </Html>
          ))}
          {INNER_SHORT_WALL.labels.map((mark) => (
            <Html
              key={`gf-${INNER_SHORT_WALL.id}-${mark.abbr || "mid"}`}
              position={mark.position}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL}>
                {INNER_SHORT_WALL.id}
                {mark.abbr}
              </span>
            </Html>
          ))}
        </>
      ) : null}

      {labels.corridors
        ? CORRIDORS.flatMap((corridor) => [
            <Html
              key={`fl-${corridor.id}`}
              position={corridorMarkPosition(corridor, 0, floorFocus)}
              center
              style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
            >
              <span className={HEAVY_LABEL}>{corridor.id}</span>
            </Html>,
            ...corridorDebugMarks(corridor).map((mark) => (
              <Html
                key={`fl-${corridor.id}-${mark.abbr}`}
                position={corridorMarkPosition(corridor, mark.t, floorFocus)}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className={HEAVY_LABEL_SM}>
                  {corridor.id}
                  {mark.abbr}
                </span>
              </Html>
            )),
            ...corridorEndMarks(corridor).map((mark) => (
              <Html
                key={`fl-${corridor.id}-end-${mark.abbr}`}
                position={corridorEndPosition(corridor, mark, floorFocus)}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className={HEAVY_LABEL_SM}>
                  {corridor.id}
                  {mark.abbr}
                </span>
              </Html>
            )),
          ])
        : null}

      {labels.faces ? (
        <>
          {FOOTPRINT_IDS.flatMap((id) =>
            FACE_MARKS.map((mark) => (
              <Html
                key={`fl-face-${id}-${mark.abbr}`}
                position={debugMarkPosition(id, mark.dx, mark.dz, floorFocus)}
                center
                style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className={HEAVY_LABEL_SM}>
                  {id}
                  {mark.abbr}
                </span>
              </Html>
            )),
          )}
          {FACE_MARKS.map((mark) => (
            <Html
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
            </Html>
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

function Scene({
  flats,
  selected,
  focusFloor,
  myFlatNumber,
  labels,
  onSelect,
  controlsRef,
}: {
  flats: ModelFlat[]
  selected: string | null
  focusFloor: number
  myFlatNumber?: string | null
  labels: LabelVisibility
  onSelect: (flat: ModelFlat) => void
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <color attach="background" args={["#d8d0c0"]} />
      <hemisphereLight args={["#f7f2e6", "#5c5a56", 0.85]} />
      <directionalLight position={[18, 22, 10]} intensity={1.15} />
      <ambientLight intensity={0.45} />

      <Site />
      <Corridors focusFloor={focusFloor} />

      {flats.map((flat) =>
        isClubhousePodiumFlat(flat.wing, flat.unit, flat.floor) ? null : (
          <UnitMesh
            key={flat.flatNumber}
            flat={flat}
            selected={selected === flat.flatNumber}
            dimmed={focusFloor !== 0 && flat.floor !== focusFloor}
            mine={flat.flatNumber === myFlatNumber}
            onFocusFloor={focusFloor !== 0 && flat.floor === focusFloor}
            geometry={geometry}
            onSelect={onSelect}
          />
        ),
      )}

      <GroundLabels labels={labels} focusFloor={focusFloor} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[BUILDING_CENTER[0], 0, BUILDING_CENTER[2]]}
        enablePan
        enableZoom
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
  const activeCount = LABEL_OPTIONS.filter((option) => value[option.key]).length;

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
          <ul className="flex flex-col gap-0.5">
            {LABEL_OPTIONS.map((option) => {
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
    { color: TONE.grey, label: "Available" },
    { color: TONE.bought, label: "Bought" },
    { color: TONE.mine, label: "Your flat" },
    { color: TONE.floor, label: "Selected floor" },
    { color: TONE.clubhouse, label: "Clubhouse" },
  ];
  return (
    <ul
      className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${invert ? "text-[#e8d5a3]/80" : "text-[#3d5247]"}`}
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

export default function Building3DView({
  flats,
  myFlatNumber,
}: {
  flats: ModelFlat[]
  myFlatNumber?: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusFloor, setFocusFloor] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [labels, setLabels] = useState<LabelVisibility>(DEFAULT_LABELS);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const selected = useMemo(
    () => flats.find((flat) => flat.flatNumber === selectedId) ?? null,
    [flats, selectedId],
  );
  const remount = useCallback(() => setCanvasKey((key) => key + 1), []);
  const onSelect = useCallback((flat: ModelFlat) => {
    setSelectedId(flat.flatNumber);
  }, []);
  const zoomBy = useCallback((inward: boolean) => {
    const controls = controlsRef.current;
    if (controls) nudgeZoom(controls, inward);
  }, []);

  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullScreen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [fullScreen]);

  const floorControl = (
    <FloorPicker value={focusFloor} onChange={setFocusFloor} />
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={
          fullScreen
            ? "fixed inset-0 z-50 flex flex-col bg-[#14241c]"
            : "overflow-hidden rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#1b3a2f]"
        }
      >
        <div
          className={
            fullScreen
              ? "relative min-h-0 flex-1 touch-none"
              : "relative h-[min(68vh,640px)] w-full touch-none"
          }
        >
          <div className="absolute top-3 left-3 z-10">{floorControl}</div>
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 sm:flex-row">
            <LabelPicker value={labels} onChange={setLabels} />
            <button
              type="button"
              onClick={() => setFullScreen((open) => !open)}
              className="inline-flex min-h-11 items-center rounded-full bg-[#14241c]/80 px-4 text-sm font-semibold text-[#e8d5a3] backdrop-blur-sm"
            >
              {fullScreen ? "Exit" : "Full screen"}
            </button>
          </div>
          <div
            className={`absolute right-3 z-10 ${fullScreen ? "bottom-20" : "bottom-3"}`}
          >
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
              camera={{ position: CAMERA_START, fov: 40 }}
              onPointerMissed={() => setSelectedId(null)}
            >
              <Scene
                flats={flats}
                selected={selectedId}
                focusFloor={focusFloor}
                myFlatNumber={myFlatNumber}
                labels={labels}
                onSelect={onSelect}
                controlsRef={controlsRef}
              />
            </Canvas>
          </CanvasErrorBoundary>
          {fullScreen ? (
            <div
              className="absolute inset-x-0 bottom-0 z-10 border-t border-[rgba(232,213,163,0.16)] bg-[#14241c]/88 px-3 pt-3 backdrop-blur-sm"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex flex-col gap-2 text-[#e8d5a3] md:flex-row md:items-center md:justify-between">
                {selected ? (
                  <p className="text-sm font-semibold">
                    {selected.flatNumber}
                    <span className="ml-2 font-normal text-[#e8d5a3]/75">
                      {typeLabel(selected.type)}
                      {selected.facing ? ` · ${facingLabel(selected.facing)}` : ""}
                      {selected.flatNumber === myFlatNumber ? " · Your flat" : ""}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-[#e8d5a3]/75">
                    Drag to orbit · Ctrl/⌘-drag to move · Esc to exit
                  </p>
                )}
              </div>
              <div className="mt-2">
                <ColorKey invert />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] px-3 py-2">
        <ColorKey />
      </div>

      {selected ? (
        <article className="rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#c9a45c] uppercase">
            Wing {selected.wing} · Floor {selected.floor}
            {selected.flatNumber === myFlatNumber ? " · Your flat" : ""}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[#14241c]">{selected.flatNumber}</h2>
          <p className="mt-1 text-[#2f5a48]">
            {typeLabel(selected.type)}
            {selected.facing ? ` · ${facingLabel(selected.facing)}` : ""}
            {selected.areaSqft ? ` · ${selected.areaSqft.toLocaleString()} sft` : ""}
          </p>
          {selected.ownerName ? (
            <p className="mt-2 text-[#14241c]">{selected.ownerName}</p>
          ) : (
            <p className="mt-2 text-sm text-[#3d5247]">No owner linked yet</p>
          )}
          {selected.statusLabel ? (
            <p className="mt-1 text-sm font-semibold text-[#2f5a48]">{selected.statusLabel}</p>
          ) : null}
        </article>
      ) : (
        <p className="text-sm text-[#3d5247]">
          Grey towers are available. Green is bought, gold is your flat.
          Open the floor picker to highlight a level in blue.
        </p>
      )}
    </div>
  );
}
