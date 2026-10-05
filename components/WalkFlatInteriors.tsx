"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState, type RefObject } from "react";
import type { Mesh } from "three";
import { cadPlanForFlat, type CadPlan, type CadRoomKind } from "@/lib/plans/cad";
import {
  FLAT_WALL_H,
  FLAT_WALL_T,
  flatFloorY,
  planRectWorld,
  stackPose,
  wallSegmentWorld,
} from "@/lib/planWorld";
import {
  WALKABLE_STACK_IDS,
  cutWallSegByGaps,
  getFlatEntranceDoors,
  getFlatEntranceGaps,
  nearestWalkFlatFloor,
  setWalkFlatFloorHint,
  type FlatEntranceDoor,
} from "@/lib/walkFlatInterior";

const CAD_FILL: Record<CadRoomKind, string> = {
  room: "#f7f1e4",
  wet: "#dce4ea",
  balcony: "#d4c19a",
  utility: "#eee4d2",
  corridor: "#e4e0d6",
};

const DOOR_H = 0.72;
const DOOR_T = 0.028;
const FRAME_T = 0.012;
const CEIL_T = 0.04;

function EntranceDoorMesh({
  door,
  floor,
}: Readonly<{
  door: FlatEntranceDoor
  floor: number
}>) {
  const base = flatFloorY(floor);
  const doorY = base + DOOR_H / 2;
  const open = 0.82; // radians — leaf swung into the flat
  const leafW = Math.max(door.width - 0.05, 0.16);
  // Hinge at the +along end of the opening; leaf swings inward (−doorDir).
  if (door.alongZ) {
    const hingeZ = door.z + door.width / 2 - 0.02;
    const wallX = door.x + door.doorDir * (FRAME_T / 2);
    const leafX = door.x - door.doorDir * (DOOR_T * 0.35);
    return (
      <group name={`entrance-${door.stackId}`}>
        <mesh position={[wallX, doorY, door.z]}>
          <boxGeometry args={[FRAME_T, DOOR_H + 0.035, door.width]} />
          <meshStandardMaterial color="#c9a45c" roughness={0.38} metalness={0.45} />
        </mesh>
        <group position={[leafX, doorY, hingeZ]} rotation={[0, -door.doorDir * open, 0]}>
          <mesh position={[0, 0, -leafW / 2]}>
            <boxGeometry args={[DOOR_T, DOOR_H, leafW]} />
            <meshStandardMaterial color="#4a3014" roughness={0.55} metalness={0.08} />
          </mesh>
        </group>
      </group>
    );
  }
  const hingeX = door.x + door.width / 2 - 0.02;
  const wallZ = door.z + door.doorDir * (FRAME_T / 2);
  const leafZ = door.z - door.doorDir * (DOOR_T * 0.35);
  return (
    <group name={`entrance-${door.stackId}`}>
      <mesh position={[door.x, doorY, wallZ]}>
        <boxGeometry args={[door.width, DOOR_H + 0.035, FRAME_T]} />
        <meshStandardMaterial color="#c9a45c" roughness={0.38} metalness={0.45} />
      </mesh>
      <group position={[hingeX, doorY, leafZ]} rotation={[0, door.doorDir * open, 0]}>
        <mesh position={[-leafW / 2, 0, 0]}>
          <boxGeometry args={[leafW, DOOR_H, DOOR_T]} />
          <meshStandardMaterial color="#4a3014" roughness={0.55} metalness={0.08} />
        </mesh>
      </group>
    </group>
  );
}

function StackCeiling({
  stackId,
  floor,
  hideCeilingRef,
}: Readonly<{
  stackId: string
  floor: number
  /** When true, camera is above — hide ceiling (no transparency; avoids flash). */
  hideCeilingRef: RefObject<boolean>
}>) {
  const meshRef = useRef<Mesh>(null);
  const pose = stackPose(stackId);
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const hide = hideCeilingRef.current ?? false;
    if (mesh.visible === !hide) return;
    mesh.visible = !hide;
  });
  if (!pose) return null;
  // Sit just under wall tops — clear of the floor slab above.
  const y = flatFloorY(floor) + FLAT_WALL_H - CEIL_T / 2 - 0.01;
  const inset = 0.04;
  return (
    <mesh
      ref={meshRef}
      name={`flat-ceiling-${stackId}`}
      position={[pose.flatX, y, pose.flatZ]}
      raycast={() => null}
    >
      <boxGeometry
        args={[pose.unitW - inset * 2, CEIL_T, pose.unitD - inset * 2]}
      />
      <meshStandardMaterial color="#f3ebe0" roughness={0.92} />
    </mesh>
  );
}

function StackInterior({
  stackId,
  floor,
  plan,
  door,
  hideCeilingRef,
}: {
  stackId: string
  floor: number
  plan: CadPlan
  door: FlatEntranceDoor | null
  hideCeilingRef: RefObject<boolean>
}) {
  const walls = useMemo(() => {
    const out: {
      key: string
      x: number
      y: number
      z: number
      sx: number
      sy: number
      sz: number
      outer?: boolean
    }[] = [];
    const gaps = getFlatEntranceGaps().filter((g) => g.stackId === stackId);
    plan.walls.forEach((wall, index) => {
      const seg = wallSegmentWorld(stackId, plan.extent, wall, floor);
      if (!seg) return;
      const pieces = cutWallSegByGaps(seg.x0, seg.z0, seg.x1, seg.z1, gaps);
      pieces.forEach((piece, pieceIndex) => {
        const len = Math.hypot(piece.x1 - piece.x0, piece.z1 - piece.z0);
        if (len < 0.04) return;
        const alongX = Math.abs(piece.z1 - piece.z0) < 1e-4;
        out.push({
          key: `${stackId}-w-${index}-${pieceIndex}`,
          x: (piece.x0 + piece.x1) / 2,
          y: seg.y + FLAT_WALL_H / 2,
          z: (piece.z0 + piece.z1) / 2,
          sx: alongX ? len : FLAT_WALL_T,
          sy: FLAT_WALL_H,
          sz: alongX ? FLAT_WALL_T : len,
          outer: wall.outer,
        });
      });
    });
    return out;
  }, [stackId, floor, plan]);

  const rooms = useMemo(() => {
    return plan.rooms
      .map((room) => {
        const box = planRectWorld(
          stackId,
          plan.extent,
          room.x,
          room.y,
          room.w,
          room.h,
          floor,
        );
        if (!box) return null;
        return { room, box };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [stackId, floor, plan]);

  return (
    <group name={`flat-interior-${stackId}-f${floor}`}>
      {rooms.map(({ room, box }) => {
        const balcony = room.kind === "balcony";
        return (
          <mesh
            key={room.id}
            position={[box.x, box.y + (balcony ? 0.01 : 0.03), box.z]}
            receiveShadow
          >
            <boxGeometry args={[box.w, balcony ? 0.04 : 0.06, box.d]} />
            <meshStandardMaterial
              color={CAD_FILL[room.kind]}
              roughness={balcony ? 0.7 : 0.9}
            />
          </mesh>
        );
      })}
      {walls.map((wall) => (
        <mesh key={wall.key} position={[wall.x, wall.y, wall.z]}>
          <boxGeometry args={[wall.sx, wall.sy, wall.sz]} />
          <meshStandardMaterial
            color={wall.outer ? "#f4ebda" : "#efe6d4"}
            roughness={0.82}
          />
        </mesh>
      ))}
      {door ? <EntranceDoorMesh door={door} floor={floor} /> : null}
      <StackCeiling
        stackId={stackId}
        floor={floor}
        hideCeilingRef={hideCeilingRef}
      />
    </group>
  );
}

/**
 * Designed CAD interiors for the walker's current floor (LOD).
 * Collision for all floors is registered in walkCollision.
 */
export function WalkFlatInteriors({
  playerRef,
}: Readonly<{
  playerRef: RefObject<{ x: number; y: number; z: number } | null>
}>) {
  const { camera } = useThree();
  const [floor, setFloor] = useState(1);
  const hideCeilingRef = useRef(false);
  const floorStickyRef = useRef(1);

  useFrame(() => {
    const player = playerRef.current;
    if (!player) return;
    // Hysteresis so mid-stair Y does not flip UnitMesh / interiors every frame.
    const nearest = nearestWalkFlatFloor(player.y);
    const sticky = floorStickyRef.current;
    let next = sticky;
    if (nearest !== sticky) {
      const deck = flatFloorY(nearest);
      if (Math.abs(player.y - deck) + 0.12 < Math.abs(player.y - flatFloorY(sticky))) {
        next = nearest;
        floorStickyRef.current = nearest;
      }
    }
    setWalkFlatFloorHint(next);
    setFloor((prev) => (prev === next ? prev : next));

    // Hide ceiling when camera is clearly above it (no transparent materials).
    const ceilY = flatFloorY(next) + FLAT_WALL_H - 0.02;
    const above = camera.position.y > ceilY + 0.04;
    const below = camera.position.y < ceilY - 0.08;
    if (above) hideCeilingRef.current = true;
    else if (below) hideCeilingRef.current = false;
  });

  const doorsByStack = useMemo(() => {
    const map = new Map<string, FlatEntranceDoor>();
    // B3 / A4 / A8 already have layout-authored door meshes in Building3DView.
    const skip = new Set(["B3", "A4", "A8"]);
    for (const door of getFlatEntranceDoors()) {
      if (skip.has(door.stackId)) continue;
      map.set(door.stackId, door);
    }
    return map;
  }, []);

  const stacks = useMemo(() => {
    return WALKABLE_STACK_IDS.map((stackId) => {
      const wing = stackId[0];
      const unit = Number(stackId.slice(1));
      const plan = cadPlanForFlat({ wing, unit });
      return plan ? { stackId, plan } : null;
    }).filter((item): item is { stackId: string; plan: CadPlan } => item != null);
  }, []);

  return (
    <group name="walk-flat-interiors">
      {stacks.map(({ stackId, plan }) => (
        <StackInterior
          key={`${stackId}-${floor}`}
          stackId={stackId}
          floor={floor}
          plan={plan}
          door={doorsByStack.get(stackId) ?? null}
          hideCeilingRef={hideCeilingRef}
        />
      ))}
    </group>
  );
}
