import {
  B4_DOORS,
  B4_EXTENT,
  B4_META,
  B4_OPENINGS,
  B4_ROOMS,
  B4_WINDOWS,
  splitB4Walls,
  type B4Door,
} from "@/lib/plans/b4";

const S = 10;
const FILL: Record<(typeof B4_ROOMS)[number]["kind"], string> = {
  room: "#f7f1e4",
  wet: "#dce4ea",
  balcony: "#d4c19a",
  utility: "#eee4d2",
  corridor: "#e4e0d6",
};

const DRAW_ORDER = [
  "corridor",
  "lobby-n",
  "stairs",
  "lift",
  "shaft",
  "ac-ledge",
  "hall",
  "circ",
  "living",
  "kitchen",
  "bed-1",
  "bed-2",
  "balc-e",
  "wash",
  "puja",
  "toilet-1",
  "toilet-2",
] as const;

function u(n: number) {
  return n * S;
}

function doorGeom(door: B4Door) {
  const r = door.length;
  const hingeAtStart = door.swing === "cw";
  let hx = door.x;
  let hy = door.y;
  if ((door.wall === "n" || door.wall === "s") && !hingeAtStart) hx = door.x + door.length;
  if ((door.wall === "e" || door.wall === "w") && !hingeAtStart) hy = door.y + door.length;
  const inward = { e: -r, w: r, n: r, s: -r }[door.wall];
  const lx = door.wall === "e" || door.wall === "w" ? door.x + inward : hx;
  const ly = door.wall === "n" || door.wall === "s" ? door.y + inward : hy;
  const sweep = door.swing === "cw" ? 1 : 0;
  return {
    leaf: { x1: hx, y1: hy, x2: lx, y2: ly },
    arc: `M ${u(hx)} ${u(hy)} A ${u(r)} ${u(r)} 0 0 ${sweep} ${u(lx)} ${u(ly)}`,
  };
}

function NorthRose({ x, y }: { readonly x: number; readonly y: number }) {
  const s = 18;
  return (
    <g
      transform={`translate(${x} ${y})`}
      aria-label="North at top of drawing. East right, south down, west left."
    >
      <polygon
        points={`0,${-s} ${s},0 0,${s} ${-s},0`}
        fill="#f4efe4"
        stroke="#14241c"
        strokeWidth="1.4"
      />
      <line x1="0" y1={-s} x2="0" y2={s} stroke="#14241c" strokeWidth="1" />
      <line x1={-s} y1="0" x2={s} y2="0" stroke="#14241c" strokeWidth="1" />
      <polygon points="0,-22 5,-10 -5,-10" fill="#c45a12" />
      <text x="0" y={-s - 10} textAnchor="middle" fill="#c45a12" fontSize="13" fontWeight="700">
        N
      </text>
      <text x="0" y={s + 16} textAnchor="middle" fill="#14241c" fontSize="11" fontWeight="700">
        S
      </text>
      <text x={s + 14} y="4" textAnchor="middle" fill="#14241c" fontSize="11" fontWeight="700">
        E
      </text>
      <text x={-s - 14} y="4" textAnchor="middle" fill="#14241c" fontSize="11" fontWeight="700">
        W
      </text>
    </g>
  );
}

function WetFixture({
  x,
  y,
  kind,
}: {
  readonly x: number
  readonly y: number
  readonly kind: "wc" | "basin"
}) {
  if (kind === "wc") {
    return (
      <g>
        <rect
          x={u(x)}
          y={u(y)}
          width={u(1.35)}
          height={u(1.15)}
          fill="#f7f2e6"
          stroke="#4a5a62"
          strokeWidth="1"
        />
        <ellipse
          cx={u(x + 0.68)}
          cy={u(y + 2.05)}
          rx={u(0.55)}
          ry={u(0.72)}
          fill="#f7f2e6"
          stroke="#4a5a62"
          strokeWidth="1"
        />
      </g>
    );
  }
  return (
    <rect
      x={u(x)}
      y={u(y)}
      width={u(1.6)}
      height={u(1.15)}
      rx={4}
      fill="#f7f2e6"
      stroke="#4a5a62"
      strokeWidth="1"
    />
  );
}

export function B4ArchitecturalPlan({
  framed = true,
  homeLabel,
}: {
  readonly framed?: boolean
  readonly homeLabel?: string
}) {
  const unitLabel = homeLabel ?? B4_META.unit;
  const vbW = u(B4_EXTENT.w + 18);
  const vbH = u(B4_EXTENT.h + 16);
  const walls = splitB4Walls();
  const rooms = [...B4_ROOMS].sort(
    (left, right) =>
      DRAW_ORDER.indexOf(left.id as (typeof DRAW_ORDER)[number]) -
      DRAW_ORDER.indexOf(right.id as (typeof DRAW_ORDER)[number]),
  );

  const drawing = (
    <svg
      viewBox={`-160 -170 ${vbW} ${vbH}`}
      className="h-auto w-full"
      role="img"
      aria-label="RV Uddiipta B4 typical 2BHK-E architectural base plan"
    >
      <rect x={-160} y={-170} width={vbW} height={vbH} fill="#cfc7b8" />
      <text x="-70" y="-148" fill="#7a5c22" fontSize="11" fontWeight="700" letterSpacing="1.6">
        RV UDDIIPTA · B-BLOCK · EAST OF B3
      </text>
      <text x="-70" y="-130" fill="#14241c" fontSize="20" fontWeight="700">
        {unitLabel} · {B4_META.type}
      </text>
      <text x="180" y="-130" fill="#3d5247" fontSize="11">
        SBUA {B4_META.sbuaSft.toLocaleString()} sft · Carpet {B4_META.carpetSft.toLocaleString()} sft · Balcony{" "}
        {B4_META.balconySft} sft
      </text>
      <text x={u(16)} y={-118} textAnchor="middle" fill="#c45a12" fontSize="12" fontWeight="700">
        NORTH
      </text>
      <text x={u(16)} y={u(25.6)} textAnchor="middle" fill="#14241c" fontSize="12" fontWeight="700">
        SOUTH
      </text>
      <text
        x={-108}
        y={u(8)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(-90 -108 ${u(8)})`}
      >
        WEST
      </text>
      <text
        x={u(43)}
        y={u(8)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(90 ${u(43)} ${u(8)})`}
      >
        EAST
      </text>

      {rooms.map((room) => (
        <rect
          key={room.id}
          x={u(room.x)}
          y={u(room.y)}
          width={u(room.w)}
          height={u(room.h)}
          fill={FILL[room.kind]}
        />
      ))}

      {B4_OPENINGS.map((opening) => (
        <rect
          key={opening.id}
          x={u(opening.x)}
          y={u(opening.y)}
          width={u(opening.w)}
          height={u(opening.h)}
          fill="#f7f1e4"
        />
      ))}

      {walls.map((wall, index) => (
        <line
          key={`${wall.x1}-${wall.y1}-${index}`}
          x1={u(wall.x1)}
          y1={u(wall.y1)}
          x2={u(wall.x2)}
          y2={u(wall.y2)}
          stroke="#14241c"
          strokeWidth={wall.outer ? 3.2 : 1.7}
          strokeLinecap="square"
        />
      ))}

      <rect
        x={u(0.5)}
        y={u(4.35)}
        width={u(7.6)}
        height={u(2)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <text x={u(4.3)} y={u(5.65)} textAnchor="middle" fill="#7a5c22" fontSize="7" fontWeight="700">
        Counter
      </text>

      <WetFixture x={10.25} y={0.3} kind="wc" />
      <WetFixture x={10.4} y={3.4} kind="basin" />
      <WetFixture x={15.0} y={0.4} kind="wc" />
      <WetFixture x={18.2} y={0.4} kind="basin" />

      {B4_WINDOWS.map((item) => (
        <g key={item.id}>
          <rect
            x={u(item.x)}
            y={u(item.y)}
            width={u(item.w)}
            height={u(item.h)}
            fill="#d5e6ef"
            stroke="#1b3a2f"
            strokeWidth="1.1"
          />
        </g>
      ))}

      {B4_DOORS.map((door) => {
        const geom = doorGeom(door);
        return (
          <g key={door.id}>
            <path d={geom.arc} fill="none" stroke="#7a5c22" strokeWidth="1.15" />
            <line
              x1={u(geom.leaf.x1)}
              y1={u(geom.leaf.y1)}
              x2={u(geom.leaf.x2)}
              y2={u(geom.leaf.y2)}
              stroke="#7a5c22"
              strokeWidth="1.35"
            />
            {door.entrance ? (
              <text
                x={u(door.x - 7.2)}
                y={u(door.y + 1.6)}
                fill="#14241c"
                fontSize="10"
                fontWeight="700"
              >
                Entrance
              </text>
            ) : null}
          </g>
        );
      })}

      {B4_ROOMS.filter((room) => room.kind !== "corridor" && room.label).map((room) => (
        <g key={`${room.id}-label`}>
          <text
            x={u(room.x + room.w / 2)}
            y={u(room.y + room.h / 2 - (room.dim ? 0.35 : 0))}
            textAnchor="middle"
            fill="#14241c"
            fontSize={room.w < 5.5 || room.h < 4.5 ? 8 : 10}
            fontWeight="700"
          >
            {room.label}
          </text>
          {room.dim ? (
            <text
              x={u(room.x + room.w / 2)}
              y={u(room.y + room.h / 2 + 1.15)}
              textAnchor="middle"
              fill="#3d5247"
              fontSize="8"
            >
              {room.dim}
            </text>
          ) : null}
        </g>
      ))}

      <text x={u(3.5)} y={u(-5.2)} textAnchor="middle" fill="#3d5247" fontSize="10" fontWeight="700">
        Lift
      </text>
      <text x={u(18.5)} y={u(-4.8)} textAnchor="middle" fill="#3d5247" fontSize="8" fontWeight="700">
        Shaft
      </text>
      <text x={u(29.1)} y={u(-6.4)} textAnchor="middle" fill="#3d5247" fontSize="10" fontWeight="700">
        Staircase
      </text>
      <text x={u(29.1)} y={u(-4.8)} textAnchor="middle" fill="#3d5247" fontSize="8">
        DN / UP
      </text>
      <text
        x={u(-0.8)}
        y={u(16.6)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="7"
        fontWeight="700"
        transform={`rotate(-90 ${u(-0.8)} ${u(16.6)})`}
      >
        AC ledge
      </text>
      <text
        x={u(-4.6)}
        y={u(15)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="10"
        fontWeight="700"
        transform={`rotate(-90 ${u(-4.6)} ${u(15)})`}
      >
        Common corridor
      </text>

      <circle cx={u(3.2)} cy={u(16.6)} r="11" fill="#c0392b" />
      <text x={u(3.2)} y={u(17)} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
        {unitLabel}
      </text>

      <NorthRose x={-130} y={u(4)} />
      <text x="-130" y={u(10.4)} textAnchor="middle" fill="#3d5247" fontSize="8">
        N up · E right
      </text>
    </svg>
  );

  if (!framed) return drawing;

  return (
    <figure className="rounded-2xl bg-[#ebe6dc] p-3 ring-1 ring-[rgba(27,58,47,0.12)] md:p-5">
      {drawing}
      <figcaption className="mt-3 text-xs leading-5 text-[#3d5247]">
        Typical <strong>B4</strong> (east of B3, across the corridor). North is the top of
        this drawing, west is the corridor / entrance into living. Living is 18' × 11'-3".
        Kitchen is 10' × 7' under the 4' wash. Puja is 3'-9" × 6' between living and
        bedroom 2. The 5' balcony is east of bedroom 2. Two toilets stay separate. Lift,
        shaft, staircase and corridor are outside B4. No furniture. Apartment is not
        rotated or mirrored.
      </figcaption>
    </figure>
  );
}
