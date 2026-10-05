"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { CSSProperties, RefObject } from "react";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CARDINAL_LABEL,
  CARDINALS,
  cardinalScreenAngleDeg,
  type CardinalId,
} from "@/lib/siteOrientation";

const LOOK = new Vector3();

const LABEL_STYLE: Record<CardinalId, CSSProperties> = {
  N: {
    color: "#c9a45c",
    transform: "rotate(var(--compass-N)) translateY(-1.55rem) rotate(calc(-1 * var(--compass-N)))",
  },
  E: {
    color: "#e8d5a3",
    transform: "rotate(var(--compass-E)) translateY(-1.55rem) rotate(calc(-1 * var(--compass-E)))",
  },
  S: {
    color: "#e8d5a3",
    transform: "rotate(var(--compass-S)) translateY(-1.55rem) rotate(calc(-1 * var(--compass-S)))",
  },
  W: {
    color: "#e8d5a3",
    transform: "rotate(var(--compass-W)) translateY(-1.55rem) rotate(calc(-1 * var(--compass-W)))",
  },
};

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
    const controls = controlsRef?.current;
    const target = controls?.enabled === false ? null : controls?.target;
    if (target) {
      LOOK.set(target.x - camera.position.x, 0, target.z - camera.position.z);
    } else {
      camera.getWorldDirection(LOOK);
      LOOK.y = 0;
    }
    if (LOOK.lengthSq() < 1e-10) return;
    LOOK.normalize();
    for (const item of CARDINALS) {
      const deg = cardinalScreenAngleDeg(item.x, item.z, LOOK.x, LOOK.z);
      el.style.setProperty(`--compass-${item.id}`, `${deg}deg`);
    }
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
        ref={roseRef}
        className="relative grid size-[4.75rem] place-items-center rounded-full bg-[#14241c]/82 shadow-[0_6px_20px_rgba(0,0,0,0.35)] ring-1 ring-[rgba(232,213,163,0.28)] backdrop-blur-sm"
        style={
          {
            "--compass-N": "133.2deg",
            "--compass-E": "-136.8deg",
            "--compass-S": "-46.8deg",
            "--compass-W": "43.2deg",
          } as CSSProperties
        }
        role="img"
        aria-label="Compass. N, E, S, and W stay locked to the site. East is the gate."
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(232,213,163,0.28)"
            strokeWidth="1.2"
          />
        </svg>
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          style={{ transform: "rotate(var(--compass-N))" }}
          aria-hidden
        >
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
        </svg>
        {(Object.keys(CARDINAL_LABEL) as CardinalId[]).map((id) => (
          <span
            key={id}
            className="absolute left-1/2 top-1/2 -ml-2 -mt-2 w-4 text-center text-[11px] font-bold leading-4"
            style={LABEL_STYLE[id]}
          >
            {id}
          </span>
        ))}
      </div>
    </div>
  );
}
