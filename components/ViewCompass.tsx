"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { RefObject } from "react";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

/** World axes in the community massing model: N = −Z, E = +X, S = +Z, W = −X. */
const LOOK = new Vector3();
const RIGHT = new Vector3();

export function CompassSync({
  roseRef,
  controlsRef,
}: {
  readonly roseRef: RefObject<HTMLDivElement | null>
  readonly controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree();

  useFrame(() => {
    const el = roseRef?.current;
    if (!el) return;
    const target = controlsRef?.current?.target;
    if (target) {
      LOOK.set(target.x - camera.position.x, 0, target.z - camera.position.z);
    } else {
      camera.getWorldDirection(LOOK);
      LOOK.y = 0;
    }
    if (LOOK.lengthSq() < 1e-10) return;
    LOOK.normalize();
    RIGHT.set(-LOOK.z, 0, LOOK.x);
    const deg = (Math.atan2(-RIGHT.z, -LOOK.z) * 180) / Math.PI;
    el.style.transform = `rotate(${deg}deg)`;
  });

  return null;
}

export function CompassHud({
  roseRef,
}: {
  readonly roseRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="pointer-events-none absolute bottom-[5.35rem] left-3 z-10">
      <div
        className="relative grid size-[4.75rem] place-items-center rounded-full bg-[#14241c]/82 shadow-[0_6px_20px_rgba(0,0,0,0.35)] ring-1 ring-[rgba(232,213,163,0.28)] backdrop-blur-sm"
        role="img"
        aria-label="Compass. North, east, south, and west stay locked to the building as you orbit."
      >
        <div
          ref={roseRef}
          className="absolute inset-0 will-change-transform"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(232,213,163,0.28)"
              strokeWidth="1.2"
            />
            <polygon points="50,10 54,24 46,24" fill="#c9a45c" />
            <line
              x1="50"
              y1="26"
              x2="50"
              y2="74"
              stroke="rgba(232,213,163,0.35)"
              strokeWidth="1"
            />
            <line
              x1="26"
              y1="50"
              x2="74"
              y2="50"
              stroke="rgba(232,213,163,0.35)"
              strokeWidth="1"
            />
            <text
              x="50"
              y="20"
              textAnchor="middle"
              fill="#c9a45c"
              fontSize="13"
              fontWeight="700"
            >
              N
            </text>
            <text
              x="82"
              y="54"
              textAnchor="middle"
              fill="#e8d5a3"
              fontSize="11"
              fontWeight="700"
            >
              E
            </text>
            <text
              x="50"
              y="88"
              textAnchor="middle"
              fill="#e8d5a3"
              fontSize="11"
              fontWeight="700"
            >
              S
            </text>
            <text
              x="18"
              y="54"
              textAnchor="middle"
              fill="#e8d5a3"
              fontSize="11"
              fontWeight="700"
            >
              W
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
