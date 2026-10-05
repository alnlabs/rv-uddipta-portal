"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Box3,
  Group,
  MathUtils,
  Mesh,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  COMPOUND_GATE,
  DRIVE_PATH,
  PERSON_HEIGHT_FT,
  ftToScene,
} from "@/lib/layout3d";
import {
  walkCameraDistance,
  walkInStairWell,
  walkMove,
  walkSnap,
} from "@/lib/walkCollision";
import {
  WalkLifts,
  type LiftRideControl,
} from "@/components/WalkLifts";
import { WalkFlatInteriors } from "@/components/WalkFlatInteriors";

const MAN_URL = "/models/man-casual.glb";
const WOMAN_URL = "/models/woman-casual.glb";

/**
 * Display scale for walk avatars — a bit smaller than real height so the
 * third-person camera can stay farther back indoors and still show the
 * full person without hugging walls.
 */
const AVATAR_DISPLAY_SCALE = 0.62;
const MAN_HEIGHT = ftToScene(PERSON_HEIGHT_FT.man) * AVATAR_DISPLAY_SCALE;
/** Comfortable walk pace (~5.5 ft/s). */
const WALK_SPEED = ftToScene(5.5);
/** Shift + WASD — brisk jog (~1.85× walk). */
const RUN_SPEED = ftToScene(10.2);
/** Stairs: slow enough that each tread is one step. */
const STAIR_SPEED = ftToScene(2.4);
const STAIR_RUN_SPEED = ftToScene(3.6);
const NPC_SPEED = ftToScene(4.2);
/** Face into the compound from the east gate (+X). */
const GATE_YAW = Math.PI / 2;
/**
 * Mesh forward is +Z with our yaw. Keep MODEL_YAW at 0 so the person faces
 * walk direction and the third-person camera sits behind their back.
 */
const MODEL_YAW = 0;

type BonePose = {
  bone: Object3D
  rest: Quaternion
};

type LimbBones = {
  hips: BonePose | null
  hipsRestY: number
  leftUpLeg: BonePose | null
  rightUpLeg: BonePose | null
  leftLeg: BonePose | null
  rightLeg: BonePose | null
  leftArm: BonePose | null
  rightArm: BonePose | null
  leftForeArm: BonePose | null
  rightForeArm: BonePose | null
  leftShoulder: BonePose | null
  rightShoulder: BonePose | null
  spine: BonePose | null
};

const _qSwing = new Quaternion();
const _axisX = new Vector3(1, 0, 0);
const _axisY = new Vector3(0, 1, 0);
const _axisZ = new Vector3(0, 0, 1);
/** Drop upper arms from T-pose straight down (local +X on this rig). */
const ARM_DOWN = 1.55;

/** Closed loop on the drive, just outside the courtyard hole. */
function communityWalkLoop(): [number, number][] {
  const { iW, iE, iN, iS } = DRIVE_PATH.bounds;
  const pad = 0.7;
  return [
    [iW - pad, iN - pad],
    [iE + pad, iN - pad],
    [iE + pad, iS + pad],
    [iW - pad, iS + pad],
  ];
}

function pathLength(points: [number, number][]) {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

function samplePath(
  points: [number, number][],
  distance: number,
): { x: number; z: number; yaw: number } {
  const len = pathLength(points);
  let d = ((distance % len) + len) % len;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= seg) {
      const t = seg > 1e-6 ? d / seg : 0;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      return { x, z, yaw };
    }
    d -= seg;
  }
  const last = points[0];
  return { x: last[0], z: last[1], yaw: 0 };
}

/** Man + woman standing just inside the compound gate, facing in. */
function gateStarts(): {
  man: { x: number; z: number; yaw: number }
  woman: { x: number; z: number; yaw: number }
} {
  const [gx, , gz] = COMPOUND_GATE.position;
  // Step inside the arch toward the apartments (+X).
  const inside = 0.85;
  const side = 0.38;
  return {
    man: { x: gx + inside, z: gz - side, yaw: GATE_YAW },
    woman: { x: gx + inside, z: gz + side, yaw: GATE_YAW },
  };
}

/** Path distance nearest to a world point (for NPC to leave the gate onto the loop). */
function nearestPathDistance(points: [number, number][], x: number, z: number) {
  const len = pathLength(points);
  let bestD = 0;
  let bestDist = Infinity;
  const samples = 64;
  for (let i = 0; i <= samples; i += 1) {
    const d = (len * i) / samples;
    const p = samplePath(points, d);
    const dist = Math.hypot(p.x - x, p.z - z);
    if (dist < bestDist) {
      bestDist = dist;
      bestD = d;
    }
  }
  return bestD;
}

function findBone(root: Object3D, name: string): Object3D | null {
  let found: Object3D | null = null;
  root.traverse((obj) => {
    if (!found && obj.name === name) found = obj;
  });
  return found;
}

function bonePose(root: Object3D, name: string): BonePose | null {
  const bone = findBone(root, name);
  if (!bone) return null;
  return { bone, rest: bone.quaternion.clone() };
}

function collectLimbs(root: Object3D): LimbBones {
  const hipsBone = findBone(root, "Hips");
  return {
    hips: bonePose(root, "Hips"),
    hipsRestY: hipsBone?.position.y ?? 0,
    leftUpLeg: bonePose(root, "LeftUpLeg"),
    rightUpLeg: bonePose(root, "RightUpLeg"),
    leftLeg: bonePose(root, "LeftLeg"),
    rightLeg: bonePose(root, "RightLeg"),
    leftArm: bonePose(root, "LeftArm"),
    rightArm: bonePose(root, "RightArm"),
    leftForeArm: bonePose(root, "LeftForeArm"),
    rightForeArm: bonePose(root, "RightForeArm"),
    leftShoulder: bonePose(root, "LeftShoulder"),
    rightShoulder: bonePose(root, "RightShoulder"),
    spine: bonePose(root, "Spine"),
  };
}

/** Apply local-axis delta on top of a bone's bind/rest quaternion. */
function setBoneDelta(pose: BonePose | null, axis: Vector3, angle: number) {
  if (!pose) return;
  _qSwing.setFromAxisAngle(axis, angle);
  pose.bone.quaternion.copy(pose.rest).multiply(_qSwing);
}

/** Layer an extra local-axis rotation after the current pose. */
function addBoneDelta(pose: BonePose | null, axis: Vector3, angle: number) {
  if (!pose || Math.abs(angle) < 1e-6) return;
  _qSwing.setFromAxisAngle(axis, angle);
  pose.bone.quaternion.multiply(_qSwing);
}

/**
 * Walk cycle for this VALID rig (bind axes):
 * - Legs: local Z = character left/right → front/back swing; local X = forward (do not use for knees).
 * - Arms: local X = character forward → drop from T-pose; local Y = left/right → walk swing.
 */
function applyWalkPose(b: LimbBones, phase: number, moving: boolean) {
  const swing = moving ? Math.sin(phase) : 0;
  const swing2 = moving ? Math.sin(phase * 2) : 0;
  // Knee bends as that leg swings back.
  const leftKnee = moving ? Math.max(0, -swing) * 0.95 : 0;
  const rightKnee = moving ? Math.max(0, swing) * 0.95 : 0;

  // Thighs: opposite front/back (local Z = lateral on this rig).
  setBoneDelta(b.leftUpLeg, _axisZ, -swing * 0.75);
  setBoneDelta(b.rightUpLeg, _axisZ, -swing * 0.75);
  // Knees: same lateral axis — NOT local X (that was the cross-legged look).
  setBoneDelta(b.leftLeg, _axisZ, leftKnee);
  setBoneDelta(b.rightLeg, _axisZ, -rightKnee);

  // Arms: both sides use +local X to hang down (validated on this GLB).
  setBoneDelta(b.leftShoulder, _axisX, 0);
  setBoneDelta(b.rightShoulder, _axisX, 0);
  setBoneDelta(b.leftArm, _axisX, ARM_DOWN);
  setBoneDelta(b.rightArm, _axisX, ARM_DOWN);
  if (moving) {
    // Opposite arm swing on lateral axis (local Y).
    addBoneDelta(b.leftArm, _axisY, swing * 0.5);
    addBoneDelta(b.rightArm, _axisY, -swing * 0.5);
  }
  setBoneDelta(b.leftForeArm, _axisX, moving ? 0.15 + Math.max(0, -swing) * 0.2 : 0.08);
  setBoneDelta(b.rightForeArm, _axisX, moving ? 0.15 + Math.max(0, swing) * 0.2 : 0.08);

  if (b.hips) {
    b.hips.bone.position.y = b.hipsRestY + Math.abs(swing2) * 0.012;
    setBoneDelta(b.hips, _axisY, moving ? swing * 0.04 : 0);
  }
  setBoneDelta(b.spine, _axisY, moving ? -swing * 0.03 : 0);
}

type GaitState = { moving: boolean; run: boolean };

function HumanAvatar({
  url,
  heightFt,
  gaitRef,
  phaseOffset = 0,
}: Readonly<{
  url: string
  heightFt: number
  gaitRef: { current: GaitState }
  phaseOffset?: number
}>) {
  // Plain GLBs (no meshopt/webp) — still request meshopt support for safety.
  const gltf = useGLTF(url, true, true);
  const scene = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  const limbs = useRef<LimbBones | null>(null);
  const phase = useRef(phaseOffset);
  const targetHeight = ftToScene(heightFt);
  const { scale, groundY } = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    const h = size.y > 0.1 ? size.y : 1.7;
    const s = targetHeight / h;
    return { scale: s, groundY: -box.min.y * s };
  }, [scene, targetHeight]);

  useEffect(() => {
    scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;
      obj.visible = true;
    });
    limbs.current = collectLimbs(scene);
  }, [scene]);

  useFrame((_, dt) => {
    const b = limbs.current;
    if (!b) return;
    const { moving, run } = gaitRef.current;
    if (moving) phase.current += dt * (run ? 12.4 : 8.2);
    applyWalkPose(b, phase.current, moving);
  });

  return (
    <group position={[0, groundY, 0]} rotation={[0, MODEL_YAW, 0]} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

function NpcWalker({
  url,
  heightFt,
  path,
  speed,
  start,
  pathDistance,
  phaseOffset,
  tourActiveRef,
}: Readonly<{
  url: string
  heightFt: number
  path: [number, number][]
  speed: number
  start: { x: number; z: number; yaw: number }
  pathDistance: number
  phaseOffset: number
  /** When true, leave the gate and walk the community loop. */
  tourActiveRef: { current: boolean }
}>) {
  const root = useRef<Group>(null);
  const distance = useRef(pathDistance);
  const prevYaw = useRef(start.yaw);
  const gaitRef = useRef<GaitState>({ moving: false, run: false });
  const onPath = useRef(false);

  useFrame((_, dt) => {
    if (!root.current) return;

    if (!tourActiveRef.current) {
      // Ready at the gate — idle until the player starts.
      root.current.position.set(start.x, 0, start.z);
      root.current.rotation.y = start.yaw;
      prevYaw.current = start.yaw;
      gaitRef.current = { moving: false, run: false };
      return;
    }

    if (!onPath.current) {
      // Walk from the gate to the nearest drive-loop point, then follow the loop.
      const join = samplePath(path, pathDistance);
      const dx = join.x - root.current.position.x;
      const dz = join.z - root.current.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        onPath.current = true;
        distance.current = pathDistance;
      } else {
        const step = Math.min(speed * dt, dist);
        root.current.position.x += (dx / dist) * step;
        root.current.position.z += (dz / dist) * step;
        const yaw = Math.atan2(dx, dz);
        const smoothed = MathUtils.damp(prevYaw.current, yaw, 8, dt);
        prevYaw.current = smoothed;
        root.current.rotation.y = smoothed;
        gaitRef.current = { moving: true, run: false };
        return;
      }
    }

    distance.current += speed * dt;
    const { x, z, yaw } = samplePath(path, distance.current);
    root.current.position.set(x, 0, z);
    const smoothed = MathUtils.damp(prevYaw.current, yaw, 8, dt);
    prevYaw.current = smoothed;
    root.current.rotation.y = smoothed;
    gaitRef.current = { moving: true, run: false };
  });

  return (
    <group
      ref={root}
      name="walker-woman"
      position={[start.x, 0, start.z]}
      rotation={[0, start.yaw, 0]}
    >
      <Suspense fallback={null}>
        <HumanAvatar
          url={url}
          heightFt={heightFt * AVATAR_DISPLAY_SCALE}
          gaitRef={gaitRef}
          phaseOffset={phaseOffset}
        />
      </Suspense>
    </group>
  );
}

function PlayerWalker({
  url,
  heightFt,
  start,
  tourActiveRef,
  playerPosRef,
  rideControlRef,
}: Readonly<{
  url: string
  heightFt: number
  start: { x: number; z: number; yaw: number }
  tourActiveRef: { current: boolean }
  playerPosRef: { current: { x: number; y: number; z: number } | null }
  rideControlRef: { current: LiftRideControl }
}>) {
  const root = useRef<Group>(null);
  const { camera, gl } = useThree();
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
  });
  /** Horizontal look — unbounded, full 360°. */
  const yaw = useRef(start.yaw);
  /** Vertical orbit angle from horizon (radians). */
  const pitch = useRef(0.35);
  const gaitRef = useRef<GaitState>({ moving: false, run: false });
  const lookTarget = useMemo(() => new Vector3(), []);
  const desiredCam = useMemo(() => new Vector3(), []);
  const smoothHeadY = useRef<number | null>(null);
  const smoothCamDist = useRef<number | null>(null);
  const camReady = useRef(false);
  const dragging = useRef(false);
  const spawn = useMemo(
    () => walkSnap(start.x, start.z, 0),
    [start.x, start.z],
  );

  useEffect(() => {
    const el = gl.domElement;
    const LOOK_X = 0.0045;
    const LOOK_Y = 0.0032;
    const applyLook = (dx: number, dy: number) => {
      yaw.current -= dx * LOOK_X;
      // Keep yaw numerically stable while allowing endless spins.
      if (yaw.current > Math.PI * 4 || yaw.current < -Math.PI * 4) {
        yaw.current = Math.atan2(Math.sin(yaw.current), Math.cos(yaw.current));
      }
      // Nearly full vertical orbit (avoid exact poles so the camera stays stable).
      pitch.current = MathUtils.clamp(
        pitch.current - dy * LOOK_Y,
        -1.35,
        1.35,
      );
    };
    const onKey = (event: KeyboardEvent, down: boolean) => {
      const k = event.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") {
        keys.current[k] = down;
        event.preventDefault();
      }
      keys.current.shift = event.shiftKey || (k === "shift" && down);
    };
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === el) {
        applyLook(event.movementX, event.movementY);
        return;
      }
      if (dragging.current) applyLook(event.movementX, event.movementY);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 0 || event.button === 2) {
        dragging.current = true;
        // Prefer pointer lock for look; skip setPointerCapture (conflicts / InvalidStateError).
        if (document.pointerLockElement !== el) {
          const lock = el.requestPointerLock();
          if (lock && typeof (lock as Promise<void>).catch === "function") {
            void (lock as Promise<void>).catch(() => {});
          }
        }
      }
    };
    const onPointerUp = () => {
      dragging.current = false;
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    const onBlur = () => {
      keys.current = { w: false, a: false, s: false, d: false, shift: false };
      dragging.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("contextmenu", onContextMenu);
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
  }, [gl]);

  useFrame((_, dt) => {
    if (!root.current) return;
    const ride = rideControlRef.current;

    // Keep rider locked in the cabin while doors close / cabin travels.
    if (ride.holdRider && ride.cabinHold) {
      root.current.position.set(
        ride.cabinHold.x,
        ride.cabinHold.y,
        ride.cabinHold.z,
      );
      gaitRef.current = { moving: false, run: false };
      playerPosRef.current = {
        x: ride.cabinHold.x,
        y: ride.cabinHold.y,
        z: ride.cabinHold.z,
      };
      // Exterior camera owned by WalkLifts while traveling.
      if (ride.traveling) {
        camReady.current = false;
        smoothHeadY.current = null;
        smoothCamDist.current = null;
        return;
      }
    }

    const { w, a, s, d, shift } = keys.current;
    const forward = (w ? 1 : 0) + (s ? -1 : 0);
    // A = strafe left, D = strafe right (relative to facing).
    const strafe = (a ? -1 : 0) + (d ? 1 : 0);
    const moving = !ride.locked && (forward !== 0 || strafe !== 0);
    const run = moving && shift;
    gaitRef.current = { moving, run };
    if (moving) tourActiveRef.current = true;

    const onStairs = walkInStairWell(
      root.current.position.x,
      root.current.position.z,
    );

    if (moving) {
      const len = Math.hypot(forward, strafe) || 1;
      const fx = Math.sin(yaw.current);
      const fz = Math.cos(yaw.current);
      // Camera/person facing +forward; +strafe must be screen-right.
      const rx = -Math.cos(yaw.current);
      const rz = Math.sin(yaw.current);
      const speed = onStairs
        ? run
          ? STAIR_RUN_SPEED
          : STAIR_SPEED
        : run
          ? RUN_SPEED
          : WALK_SPEED;
      const step = speed * dt;
      const dx = ((fx * forward + rx * strafe) / len) * step;
      const dz = ((fz * forward + rz * strafe) / len) * step;
      const next = walkMove(
        root.current.position.x,
        root.current.position.z,
        root.current.position.y,
        dx,
        dz,
      );
      root.current.position.set(next.x, next.y, next.z);
    } else if (!ride.holdRider) {
      const settled = walkSnap(
        root.current.position.x,
        root.current.position.z,
        root.current.position.y,
      );
      root.current.position.y = settled.y;
    }

    root.current.rotation.y = yaw.current;
    playerPosRef.current = {
      x: root.current.position.x,
      y: root.current.position.y,
      z: root.current.position.z,
    };

    // Third-person spherical orbit: yaw 360°, pitch up/down around the person.
    const px = root.current.position.x;
    const py = root.current.position.y;
    const pz = root.current.position.z;
    const inCabin = ride.inCabin && !ride.traveling && !!ride.cabinBounds;
    // Cabin: frame from head/shoulders (top half). Else: near crown for full-body orbit.
    const rawHeadY = py + MAN_HEIGHT * (inCabin ? 0.88 : 0.82);
    if (smoothHeadY.current == null) smoothHeadY.current = rawHeadY;
    smoothHeadY.current = MathUtils.damp(
      smoothHeadY.current,
      rawHeadY,
      inCabin ? 10 : onStairs ? 7 : 14,
      dt,
    );
    const headY = smoothHeadY.current;
    const maxDist = inCabin
      ? MAN_HEIGHT * 0.95
      : onStairs
        ? ftToScene(8.5)
        : ftToScene(11);
    // Cabin: slight downward look from behind the head so the top half fills the frame.
    // Corridor/stairs: higher pitch keeps more of the person in frame.
    const pitchBias = inCabin ? 0.12 : onStairs ? 0.22 : 0.1;
    const usePitch = MathUtils.clamp(
      pitch.current + pitchBias,
      inCabin ? -0.2 : -1.2,
      inCabin ? 0.45 : 1.25,
    );
    const cosP = Math.cos(usePitch);
    const sinP = Math.sin(usePitch);
    const fx = Math.sin(yaw.current);
    const fz = Math.cos(yaw.current);
    // Desired offset from head toward the orbit camera (behind + pitched).
    const ox = -fx * cosP;
    const oy = sinP;
    const oz = -fz * cosP;
    // Inside the cabin: short orbit framing the top half. Outside: wall-aware distance.
    const rawDist = inCabin
      ? MAN_HEIGHT * 0.7
      : walkCameraDistance(px, headY, pz, ox, oy, oz, maxDist);
    if (smoothCamDist.current == null) smoothCamDist.current = rawDist;
    smoothCamDist.current = MathUtils.damp(
      smoothCamDist.current,
      rawDist,
      inCabin ? 8 : onStairs ? 5 : 10,
      dt,
    );
    const dist = inCabin
      ? MathUtils.clamp(smoothCamDist.current, MAN_HEIGHT * 0.5, MAN_HEIGHT * 0.88)
      : smoothCamDist.current;
    desiredCam.set(px + ox * dist, headY + oy * dist, pz + oz * dist);
    if (inCabin && ride.cabinBounds) {
      const b = ride.cabinBounds;
      // Keep the camera inside the cabin volume (not outside looking in).
      desiredCam.x = MathUtils.clamp(desiredCam.x, b.x0, b.x1);
      desiredCam.z = MathUtils.clamp(desiredCam.z, b.z0, b.z1);
      desiredCam.y = MathUtils.clamp(
        desiredCam.y,
        b.y0 + MAN_HEIGHT * 0.72,
        b.y1 - 0.03,
      );
      // If clamping crushed the orbit, nudge back so head/shoulders stay framed.
      const hx = desiredCam.x - px;
      const hz = desiredCam.z - pz;
      const hDist = Math.hypot(hx, hz);
      const minHalf = MAN_HEIGHT * 0.42;
      if (hDist < minHalf && hDist > 1e-4) {
        const s = minHalf / hDist;
        let nx = px + hx * s;
        let nz = pz + hz * s;
        nx = MathUtils.clamp(nx, b.x0, b.x1);
        nz = MathUtils.clamp(nz, b.z0, b.z1);
        desiredCam.x = nx;
        desiredCam.z = nz;
      }
    } else {
      // Keep camera above the walk surface; bias up when orbit is shortened.
      const minCamY =
        py + MAN_HEIGHT * 0.55 + (dist < maxDist * 0.75 ? ftToScene(0.6) : 0);
      desiredCam.y = Math.max(desiredCam.y, minCamY);
    }
    if (!camReady.current) {
      camera.position.copy(desiredCam);
      camReady.current = true;
    } else {
      // Soft follow — pull in quickly when entering the cabin.
      const pullIn =
        inCabin ||
        (!onStairs &&
          Math.hypot(desiredCam.x - px, desiredCam.z - pz) + 0.05 <
            Math.hypot(camera.position.x - px, camera.position.z - pz));
      const follow = inCabin ? 16 : onStairs ? 7 : pullIn ? 14 : 11;
      camera.position.x = MathUtils.damp(
        camera.position.x,
        desiredCam.x,
        follow,
        dt,
      );
      camera.position.z = MathUtils.damp(
        camera.position.z,
        desiredCam.z,
        follow,
        dt,
      );
      camera.position.y = MathUtils.damp(
        camera.position.y,
        desiredCam.y,
        inCabin ? 12 : onStairs ? 5 : follow,
        dt,
      );
    }
    // Cabin: aim upper chest so the top half (head → waist) fills the frame.
    lookTarget.set(px, py + MAN_HEIGHT * (inCabin ? 0.72 : 0.42), pz);
    camera.lookAt(lookTarget);
  });

  return (
    <group
      ref={root}
      name="walker-man"
      position={[spawn.x, spawn.y, spawn.z]}
      rotation={[0, start.yaw, 0]}
    >
      <Suspense fallback={null}>
        <HumanAvatar
          url={url}
          heightFt={heightFt * AVATAR_DISPLAY_SCALE}
          gaitRef={gaitRef}
        />
      </Suspense>
    </group>
  );
}

/** Man (playable) + woman (NPC) start idle at the gate, ready to walk. */
export function CommunityWalkers() {
  const path = useMemo(() => communityWalkLoop(), []);
  const starts = useMemo(() => gateStarts(), []);
  const womanPathDistance = useMemo(
    () => nearestPathDistance(path, starts.woman.x, starts.woman.z),
    [path, starts.woman.x, starts.woman.z],
  );
  const tourActiveRef = useRef(false);
  const playerPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const rideControlRef = useRef<LiftRideControl>({
    traveling: false,
    locked: false,
    cabinY: 0,
    liftId: null,
    holdRider: false,
    cabinHold: null,
    inCabin: false,
    cabinBounds: null,
  });
  const [liftPrompt, setLiftPrompt] = useState<string | null>(null);
  const [panelLiftId, setPanelLiftId] = useState<string | null>(null);

  return (
    <group name="community-walkers">
      <WalkFlatInteriors playerRef={playerPosRef} />
      <WalkLifts
        playerRef={playerPosRef}
        rideControlRef={rideControlRef}
        prompt={liftPrompt}
        setPrompt={setLiftPrompt}
        panelLiftId={panelLiftId}
        setPanelLiftId={setPanelLiftId}
      />
      <PlayerWalker
        url={MAN_URL}
        heightFt={PERSON_HEIGHT_FT.man}
        start={starts.man}
        tourActiveRef={tourActiveRef}
        playerPosRef={playerPosRef}
        rideControlRef={rideControlRef}
      />
      <NpcWalker
        url={WOMAN_URL}
        heightFt={PERSON_HEIGHT_FT.woman}
        path={path}
        speed={NPC_SPEED}
        start={starts.woman}
        pathDistance={womanPathDistance}
        phaseOffset={Math.PI}
        tourActiveRef={tourActiveRef}
      />
    </group>
  );
}

useGLTF.preload(MAN_URL, true, true);
useGLTF.preload(WOMAN_URL, true, true);
