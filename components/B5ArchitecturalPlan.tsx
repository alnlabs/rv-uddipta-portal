import {
  B5_DOORS,
  B5_EXTENT,
  B5_META,
  B5_OPENINGS,
  B5_ROOMS,
  B5_WINDOWS,
  splitB5Walls,
  type B5Door,
} from "@/lib/plans/b5";

const S = 10;
const FILL: Record<(typeof B5_ROOMS)[number]["kind"], string> = {
  room: "#f7f1e4",
  wet: "#dce4ea",
  balcony: "#d4c19a",
  utility: "#eee4d2",
  corridor: "#e4e0d6",
};

const DRAW_ORDER = [
  "corridor",
  "lobby",
  "ac-ledge",
  "hall",
  "living",
  "kitchen",
  "bed-1",
  "bed-2",
  "balc-w",
  "wash",
  "puja",
  "toilet-1",
  "toilet-2",
] as const;

function u(n: number) {
  return n * S;
}

function doorGeom(door: B5Door) {
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

export function B5ArchitecturalPlan({
  framed = true,
  homeLabel,
}: {
  readonly framed?: boolean
  readonly homeLabel?: string
}) {
  const unitLabel = homeLabel ?? B5_META.unit;
  const vbW = u(B5_EXTENT.w + 14);
  const vbH = u(B5_EXTENT.h + 12);
  const walls = splitB5Walls();
  const rooms = [...B5_ROOMS].sort(
    (left, right) =>
      DRAW_ORDER.indexOf(left.id as (typeof DRAW_ORDER)[number]) -
      DRAW_ORDER.indexOf(right.id as (typeof DRAW_ORDER)[number]),
  );

  const drawing = (
    <svg
      viewBox={`-70 -55 ${vbW} ${vbH}`}
      className="h-auto w-full"
      role="img"
      aria-label="RV Uddiipta B5 typical 2BHK-W architectural base plan"
    >
      <rect x={-70} y={-55} width={vbW} height={vbH} fill="#cfc7b8" />
      <text x="0" y="-38" fill="#7a5c22" fontSize="11" fontWeight="700" letterSpacing="1.6">
        RV UDDIIPTA · B-BLOCK · SOUTH OF B6
      </text>
      <text x="0" y="-20" fill="#14241c" fontSize="20" fontWeight="700">
        {unitLabel} · {B5_META.type}
      </text>
      <text x="230" y="-20" fill="#3d5247" fontSize="11">
        SBUA {B5_META.sbuaSft.toLocaleString()} sft · Carpet {B5_META.carpetSft.toLocaleString()} sft · Balcony{" "}
        {B5_META.balconySft} sft
      </text>
      <text x={u(22)} y={-8} textAnchor="middle" fill="#c45a12" fontSize="12" fontWeight="700">
        NORTH
      </text>
      <text x={u(22)} y={u(B5_EXTENT.h + 2.2)} textAnchor="middle" fill="#14241c" fontSize="12" fontWeight="700">
        SOUTH
      </text>
      <text
        x={-18}
        y={u(12)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(-90 -18 ${u(12)})`}
      >
        WEST
      </text>
      <text
        x={u(52)}
        y={u(12)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(90 ${u(52)} ${u(12)})`}
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

      {B5_OPENINGS.map((opening) => (
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
        x={u(4.35)}
        y={u(1.3)}
        width={u(2.15)}
        height={u(7.4)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <text
        x={u(5.45)}
        y={u(5.1)}
        textAnchor="middle"
        fill="#7a5c22"
        fontSize="7"
        fontWeight="700"
        transform={`rotate(-90 ${u(5.45)} ${u(5.1)})`}
      >
        Counter
      </text>

      <WetFixture x={15.8} y={0.4} kind="wc" />
      <WetFixture x={16.6} y={3.9} kind="basin" />
      <WetFixture x={20.5} y={0.4} kind="wc" />
      <WetFixture x={24.2} y={0.4} kind="basin" />

      {B5_WINDOWS.map((item) => (
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

      {B5_DOORS.map((door) => {
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
                x={u(door.x + 4.8)}
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

      {B5_ROOMS.filter((room) => room.kind !== "corridor" && room.label).map((room) => (
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

      <text
        x={u(45.7)}
        y={u(13.2)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="10"
        fontWeight="700"
        transform={`rotate(90 ${u(45.7)} ${u(13.2)})`}
      >
        Common corridor
      </text>
      <text
        x={u(41.8)}
        y={u(16.2)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="7"
        fontWeight="700"
        transform={`rotate(90 ${u(41.8)} ${u(16.2)})`}
      >
        AC ledge
      </text>
      <text x={u(38.1)} y={u(24.4)} textAnchor="middle" fill="#3d5247" fontSize="10" fontWeight="700">
        Staircase lobby
      </text>

      <circle cx={u(36.6)} cy={u(16.2)} r="11" fill="#c0392b" />
      <text x={u(36.6)} y={u(16.6)} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
        {unitLabel}
      </text>

      <NorthRose x={-40} y={u(7)} />
      <text x="-40" y={u(13.4)} textAnchor="middle" fill="#3d5247" fontSize="8">
        N up · E right
      </text>
    </svg>
  );

  if (!framed) return drawing;

  return (
    <figure className="rounded-2xl bg-[#ebe6dc] p-3 ring-1 ring-[rgba(27,58,47,0.12)] md:p-5">
      {drawing}
      <figcaption className="mt-3 text-xs leading-5 text-[#3d5247]">
        Typical <strong>B5</strong> (western B-block row, south of B6). North is the top of this
        drawing, east is the common corridor / entrance, west is the 5' balcony and 4' wash.
        Living is 20'-6" × 10'-6". Toilets are 4'-7½" × 6'-9" and 6'-4½" × 6'-9" — kept
        separate. Puja is 3'-6" × 6' between bedroom 2 and living. Corridor, AC ledge and
        staircase lobby are outside B5. No furniture. Apartment is not rotated or mirrored.
      </figcaption>
    </figure>
  );
}
