"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  edgesForPlan,
  lintelsForPlan,
  planForFlat,
  type FlatPlan,
  type FlatPlanInput,
  type PlanFurnish,
  type PlanOpening,
  type PlanRoom,
} from "@/lib/flatPlan";

const SCALE = 0.07;
const WALL_H = 1.28;
const WALL_T = 0.055;
const DOOR_H = 0.98;
const FLOOR_Y = 0.04;

const FLOOR: Record<PlanRoom["kind"], string> = {
  room: "#efe4cf",
  foyer: "#e7d8bc",
  wet: "#c5d0d8",
  balcony: "#c4a56a",
};

function world(plan: FlatPlan, x: number, y: number, w: number, h: number) {
  return {
    x: (x + w / 2 - plan.width / 2) * SCALE,
    z: (y + h / 2 - plan.height / 2) * SCALE,
    w: Math.max(w * SCALE, 0.02),
    d: Math.max(h * SCALE, 0.02),
  };
}

function FloorSlab({ room, plan }: { room: PlanRoom; plan: FlatPlan }) {
  const box = world(plan, room.x, room.y, room.w, room.h);
  const balcony = room.kind === "balcony";
  return (
    <mesh position={[box.x, balcony ? -0.02 : FLOOR_Y, box.z]} receiveShadow>
      <boxGeometry args={[box.w, balcony ? 0.05 : 0.08, box.d]} />
      <meshStandardMaterial
        color={FLOOR[room.kind]}
        roughness={balcony ? 0.7 : 0.9}
      />
    </mesh>
  );
}

function WallRun({ plan }: { plan: FlatPlan }) {
  const edges = edgesForPlan(plan);
  return (
    <group>
      {edges.map((edge, index) => {
        const horizontal = Math.abs(edge.y1 - edge.y2) < 0.2;
        const length = horizontal
          ? Math.abs(edge.x2 - edge.x1)
          : Math.abs(edge.y2 - edge.y1);
        const box = world(
          plan,
          horizontal ? Math.min(edge.x1, edge.x2) : edge.x1 - 0.4,
          horizontal ? edge.y1 - 0.4 : Math.min(edge.y1, edge.y2),
          horizontal ? length : 0.8,
          horizontal ? 0.8 : length,
        );
        return (
          <mesh
            key={`${edge.x1}-${edge.y1}-${index}`}
            position={[box.x, WALL_H / 2, box.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[
                horizontal ? box.w : WALL_T,
                WALL_H,
                horizontal ? WALL_T : box.d,
              ]}
            />
            <meshStandardMaterial
              color={edge.outer ? "#f4ebda" : "#efe6d4"}
              roughness={0.82}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function DoorLintel({ hole, plan }: { hole: PlanOpening; plan: FlatPlan }) {
  const box = world(plan, hole.x, hole.y, hole.w, hole.h);
  const lintelH = WALL_H - DOOR_H;
  return (
    <mesh position={[box.x, DOOR_H + lintelH / 2, box.z]} castShadow>
      <boxGeometry
        args={[
          Math.max(box.w, WALL_T * 1.4),
          lintelH,
          Math.max(box.d, WALL_T * 1.4),
        ]}
      />
      <meshStandardMaterial color="#e8dcc4" roughness={0.8} />
    </mesh>
  );
}

function WindowPane({ hole, plan }: { hole: PlanOpening; plan: FlatPlan }) {
  const box = world(plan, hole.x, hole.y, hole.w, hole.h);
  return (
    <group>
      <mesh position={[box.x, 0.72, box.z]}>
        <boxGeometry
          args={[
            Math.max(box.w, 0.03),
            0.62,
            Math.max(box.d, 0.03),
          ]}
        />
        <meshStandardMaterial
          color="#9ec4d4"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[box.x, 1.1, box.z]}>
        <boxGeometry
          args={[
            Math.max(box.w, WALL_T),
            WALL_H - 1.1,
            Math.max(box.d, WALL_T),
          ]}
        />
        <meshStandardMaterial color="#f0e6d2" />
      </mesh>
    </group>
  );
}

function Furniture({ piece, plan }: { piece: PlanFurnish; plan: FlatPlan }) {
  const box = world(plan, piece.x, piece.y, piece.w, piece.h);
  if (piece.kind === "bed") {
    return (
      <group position={[box.x, 0, box.z]}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <boxGeometry args={[box.w, 0.16, box.d]} />
          <meshStandardMaterial color="#8a6a40" />
        </mesh>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[box.w * 0.94, 0.1, box.d * 0.9]} />
          <meshStandardMaterial color="#e8d5a3" />
        </mesh>
        <mesh position={[0, 0.34, -box.d * 0.28]} castShadow>
          <boxGeometry args={[box.w * 0.86, 0.08, box.d * 0.22]} />
          <meshStandardMaterial color="#f7f2e6" />
        </mesh>
      </group>
    );
  }
  if (piece.kind === "sofa") {
    return (
      <group position={[box.x, 0, box.z]}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[box.w, 0.18, box.d]} />
          <meshStandardMaterial color="#3f564c" />
        </mesh>
        <mesh position={[0, 0.28, -box.d * 0.32]} castShadow>
          <boxGeometry args={[box.w, 0.26, box.d * 0.28]} />
          <meshStandardMaterial color="#4f675c" />
        </mesh>
      </group>
    );
  }
  if (piece.kind === "table") {
    return (
      <mesh position={[box.x, 0.28, box.z]} castShadow>
        <boxGeometry args={[box.w, 0.06, box.d]} />
        <meshStandardMaterial color="#b08948" roughness={0.45} />
      </mesh>
    );
  }
  if (piece.kind === "chair") {
    return (
      <mesh position={[box.x, 0.18, box.z]} castShadow>
        <boxGeometry args={[box.w, 0.2, box.d]} />
        <meshStandardMaterial color="#c4a56a" />
      </mesh>
    );
  }
  if (piece.kind === "wardrobe") {
    return (
      <mesh position={[box.x, 0.58, box.z]} castShadow>
        <boxGeometry args={[box.w, 1.05, box.d]} />
        <meshStandardMaterial color="#8a6a40" />
      </mesh>
    );
  }
  if (piece.kind === "wc") {
    return (
      <mesh position={[box.x, 0.16, box.z]}>
        <cylinderGeometry args={[box.w * 0.35, box.w * 0.35, 0.22, 12]} />
        <meshStandardMaterial color="#f4f1ea" />
      </mesh>
    );
  }
  if (piece.kind === "basin") {
    return (
      <mesh position={[box.x, 0.32, box.z]}>
        <boxGeometry args={[box.w, 0.08, box.d]} />
        <meshStandardMaterial color="#f4f1ea" />
      </mesh>
    );
  }
  if (piece.kind === "stove") {
    return (
      <mesh position={[box.x, 0.34, box.z]}>
        <boxGeometry args={[box.w, 0.08, box.d]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
    );
  }
  return (
    <mesh position={[box.x, 0.28, box.z]} castShadow>
      <boxGeometry args={[box.w, 0.36, box.d]} />
      <meshStandardMaterial color="#c9895a" />
    </mesh>
  );
}

function BalconyRail({ room, plan }: { room: PlanRoom; plan: FlatPlan }) {
  const box = world(plan, room.x, room.y, room.w, room.h);
  return (
    <group>
      <mesh position={[box.x, 0.42, box.z + box.d / 2 - 0.02]}>
        <boxGeometry args={[box.w * 0.94, 0.08, 0.03]} />
        <meshStandardMaterial color="#c9a45c" metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[box.x, 0.42, box.z - box.d / 2 + 0.02]}>
        <boxGeometry args={[box.w * 0.94, 0.08, 0.03]} />
        <meshStandardMaterial color="#c9a45c" metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[box.x + box.w / 2 - 0.02, 0.42, box.z]}>
        <boxGeometry args={[0.03, 0.08, box.d * 0.94]} />
        <meshStandardMaterial color="#c9a45c" metalness={0.35} roughness={0.35} />
      </mesh>
    </group>
  );
}

function EntryLeaf({ plan }: { plan: FlatPlan }) {
  const door = plan.openings.find((item) => item.id === "entry");
  if (!door) return null;
  const box = world(plan, door.x, door.y, Math.max(door.w, 1.2), door.h);
  return (
    <mesh position={[box.x, DOOR_H / 2, box.z]} castShadow>
      <boxGeometry args={[0.04, DOOR_H, box.d * 0.92]} />
      <meshStandardMaterial color="#5c3d18" roughness={0.55} />
    </mesh>
  );
}

function UnitInterior({ flat }: { flat: FlatPlanInput }) {
  const plan = planForFlat(flat);
  return (
    <group>
      {plan.rooms.map((room) => (
        <FloorSlab key={room.id} room={room} plan={plan} />
      ))}
      <WallRun plan={plan} />
      {lintelsForPlan(plan).map((hole) => (
        <DoorLintel key={hole.id} hole={hole} plan={plan} />
      ))}
      {plan.openings
        .filter((item) => item.kind === "window")
        .map((hole) => (
          <WindowPane key={hole.id} hole={hole} plan={plan} />
        ))}
      {plan.rooms
        .filter((room) => room.kind === "balcony")
        .map((room) => (
          <BalconyRail key={`${room.id}-rail`} room={room} plan={plan} />
        ))}
      {plan.furniture.map((item) => (
        <Furniture key={item.id} piece={item} plan={plan} />
      ))}
      <EntryLeaf plan={plan} />
    </group>
  );
}

export default function FlatUnit3D({ flat }: { readonly flat: FlatPlanInput }) {
  return (
    <div className="relative h-[28rem] overflow-hidden rounded-2xl bg-[#0f1c16] ring-1 ring-[rgba(27,58,47,0.2)] md:h-[32rem]">
      <Canvas
        camera={{ position: [5.2, 6.4, 5.6], fov: 38 }}
        shadows
        className="touch-none"
      >
        <color attach="background" args={["#0f1c16"]} />
        <ambientLight intensity={0.62} />
        <directionalLight
          position={[6, 9, 4]}
          intensity={1.25}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-4, 3, -2]} intensity={0.35} />
        <UnitInterior flat={flat} />
        <ContactShadows
          position={[0, -0.02, 0]}
          opacity={0.35}
          scale={14}
          blur={1.8}
          far={4}
        />
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.08}
        />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-3 text-xs font-semibold text-[#e8d5a3]">
        Drag to orbit · scroll to zoom · {flat.flatNumber}
      </p>
    </div>
  );
}
