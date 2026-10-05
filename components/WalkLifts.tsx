"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { MathUtils, Vector3 } from "three";
import {
  LIFT_CABIN_H,
  LIFT_DOOR_H,
  LIFT_MAX_FLOOR,
  LIFT_MIN_FLOOR,
  WALK_LIFTS,
  clampLiftFloor,
  insideLiftCabin,
  liftCenter,
  liftFloorY,
  liftShaftSign,
  nearLiftCall,
  nearestLiftFloor,
  setLiftOpening,
  type LiftPhase,
  type WalkLiftDef,
} from "@/lib/liftRide";
import { ftToScene } from "@/lib/layout3d";

export type LiftRideControl = {
  traveling: boolean
  locked: boolean
  cabinY: number
  liftId: string | null
  holdRider: boolean
  cabinHold: { x: number; z: number; y: number } | null
  /** Player is inside a cabin — use short in-cabin third-person framing. */
  inCabin: boolean
  /** Interior AABB for clamping the walk camera inside the cabin. */
  cabinBounds: {
    x0: number
    x1: number
    z0: number
    z1: number
    y0: number
    y1: number
  } | null
};

const DOOR_SPEED = 1.35;
const CABIN_SPEED = ftToScene(4.2);
/** Walk avatars are scaled ~0.62; place call plate at ~chest on that figure. */
const HALL_CALL_HEIGHT = ftToScene(3.2) * 0.62;

const panelFont: CSSProperties = {
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

/** Offset from wallFace toward lobby (positive = into lobby). */
function alongLobby(lift: WalkLiftDef, lobbyOffset: number) {
  return lift.wallFace - liftShaftSign(lift) * lobbyOffset;
}

/** Euler so Text faces the lobby. */
function lobbyFacingRotation(lift: WalkLiftDef): [number, number, number] {
  const shaft = liftShaftSign(lift);
  if (lift.doorAxis === "x") {
    // Face ±X (lobby): look toward -shaft → rotate Y by ±π/2
    return [0, shaft > 0 ? -Math.PI / 2 : Math.PI / 2, 0];
  }
  // Face ±Z: when shaft is +Z (A4), lobby is -Z → rotate Y by π
  return [0, shaft > 0 ? Math.PI : 0, 0];
}

/** Hall call plate on the lobby face of the left jamb (chest height). */
function hallCallWorldPos(lift: WalkLiftDef, floor: number) {
  const c = liftCenter(lift);
  const y = liftFloorY(floor) + HALL_CALL_HEIGHT;
  const jamb = 0.055;
  // Center of the left jamb beside the opening.
  const side = lift.opening / 2 + jamb / 2;
  // Proud of the frame into the lobby so it is never buried in the pillar.
  const out = 0.07;
  if (lift.doorAxis === "x") {
    return {
      x: alongLobby(lift, out),
      y,
      z: c.z - side,
    };
  }
  return {
    x: c.x - side,
    y,
    z: alongLobby(lift, out),
  };
}

/** Interior COP on a cabin side wall, chest-height on the walk avatar. */
function cabinPanelWorldPos(lift: WalkLiftDef, cabinY: number) {
  const c = liftCenter(lift);
  const y = cabinY + HALL_CALL_HEIGHT;
  // Prefer a side wall (not the door face) so doors stay in view ahead.
  if (lift.doorAxis === "x") {
    // Door on ±X → mount on +Z side wall, toward the door.
    return {
      x: c.x - liftShaftSign(lift) * 0.06,
      y,
      z: lift.z1 - 0.035,
    };
  }
  // Door on ±Z (A4) → mount on +X side wall, toward the door.
  return {
    x: lift.x1 - 0.035,
    y,
    z: c.z - liftShaftSign(lift) * 0.06,
  };
}

/** Euler so panel local +Z faces into the cabin. */
function cabinPanelRotation(lift: WalkLiftDef): [number, number, number] {
  if (lift.doorAxis === "x") {
    // Mounted on +Z wall → face −Z into cabin.
    return [0, Math.PI, 0];
  }
  // Mounted on +X wall → face −X into cabin.
  return [0, -Math.PI / 2, 0];
}

function exteriorCamPose(lift: WalkLiftDef, cabinY: number) {
  const c = liftCenter(lift);
  const side = ftToScene(14);
  const up = ftToScene(3.5);
  const intoLobby = -liftShaftSign(lift);
  if (lift.doorAxis === "x") {
    return {
      cam: new Vector3(
        c.x + intoLobby * side,
        cabinY + up,
        c.z + side * 0.35,
      ),
      look: new Vector3(c.x, cabinY + LIFT_CABIN_H * 0.45, c.z),
    };
  }
  return {
    cam: new Vector3(
      c.x + side * 0.35,
      cabinY + up,
      c.z + intoLobby * side,
    ),
    look: new Vector3(c.x, cabinY + LIFT_CABIN_H * 0.45, c.z),
  };
}

function unlockPointer() {
  if (document.pointerLockElement) document.exitPointerLock();
}

/** Compact 3D cabin operating panel — floors + open/close on the wall. */
function CabinWallPanel({
  lift,
  cabinY,
  currentFloor,
  destFloor,
  doorOpen,
  phase,
  interactive,
  onFloor,
  onOpen,
  onClose,
}: Readonly<{
  lift: WalkLiftDef
  cabinY: number
  currentFloor: number
  destFloor: number | null
  doorOpen: number
  phase: LiftPhase
  interactive: boolean
  onFloor: (floor: number) => void
  onOpen: () => void
  onClose: () => void
}>) {
  const floors = useMemo(
    () =>
      Array.from(
        { length: LIFT_MAX_FLOOR - LIFT_MIN_FLOOR + 1 },
        (_, i) => LIFT_MAX_FLOOR - i,
      ),
    [],
  );
  const p = cabinPanelWorldPos(lift, cabinY);
  const rot = cabinPanelRotation(lift);
  const busy = phase === "traveling" || phase === "called";
  const cols = 3;
  const btn = 0.032;
  const gap = 0.006;
  const gridW = cols * btn + (cols - 1) * gap;
  const rows = Math.ceil(floors.length / cols);
  const gridH = rows * btn + (rows - 1) * gap;
  const panelW = gridW + 0.028;
  const panelH = gridH + 0.09;

  const press = (fn: () => void) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!interactive || busy) return;
    unlockPointer();
    fn();
  };

  return (
    <group position={[p.x, p.y, p.z]} rotation={rot}>
      {/* Bezel */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[panelW + 0.016, panelH + 0.016, 0.018]} />
        <meshStandardMaterial color="#c9a45c" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[panelW, panelH, 0.014]} />
        <meshStandardMaterial color="#1c201e" roughness={0.45} metalness={0.3} />
      </mesh>
      <Text
        position={[-panelW * 0.28, panelH * 0.5 - 0.018, 0.014]}
        fontSize={0.014}
        color="#e8d7b0"
        anchorX="center"
        anchorY="middle"
      >
        FLOOR
      </Text>
      <Text
        position={[panelW * 0.32, panelH * 0.5 - 0.018, 0.014]}
        fontSize={0.02}
        color="#f5efdf"
        anchorX="center"
        anchorY="middle"
      >
        {currentFloor === 0 ? "G" : String(currentFloor)}
      </Text>

      {floors.map((f, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = -gridW / 2 + btn / 2 + col * (btn + gap);
        const y = panelH * 0.5 - 0.04 - btn / 2 - row * (btn + gap);
        const active = f === currentFloor || f === destFloor;
        return (
          <group
            key={`floor-${f}`}
            position={[x, y, 0.014]}
            onClick={press(() => onFloor(f))}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <mesh>
              <boxGeometry args={[btn, btn, 0.01]} />
              <meshStandardMaterial
                color={active ? "#4a3a1e" : "#2a2e2c"}
                emissive={active ? "#c9a45c" : "#111"}
                emissiveIntensity={active ? 0.35 : 0.05}
                roughness={0.4}
                metalness={0.25}
              />
            </mesh>
            <Text
              position={[0, 0, 0.008]}
              fontSize={0.016}
              color={active ? "#ffe9b0" : "#f4f4f1"}
              anchorX="center"
              anchorY="middle"
            >
              {f === 0 ? "G" : String(f)}
            </Text>
          </group>
        );
      })}

      {/* Open / Close */}
      <group
        position={[-btn * 0.55, -panelH * 0.5 + 0.022, 0.014]}
        onClick={press(() => {
          if (doorOpen > 0.95) return;
          onOpen();
        })}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <mesh>
          <boxGeometry args={[btn * 1.15, btn * 0.7, 0.01]} />
          <meshStandardMaterial
            color={doorOpen > 0.5 ? "#1e3d2e" : "#2a2e2c"}
            emissive={doorOpen > 0.5 ? "#3dff9a" : "#111"}
            emissiveIntensity={doorOpen > 0.5 ? 0.3 : 0.05}
            roughness={0.4}
            metalness={0.25}
          />
        </mesh>
        <Text
          position={[0, 0, 0.008]}
          fontSize={0.011}
          color="#f4f4f1"
          anchorX="center"
          anchorY="middle"
        >
          OPEN
        </Text>
      </group>
      <group
        position={[btn * 0.55, -panelH * 0.5 + 0.022, 0.014]}
        onClick={press(() => {
          if (doorOpen < 0.05) return;
          onClose();
        })}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <mesh>
          <boxGeometry args={[btn * 1.15, btn * 0.7, 0.01]} />
          <meshStandardMaterial
            color={doorOpen < 0.5 && doorOpen > 0 ? "#4a3a1e" : "#2a2e2c"}
            emissive={doorOpen < 0.5 && doorOpen > 0 ? "#c9a45c" : "#111"}
            emissiveIntensity={doorOpen < 0.5 && doorOpen > 0 ? 0.25 : 0.05}
            roughness={0.4}
            metalness={0.25}
          />
        </mesh>
        <Text
          position={[0, 0, 0.008]}
          fontSize={0.011}
          color="#f4f4f1"
          anchorX="center"
          anchorY="middle"
        >
          CLOSE
        </Text>
      </group>
    </group>
  );
}

/** Lobby-facing elevator entrance at one landing — frame, doors, sill, call plate. */
function LandingFacade({
  lift,
  floor,
  doorOpen,
  cabinHere,
  hallLit,
  showHallCall = true,
  onCall,
}: {
  lift: WalkLiftDef
  floor: number
  doorOpen: number
  cabinHere: boolean
  hallLit: boolean
  showHallCall?: boolean
  onCall: () => void
}) {
  const c = liftCenter(lift);
  const shaft = liftShaftSign(lift);
  const intoLobby = -shaft;
  const baseY = liftFloorY(floor);
  const sillH = 0.04;
  const doorH = LIFT_DOOR_H;
  const doorY = baseY + sillH + doorH / 2;
  const open = cabinHere ? doorOpen : 0;
  const leafW = (lift.opening - 0.05) / 2;
  const slide = leafW * 0.98 * open;
  // Lobby face sits just outside wallFace; reveal stays inside the shaft.
  const face = lift.wallFace + intoLobby * 0.018;
  const reveal = lift.wallFace + shaft * 0.055;
  const doorDepth = 0.045;
  const frameDepth = 0.06;
  const jamb = 0.055;
  const headerH = 0.1;
  const isX = lift.doorAxis === "x";

  // Door leaves sit on the lobby plane (intoLobby), not in the shaft.
  const leafAPos = isX
    ? ([face + intoLobby * doorDepth * 0.5, doorY, c.z - leafW / 2 - slide] as const)
    : ([c.x - leafW / 2 - slide, doorY, face + intoLobby * doorDepth * 0.5] as const);
  const leafBPos = isX
    ? ([face + intoLobby * doorDepth * 0.5, doorY, c.z + leafW / 2 + slide] as const)
    : ([c.x + leafW / 2 + slide, doorY, face + intoLobby * doorDepth * 0.5] as const);
  const leafSize = isX
    ? ([doorDepth, doorH, leafW - 0.008] as const)
    : ([leafW - 0.008, doorH, doorDepth] as const);
  const panelInset = isX
    ? ([doorDepth * 0.35, doorH * 0.38, leafW * 0.55] as const)
    : ([leafW * 0.55, doorH * 0.38, doorDepth * 0.35] as const);
  const panelAPos = isX
    ? ([
        face + intoLobby * (doorDepth + 0.002),
        doorY + doorH * 0.12,
        c.z - leafW / 2 - slide,
      ] as const)
    : ([
        c.x - leafW / 2 - slide,
        doorY + doorH * 0.12,
        face + intoLobby * (doorDepth + 0.002),
      ] as const);
  const panelBPos = isX
    ? ([
        face + intoLobby * (doorDepth + 0.002),
        doorY + doorH * 0.12,
        c.z + leafW / 2 + slide,
      ] as const)
    : ([
        c.x + leafW / 2 + slide,
        doorY + doorH * 0.12,
        face + intoLobby * (doorDepth + 0.002),
      ] as const);

  const framePos = face + intoLobby * frameDepth * 0.5;
  const headerY = baseY + sillH + doorH + headerH / 2;
  const call = hallCallWorldPos(lift, floor);
  const callLit = hallLit || cabinHere;
  const faceRot = lobbyFacingRotation(lift);

  const handleCall = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    unlockPointer();
    onCall();
  };

  return (
    <group name={`lift-landing-${lift.id}-${floor}`}>
      {/* One landing light only — N floors × lights caused flicker. */}
      {cabinHere ? (
        <pointLight
          position={
            isX
              ? [face + intoLobby * 0.35, doorY, c.z]
              : [c.x, doorY, face + intoLobby * 0.35]
          }
          intensity={0.85}
          distance={1.8}
          decay={2}
          color="#fff2d8"
        />
      ) : null}

      {/* Reveal plate only when closed — hide when open so cabin reads clearly. */}
      {open < 0.45 ? (
        <mesh
          position={
            isX
              ? ([reveal, doorY, c.z] as const)
              : ([c.x, doorY, reveal] as const)
          }
        >
          <boxGeometry
            args={
              isX
                ? [0.05, doorH + 0.02, lift.opening + 0.02]
                : [lift.opening + 0.02, doorH + 0.02, 0.05]
            }
          />
          <meshStandardMaterial color="#9aa39f" roughness={0.55} metalness={0.15} />
        </mesh>
      ) : null}

      {/* Left / right jambs */}
      <mesh
        position={
          isX
            ? ([framePos, doorY, c.z - lift.opening / 2 - jamb / 2] as const)
            : ([c.x - lift.opening / 2 - jamb / 2, doorY, framePos] as const)
        }
      >
        <boxGeometry
          args={
            isX
              ? [frameDepth, doorH + sillH + 0.02, jamb]
              : [jamb, doorH + sillH + 0.02, frameDepth]
          }
        />
        <meshStandardMaterial color="#c9a45c" roughness={0.32} metalness={0.62} />
      </mesh>
      <mesh
        position={
          isX
            ? ([framePos, doorY, c.z + lift.opening / 2 + jamb / 2] as const)
            : ([c.x + lift.opening / 2 + jamb / 2, doorY, framePos] as const)
        }
      >
        <boxGeometry
          args={
            isX
              ? [frameDepth, doorH + sillH + 0.02, jamb]
              : [jamb, doorH + sillH + 0.02, frameDepth]
          }
        />
        <meshStandardMaterial color="#c9a45c" roughness={0.32} metalness={0.62} />
      </mesh>

      {/* Header bar */}
      <mesh
        position={
          isX
            ? ([framePos, headerY, c.z] as const)
            : ([c.x, headerY, framePos] as const)
        }
      >
        <boxGeometry
          args={
            isX
              ? [frameDepth, headerH, lift.opening + jamb * 2]
              : [lift.opening + jamb * 2, headerH, frameDepth]
          }
        />
        <meshStandardMaterial color="#c9a45c" roughness={0.32} metalness={0.62} />
      </mesh>

      {/* Sill */}
      <mesh
        position={
          isX
            ? ([face + intoLobby * 0.03, baseY + sillH / 2, c.z] as const)
            : ([c.x, baseY + sillH / 2, face + intoLobby * 0.03] as const)
        }
      >
        <boxGeometry
          args={
            isX
              ? [0.1, sillH, lift.opening + jamb * 2]
              : [lift.opening + jamb * 2, sillH, 0.1]
          }
        />
        <meshStandardMaterial color="#9aa19e" roughness={0.55} metalness={0.35} />
      </mesh>

      {/* Sliding door leaves — brushed metal + window panels */}
      <mesh position={[...leafAPos]}>
        <boxGeometry args={[...leafSize]} />
        <meshStandardMaterial color="#7a8480" roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh position={[...leafBPos]}>
        <boxGeometry args={[...leafSize]} />
        <meshStandardMaterial color="#7a8480" roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh position={[...panelAPos]}>
        <boxGeometry args={[...panelInset]} />
        <meshStandardMaterial
          color="#c5d0e0"
          roughness={0.15}
          metalness={0.35}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh position={[...panelBPos]}>
        <boxGeometry args={[...panelInset]} />
        <meshStandardMaterial
          color="#c5d0e0"
          roughness={0.15}
          metalness={0.35}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* Center seam highlight when closed */}
      {open < 0.08 ? (
        <mesh
          position={
            isX
              ? ([face + intoLobby * (doorDepth + 0.006), doorY, c.z] as const)
              : ([c.x, doorY, face + intoLobby * (doorDepth + 0.006)] as const)
          }
        >
          <boxGeometry
            args={isX ? [0.01, doorH * 0.94, 0.016] : [0.016, doorH * 0.94, 0.01]}
          />
          <meshStandardMaterial color="#e2c27a" roughness={0.3} metalness={0.8} />
        </mesh>
      ) : null}

      {/* Floor indicator above door */}
      <mesh
        position={
          isX
            ? ([
                face + intoLobby * (frameDepth * 0.5 + 0.012),
                baseY + sillH + doorH + headerH * 0.45,
                c.z,
              ] as const)
            : ([
                c.x,
                baseY + sillH + doorH + headerH * 0.45,
                face + intoLobby * (frameDepth * 0.5 + 0.012),
              ] as const)
        }
      >
        <boxGeometry args={isX ? [0.02, 0.06, 0.14] : [0.14, 0.06, 0.02]} />
        <meshStandardMaterial
          color={cabinHere ? "#1a3d2a" : "#0d100f"}
          emissive={cabinHere ? "#2dff8a" : "#c9a45c"}
          emissiveIntensity={cabinHere ? 0.55 : 0.25}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* Hall call — lobby face of left jamb; always visible when doors closed */}
      {showHallCall ? (
        <group position={[call.x, call.y, call.z]} rotation={faceRot}>
          <mesh>
            <boxGeometry args={[0.095, 0.175, 0.03]} />
            <meshStandardMaterial
              color="#1a1c1b"
              emissive="#3a3428"
              emissiveIntensity={0.2}
              roughness={0.45}
              metalness={0.35}
            />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <boxGeometry args={[0.08, 0.155, 0.02]} />
            <meshStandardMaterial
              color="#c9a45c"
              emissive="#8a6a28"
              emissiveIntensity={0.25}
              roughness={0.32}
              metalness={0.6}
            />
          </mesh>
          <Text
            position={[0, 0.058, 0.018]}
            fontSize={0.016}
            color="#1a1c1b"
            anchorX="center"
            anchorY="middle"
          >
            CALL
          </Text>
          <group
            position={[0, 0.018, 0.02]}
            onClick={handleCall}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <mesh>
              <boxGeometry args={[0.068, 0.042, 0.014]} />
              <meshStandardMaterial
                color={callLit ? "#1e3d2e" : "#111"}
                emissive={callLit ? "#3dff9a" : "#2a2a2a"}
                emissiveIntensity={callLit ? 0.55 : 0.15}
                roughness={0.4}
                metalness={0.25}
              />
            </mesh>
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.016}
              color={callLit ? "#b8ffe0" : "#f2efe6"}
              anchorX="center"
              anchorY="middle"
            >
              ▲ UP
            </Text>
          </group>
          <group
            position={[0, -0.036, 0.02]}
            onClick={handleCall}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <mesh>
              <boxGeometry args={[0.068, 0.042, 0.014]} />
              <meshStandardMaterial
                color={callLit ? "#1e3d2e" : "#111"}
                emissive={callLit ? "#3dff9a" : "#2a2a2a"}
                emissiveIntensity={callLit ? 0.45 : 0.15}
                roughness={0.4}
                metalness={0.25}
              />
            </mesh>
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.014}
              color={callLit ? "#b8ffe0" : "#f2efe6"}
              anchorX="center"
              anchorY="middle"
            >
              ▼ DOWN
            </Text>
          </group>
        </group>
      ) : null}
    </group>
  );
}

function LiftCabinVisual({
  lift,
  cabinY,
  cabinFloor,
  doorOpen,
  phase,
  destFloor,
  hallLitFloor,
  panelInteractive,
  onHallCall,
  onFloor,
  onOpen,
  onClose,
}: Readonly<{
  lift: WalkLiftDef
  cabinY: number
  cabinFloor: number
  doorOpen: number
  phase: LiftPhase
  destFloor: number | null
  hallLitFloor: number | null
  panelInteractive: boolean
  onHallCall: (floor: number) => void
  onFloor: (floor: number) => void
  onOpen: () => void
  onClose: () => void
}>) {
  const c = liftCenter(lift);
  const shaft = liftShaftSign(lift);
  // Inset from shaft AABB so cabin panels never share a plane with the outer shell.
  const inset = 0.04;
  const wallT = 0.022;
  const x0 = lift.x0 + inset;
  const x1 = lift.x1 - inset;
  const z0 = lift.z0 + inset;
  const z1 = lift.z1 - inset;
  const w = x1 - x0 - wallT * 2;
  const d = z1 - z0 - wallT * 2;
  const cabinMidY = cabinY + LIFT_CABIN_H / 2;
  const isZDoor = lift.doorAxis === "z";
  const depthAlongDoor = isZDoor ? d : w;
  const widthAcross = isZDoor ? w : d;

  const hallFloors = useMemo(
    () =>
      Array.from(
        { length: LIFT_MAX_FLOOR - LIFT_MIN_FLOOR + 1 },
        (_, i) => LIFT_MIN_FLOOR + i,
      ),
    [],
  );

  // Cabin door leaves (inside face) — stay visible in side pockets when open.
  const leafW = (lift.opening - 0.04) / 2;
  const slide = leafW * 0.92 * doorOpen;
  const doorFace = lift.wallFace + shaft * (inset + 0.02);
  const doorH = LIFT_DOOR_H;
  const doorY = cabinY + 0.04 + doorH / 2;
  const leafA = isZDoor
    ? ([c.x - leafW / 2 - slide, doorY, doorFace] as const)
    : ([doorFace, doorY, c.z - leafW / 2 - slide] as const);
  const leafB = isZDoor
    ? ([c.x + leafW / 2 + slide, doorY, doorFace] as const)
    : ([doorFace, doorY, c.z + leafW / 2 + slide] as const);
  const leafSize = isZDoor
    ? ([leafW - 0.006, doorH, 0.03] as const)
    : ([0.03, doorH, leafW - 0.006] as const);

  const backZ = isZDoor
    ? shaft > 0
      ? z1 - wallT / 2
      : z0 + wallT / 2
    : c.z;
  const backX = isZDoor
    ? c.x
    : shaft > 0
      ? x1 - wallT / 2
      : x0 + wallT / 2;

  return (
    <group name={`walk-lift-${lift.id}`}>
      {/* Floor — dark vinyl with metal threshold at the door */}
      <mesh position={[c.x, cabinY + 0.015, c.z]}>
        <boxGeometry args={[Math.max(0.08, w), 0.03, Math.max(0.08, d)]} />
        <meshStandardMaterial color="#3a3f3d" roughness={0.78} metalness={0.12} />
      </mesh>
      <mesh position={[c.x, cabinY + 0.028, c.z]}>
        <boxGeometry
          args={[Math.max(0.06, w * 0.88), 0.008, Math.max(0.06, d * 0.88)]}
        />
        <meshStandardMaterial color="#5c635f" roughness={0.65} metalness={0.08} />
      </mesh>
      <mesh
        position={
          isZDoor
            ? [c.x, cabinY + 0.032, lift.wallFace + shaft * (inset + 0.02)]
            : [lift.wallFace + shaft * (inset + 0.02), cabinY + 0.032, c.z]
        }
      >
        <boxGeometry
          args={
            isZDoor
              ? [lift.opening * 0.9, 0.012, 0.05]
              : [0.05, 0.012, lift.opening * 0.9]
          }
        />
        <meshStandardMaterial color="#b8c0bc" roughness={0.35} metalness={0.65} />
      </mesh>

      {/* Ceiling + recessed light */}
      <mesh position={[c.x, cabinY + LIFT_CABIN_H - 0.015, c.z]}>
        <boxGeometry args={[Math.max(0.08, w), 0.03, Math.max(0.08, d)]} />
        <meshStandardMaterial color="#d8ddd9" roughness={0.55} metalness={0.12} />
      </mesh>
      <mesh position={[c.x, cabinY + LIFT_CABIN_H - 0.028, c.z]}>
        <boxGeometry
          args={[
            Math.max(0.06, widthAcross * 0.55),
            0.012,
            Math.max(0.06, depthAlongDoor * 0.35),
          ]}
        />
        <meshStandardMaterial
          color="#fff6e4"
          emissive="#ffe7b0"
          emissiveIntensity={0.7}
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>
      <pointLight
        position={[c.x, cabinY + LIFT_CABIN_H - 0.1, c.z]}
        intensity={1.25}
        distance={2.2}
        decay={2}
        color="#fff2d6"
      />

      {/* Back wall — darker panel + mirror strip for depth */}
      <mesh position={[backX, cabinMidY, backZ]}>
        <boxGeometry
          args={
            isZDoor
              ? [Math.max(0.08, w), LIFT_CABIN_H - 0.06, wallT]
              : [wallT, LIFT_CABIN_H - 0.06, Math.max(0.08, d)]
          }
        />
        <meshStandardMaterial color="#6e7672" roughness={0.48} metalness={0.28} />
      </mesh>
      <mesh
        position={
          isZDoor
            ? [
                backX,
                cabinMidY + 0.06,
                backZ + (shaft > 0 ? -wallT * 0.6 - 0.002 : wallT * 0.6 + 0.002),
              ]
            : [
                backX + (shaft > 0 ? -wallT * 0.6 - 0.002 : wallT * 0.6 + 0.002),
                cabinMidY + 0.06,
                backZ,
              ]
        }
      >
        <boxGeometry
          args={
            isZDoor
              ? [Math.max(0.06, w * 0.72), LIFT_CABIN_H * 0.42, 0.01]
              : [0.01, LIFT_CABIN_H * 0.42, Math.max(0.06, d * 0.72)]
          }
        />
        <meshStandardMaterial
          color="#c5d0dc"
          roughness={0.18}
          metalness={0.55}
        />
      </mesh>

      {/* Side walls (never seal the door face) */}
      {isZDoor ? (
        <>
          <mesh position={[x0 + wallT / 2, cabinMidY, c.z]}>
            <boxGeometry args={[wallT, LIFT_CABIN_H - 0.06, Math.max(0.08, d)]} />
            <meshStandardMaterial color="#c4b8a4" roughness={0.62} metalness={0.08} />
          </mesh>
          <mesh position={[x1 - wallT / 2, cabinMidY, c.z]}>
            <boxGeometry args={[wallT, LIFT_CABIN_H - 0.06, Math.max(0.08, d)]} />
            <meshStandardMaterial color="#c4b8a4" roughness={0.62} metalness={0.08} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[c.x, cabinMidY, z0 + wallT / 2]}>
            <boxGeometry args={[Math.max(0.08, w), LIFT_CABIN_H - 0.06, wallT]} />
            <meshStandardMaterial color="#c4b8a4" roughness={0.62} metalness={0.08} />
          </mesh>
          <mesh position={[c.x, cabinMidY, z1 - wallT / 2]}>
            <boxGeometry args={[Math.max(0.08, w), LIFT_CABIN_H - 0.06, wallT]} />
            <meshStandardMaterial color="#c4b8a4" roughness={0.62} metalness={0.08} />
          </mesh>
        </>
      )}

      {/* Door-side interior returns (pockets) — clear of landing door leaves */}
      {isZDoor ? (
        <>
          <mesh
            position={[
              c.x - lift.opening / 2 - 0.05,
              doorY,
              lift.wallFace + shaft * (inset + 0.06),
            ]}
          >
            <boxGeometry args={[0.06, doorH + 0.04, 0.08]} />
            <meshStandardMaterial color="#8a918d" roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh
            position={[
              c.x + lift.opening / 2 + 0.05,
              doorY,
              lift.wallFace + shaft * (inset + 0.06),
            ]}
          >
            <boxGeometry args={[0.06, doorH + 0.04, 0.08]} />
            <meshStandardMaterial color="#8a918d" roughness={0.45} metalness={0.4} />
          </mesh>
        </>
      ) : (
        <>
          <mesh
            position={[
              lift.wallFace + shaft * (inset + 0.06),
              doorY,
              c.z - lift.opening / 2 - 0.05,
            ]}
          >
            <boxGeometry args={[0.08, doorH + 0.04, 0.06]} />
            <meshStandardMaterial color="#8a918d" roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh
            position={[
              lift.wallFace + shaft * (inset + 0.06),
              doorY,
              c.z + lift.opening / 2 + 0.05,
            ]}
          >
            <boxGeometry args={[0.08, doorH + 0.04, 0.06]} />
            <meshStandardMaterial color="#8a918d" roughness={0.45} metalness={0.4} />
          </mesh>
        </>
      )}

      {/* Cabin-side door leaves — slightly inside landing leaves to avoid z-fight */}
      <mesh position={[...leafA]}>
        <boxGeometry args={[...leafSize]} />
        <meshStandardMaterial
          color="#9aa3a0"
          roughness={0.28}
          metalness={0.7}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <mesh position={[...leafB]}>
        <boxGeometry args={[...leafSize]} />
        <meshStandardMaterial
          color="#9aa3a0"
          roughness={0.28}
          metalness={0.7}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Chrome handrails on side + back walls */}
      {isZDoor ? (
        <>
          <mesh position={[x0 + wallT + 0.018, cabinY + HALL_CALL_HEIGHT * 0.85, c.z]}>
            <boxGeometry args={[0.016, 0.016, Math.max(0.08, d * 0.65)]} />
            <meshStandardMaterial color="#d7dde0" roughness={0.22} metalness={0.85} />
          </mesh>
          <mesh position={[x1 - wallT - 0.018, cabinY + HALL_CALL_HEIGHT * 0.85, c.z]}>
            <boxGeometry args={[0.016, 0.016, Math.max(0.08, d * 0.65)]} />
            <meshStandardMaterial color="#d7dde0" roughness={0.22} metalness={0.85} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[c.x, cabinY + HALL_CALL_HEIGHT * 0.85, z0 + wallT + 0.018]}>
            <boxGeometry args={[Math.max(0.08, w * 0.65), 0.016, 0.016]} />
            <meshStandardMaterial color="#d7dde0" roughness={0.22} metalness={0.85} />
          </mesh>
          <mesh position={[c.x, cabinY + HALL_CALL_HEIGHT * 0.85, z1 - wallT - 0.018]}>
            <boxGeometry args={[Math.max(0.08, w * 0.65), 0.016, 0.016]} />
            <meshStandardMaterial color="#d7dde0" roughness={0.22} metalness={0.85} />
          </mesh>
        </>
      )}
      <mesh
        position={
          isZDoor
            ? [c.x, cabinY + HALL_CALL_HEIGHT * 0.85, backZ + (shaft > 0 ? -0.028 : 0.028)]
            : [backX + (shaft > 0 ? -0.028 : 0.028), cabinY + HALL_CALL_HEIGHT * 0.85, c.z]
        }
      >
        <boxGeometry
          args={
            isZDoor
              ? [Math.max(0.08, w * 0.6), 0.016, 0.016]
              : [0.016, 0.016, Math.max(0.08, d * 0.6)]
          }
        />
        <meshStandardMaterial color="#d7dde0" roughness={0.22} metalness={0.85} />
      </mesh>

      {/* Corner posts — inset so they don't coplanar with walls */}
      {(
        [
          [x0 + 0.03, z0 + 0.03],
          [x0 + 0.03, z1 - 0.03],
          [x1 - 0.03, z0 + 0.03],
          [x1 - 0.03, z1 - 0.03],
        ] as const
      ).map(([px, pz], i) => (
        <mesh key={`post-${i}`} position={[px, cabinMidY, pz]}>
          <boxGeometry args={[0.02, LIFT_CABIN_H - 0.08, 0.02]} />
          <meshStandardMaterial color="#c9a45c" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}

      <CabinWallPanel
        lift={lift}
        cabinY={cabinY}
        currentFloor={cabinFloor}
        destFloor={destFloor}
        doorOpen={doorOpen}
        phase={phase}
        interactive={panelInteractive}
        onFloor={onFloor}
        onOpen={onOpen}
        onClose={onClose}
      />

      {/* Landing portals — hide hall CALL when this cabin's doors are open */}
      {hallFloors.map((floor) => (
        <LandingFacade
          key={`facade-${floor}`}
          lift={lift}
          floor={floor}
          doorOpen={doorOpen}
          cabinHere={floor === cabinFloor}
          hallLit={hallLitFloor === floor}
          showHallCall
          onCall={() => onHallCall(floor)}
        />
      ))}
    </group>
  );
}

type ActiveRide = {
  liftId: string
  phase: LiftPhase
  cabinFloor: number
  cabinY: number
  doorOpen: number
  targetFloor: number | null
  rider: boolean
  holdOpen: number
  hallLitFloor: number | null
};

function initialRides(): Record<string, ActiveRide> {
  const out: Record<string, ActiveRide> = {};
  for (const lift of WALK_LIFTS) {
    out[lift.id] = {
      liftId: lift.id,
      phase: "idle",
      // Start at ground so the lobby portal is visible when walking up.
      cabinFloor: 0,
      cabinY: liftFloorY(0),
      doorOpen: 0,
      targetFloor: null,
      rider: false,
      holdOpen: 0,
      hallLitFloor: null,
    };
  }
  return out;
}

export function WalkLifts({
  playerRef,
  rideControlRef,
  prompt,
  setPrompt,
  panelLiftId,
  setPanelLiftId,
}: Readonly<{
  playerRef: RefObject<{ x: number; y: number; z: number } | null>
  rideControlRef: RefObject<LiftRideControl>
  prompt: string | null
  setPrompt: Dispatch<SetStateAction<string | null>>
  panelLiftId: string | null
  setPanelLiftId: Dispatch<SetStateAction<string | null>>
}>) {
  const { camera } = useThree();
  const rides = useRef(initialRides());
  const [tick, setTick] = useState(0);
  const extCam = useRef(false);
  const look = useMemo(() => new Vector3(), []);
  const camGoal = useMemo(() => new Vector3(), []);
  const [nearHall, setNearHall] = useState<{
    liftId: string
    floor: number
  } | null>(null);

  useFrame((_, dt) => {
    const player = playerRef.current;
    let traveling = false;
    let locked = false;
    let holdRider = false;
    let cabinHold: LiftRideControl["cabinHold"] = null;
    let activeTravelId: string | null = null;
    let promptText: string | null = null;
    let showPanel: string | null = null;
    let hallNear: { liftId: string; floor: number } | null = null;
    let inCabin = false;
    let cabinBounds: LiftRideControl["cabinBounds"] = null;

    for (const lift of WALK_LIFTS) {
      const ride = rides.current[lift.id];
      const c = liftCenter(lift);

      if (ride.phase === "doorsOpening") {
        ride.doorOpen = Math.min(1, ride.doorOpen + DOOR_SPEED * dt);
        if (ride.doorOpen >= 1) {
          ride.phase = "doorsOpen";
          ride.holdOpen = ride.rider ? 20 : 8;
          ride.hallLitFloor = null;
        }
      } else if (ride.phase === "doorsClosing") {
        ride.doorOpen = Math.max(0, ride.doorOpen - DOOR_SPEED * dt);
        if (ride.doorOpen <= 0) {
          if (ride.targetFloor != null && ride.rider) {
            ride.phase = "traveling";
          } else {
            ride.phase = "idle";
            if (!ride.rider) ride.targetFloor = null;
          }
        }
      } else if (ride.phase === "traveling" && ride.targetFloor != null) {
        const destY = liftFloorY(ride.targetFloor);
        const dir = Math.sign(destY - ride.cabinY) || 0;
        ride.cabinY += dir * CABIN_SPEED * dt;
        if (
          dir === 0 ||
          (dir > 0 && ride.cabinY >= destY) ||
          (dir < 0 && ride.cabinY <= destY)
        ) {
          ride.cabinY = destY;
          ride.cabinFloor = ride.targetFloor;
          ride.phase = "arriving";
          ride.targetFloor = null;
        }
      } else if (ride.phase === "arriving") {
        ride.phase = "doorsOpening";
      } else if (ride.phase === "doorsOpen") {
        if (player) {
          const inCabin = insideLiftCabin(
            lift,
            player.x,
            player.z,
            player.y,
            ride.cabinY,
          );
          if (inCabin) {
            ride.rider = true;
            showPanel = lift.id;
            ride.holdOpen = Math.max(ride.holdOpen, 4);
            promptText = "Use wall panel — floors · OPEN · CLOSE";
          } else if (ride.rider && !inCabin) {
            ride.rider = false;
            if (ride.holdOpen <= 0) ride.phase = "doorsClosing";
          } else {
            ride.holdOpen -= dt;
            if (!ride.rider && ride.holdOpen <= 0) ride.phase = "doorsClosing";
          }
        } else {
          ride.holdOpen -= dt;
          if (ride.holdOpen <= 0 && !ride.rider) ride.phase = "doorsClosing";
        }
      } else if (ride.phase === "called" && ride.targetFloor != null) {
        const destY = liftFloorY(ride.targetFloor);
        if (Math.abs(ride.cabinY - destY) < 0.02) {
          ride.cabinY = destY;
          ride.cabinFloor = ride.targetFloor;
          ride.targetFloor = null;
          ride.phase = "doorsOpening";
        } else {
          const destFloor = ride.targetFloor;
          const dir = Math.sign(destY - ride.cabinY);
          ride.cabinY += dir * CABIN_SPEED * dt;
          if (
            (dir > 0 && ride.cabinY >= destY) ||
            (dir < 0 && ride.cabinY <= destY)
          ) {
            ride.cabinY = destY;
            ride.cabinFloor = destFloor;
            ride.targetFloor = null;
            ride.phase = "doorsOpening";
          }
        }
      }

      setLiftOpening({
        id: lift.id,
        cabinY: ride.cabinY,
        doorOpen: ride.doorOpen,
        rider: ride.rider,
      });

      if (ride.phase === "traveling" && ride.rider) {
        traveling = true;
        locked = true;
        holdRider = true;
        activeTravelId = lift.id;
        cabinHold = { x: c.x, z: c.z, y: ride.cabinY };
      } else if (
        ride.rider &&
        (ride.phase === "doorsClosing" ||
          ride.phase === "doorsOpening" ||
          ride.phase === "arriving")
      ) {
        locked = true;
        holdRider = true;
        cabinHold = { x: c.x, z: c.z, y: ride.cabinY };
      }

      if (player && !traveling && nearLiftCall(lift, player.x, player.z, player.y)) {
        const floor = nearestLiftFloor(player.y);
        hallNear = { liftId: lift.id, floor };
        if (ride.phase === "doorsOpen" && ride.cabinFloor === floor) {
          promptText = promptText ?? "Walk in · use the wall floor panel";
        } else {
          promptText = `Click UP / DOWN on the wall · or press E — ${lift.label}`;
        }
      }

      if (
        player &&
        insideLiftCabin(lift, player.x, player.z, player.y, ride.cabinY)
      ) {
        inCabin = true;
        cabinBounds = {
          x0: lift.x0 + 0.04,
          x1: lift.x1 - 0.04,
          z0: lift.z0 + 0.04,
          z1: lift.z1 - 0.04,
          y0: ride.cabinY,
          y1: ride.cabinY + LIFT_CABIN_H - 0.04,
        };
        if (
          ride.rider &&
          (ride.phase === "doorsOpen" ||
            ride.phase === "doorsOpening" ||
            ride.phase === "doorsClosing")
        ) {
          showPanel = lift.id;
        }
      }
    }

    rideControlRef.current = {
      traveling,
      locked,
      cabinY: cabinHold?.y ?? cabinBounds?.y0 ?? 0,
      liftId: activeTravelId,
      holdRider,
      cabinHold,
      inCabin,
      cabinBounds,
    };

    if (traveling && activeTravelId) {
      const lift = WALK_LIFTS.find((l) => l.id === activeTravelId)!;
      const ride = rides.current[activeTravelId];
      const pose = exteriorCamPose(lift, ride.cabinY);
      if (!extCam.current) {
        camera.position.copy(pose.cam);
        extCam.current = true;
      } else {
        camGoal.copy(pose.cam);
        camera.position.x = MathUtils.damp(camera.position.x, camGoal.x, 4, dt);
        camera.position.y = MathUtils.damp(camera.position.y, camGoal.y, 4, dt);
        camera.position.z = MathUtils.damp(camera.position.z, camGoal.z, 4, dt);
      }
      look.copy(pose.look);
      camera.lookAt(look);
    } else if (extCam.current) {
      extCam.current = false;
    }

    setPrompt((prev) => (prev === promptText ? prev : promptText));
    setPanelLiftId((prev) => (prev === showPanel ? prev : showPanel));
    setNearHall((prev) => {
      if (!hallNear && !prev) return prev;
      if (
        prev &&
        hallNear &&
        prev.liftId === hallNear.liftId &&
        prev.floor === hallNear.floor
      ) {
        return prev;
      }
      return hallNear;
    });

    setTick((n) => (n + 1) % 100000);
  });

  useEffect(() => {
    return () => {
      for (const lift of WALK_LIFTS) setLiftOpening(null, lift.id);
    };
  }, []);

  const callLift = (liftId: string, floor: number) => {
    const ride = rides.current[liftId];
    if (ride.phase !== "idle" && ride.phase !== "doorsOpen") return;
    const dest = clampLiftFloor(floor);
    ride.hallLitFloor = dest;
    if (
      ride.cabinFloor === dest &&
      Math.abs(ride.cabinY - liftFloorY(dest)) < 0.05
    ) {
      if (ride.doorOpen < 0.9) ride.phase = "doorsOpening";
      ride.targetFloor = null;
      return;
    }
    ride.targetFloor = dest;
    ride.phase = "called";
    ride.rider = false;
  };

  const requestFloor = (liftId: string, floor: number) => {
    const ride = rides.current[liftId];
    if (!ride.rider) return;
    if (ride.phase === "traveling" || ride.phase === "called") return;
    const dest = clampLiftFloor(floor);
    if (dest === ride.cabinFloor && ride.doorOpen > 0.5) return;
    ride.targetFloor = dest;
    if (dest === ride.cabinFloor) {
      // Already here — just ensure doors open.
      ride.phase = "doorsOpening";
      ride.targetFloor = null;
      return;
    }
    ride.phase = "doorsClosing";
  };

  const openDoors = (liftId: string) => {
    const ride = rides.current[liftId];
    if (ride.phase === "traveling" || ride.phase === "called") return;
    if (ride.doorOpen >= 0.95) return;
    ride.phase = "doorsOpening";
  };

  const closeDoors = (liftId: string) => {
    const ride = rides.current[liftId];
    if (ride.phase === "traveling" || ride.phase === "called") return;
    if (ride.doorOpen <= 0.05) return;
    // Close then travel if a floor was already chosen.
    ride.phase = "doorsClosing";
    ride.holdOpen = 0;
  };

  const nearHallRef = useRef(nearHall);
  nearHallRef.current = nearHall;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "e") return;
      const hall = nearHallRef.current;
      if (!hall) return;
      callLift(hall.liftId, hall.floor);
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playerRef]);

  useEffect(() => {
    if ((panelLiftId || nearHall) && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [panelLiftId, nearHall]);

  void tick;

  return (
    <group name="walk-lifts">
      {WALK_LIFTS.map((lift) => {
        const ride = rides.current[lift.id];
        return (
          <LiftCabinVisual
            key={lift.id}
            lift={lift}
            cabinY={ride.cabinY}
            cabinFloor={ride.cabinFloor}
            doorOpen={ride.doorOpen}
            phase={ride.phase}
            destFloor={ride.targetFloor}
            hallLitFloor={ride.hallLitFloor}
            panelInteractive={ride.rider || panelLiftId === lift.id}
            onHallCall={(floor) => callLift(lift.id, floor)}
            onFloor={(floor) => requestFloor(lift.id, floor)}
            onOpen={() => openDoors(lift.id)}
            onClose={() => closeDoors(lift.id)}
          />
        );
      })}

      {prompt ? (
        <Html fullscreen style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "12%",
              transform: "translateX(-50%)",
              background: "rgba(20,22,20,0.78)",
              color: "#f2ebe0",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 14,
              letterSpacing: "0.02em",
              border: "1px solid rgba(201,164,92,0.4)",
              ...panelFont,
            }}
          >
            {prompt}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
