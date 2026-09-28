import {
  A10_DOORS,
  A10_EXTENT,
  A10_META,
  A10_OPENINGS,
  A10_ROOMS,
  A10_WINDOWS,
  splitA10Walls,
  type A10Door,
} from "@/lib/plans/a10";

const S = 10;
const FILL: Record<(typeof A10_ROOMS)[number]["kind"], string> = {
  room: "#f7f1e4",
  wet: "#dce4ea",
  balcony: "#d4c19a",
  utility: "#eee4d2",
  corridor: "#e4e0d6",
};

const DRAW_ORDER = [
  "corridor",
  "lobby",
  "lift",
  "ac-ledge",
  "living",
  "drawing",
  "hall-se",
  "kitchen",
  "bed-1",
  "bed-2",
  "bed-3",
  "balc-n",
  "balc-e",
  "utility",
  "puja",
  "toilet-1",
  "toilet-2",
  "toilet-3",
] as const;

function u(n: number) {
  return n * S;
}

function doorGeom(door: A10Door) {
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

export function A10ArchitecturalPlan({
  framed = true,
  homeLabel,
}: {
  readonly framed?: boolean
  readonly homeLabel?: string
}) {
  const unitLabel = homeLabel ?? A10_META.unit;
  const vbX = -90;
  const vbY = -70;
  const vbW = u(A10_EXTENT.w + 16);
  const vbH = u(A10_EXTENT.h + 12);
  const walls = splitA10Walls();
  const rooms = [...A10_ROOMS].sort(
    (left, right) =>
      DRAW_ORDER.indexOf(left.id as (typeof DRAW_ORDER)[number]) -
      DRAW_ORDER.indexOf(right.id as (typeof DRAW_ORDER)[number]),
  );

  const drawing = (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="h-auto w-full"
      role="img"
      aria-label="RV Uddiipta A10 typical 3BHK-E architectural base plan"
    >
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#cfc7b8" />
      <text x="0" y="-48" fill="#7a5c22" fontSize="11" fontWeight="700" letterSpacing="1.6">
        RV UDDIIPTA · A-BLOCK · EAST OF A9
      </text>
      <text x="0" y="-28" fill="#14241c" fontSize="20" fontWeight="700">
        {unitLabel} · {A10_META.type}
      </text>
      <text x="230" y="-28" fill="#3d5247" fontSize="11">
        SBUA {A10_META.sbuaSft.toLocaleString()} sft · Carpet {A10_META.carpetSft.toLocaleString()} sft · Balcony{" "}
        {A10_META.balconySft} sft
      </text>
      <text x={u(16)} y={-8} textAnchor="middle" fill="#c45a12" fontSize="12" fontWeight="700">
        NORTH
      </text>
      <text x={u(16)} y={u(44.6)} textAnchor="middle" fill="#14241c" fontSize="12" fontWeight="700">
        SOUTH
      </text>
      <text
        x={-22}
        y={u(18)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(-90 -22 ${u(18)})`}
      >
        WEST
      </text>
      <text
        x={u(50)}
        y={u(18)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(90 ${u(50)} ${u(18)})`}
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

      {A10_OPENINGS.map((opening) => (
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
        x={u(0.35)}
        y={u(6.2)}
        width={u(2.15)}
        height={u(5.6)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <text
        x={u(1.45)}
        y={u(9.1)}
        textAnchor="middle"
        fill="#7a5c22"
        fontSize="7"
        fontWeight="700"
        transform={`rotate(-90 ${u(1.45)} ${u(9.1)})`}
      >
        Counter
      </text>

      <WetFixture x={20.4} y={11.25} kind="wc" />
      <WetFixture x={25.4} y={11.25} kind="basin" />
      <WetFixture x={20.4} y={15.75} kind="wc" />
      <WetFixture x={23.6} y={15.75} kind="basin" />
      <WetFixture x={28.4} y={16.2} kind="wc" />
      <WetFixture x={28.4} y={21.4} kind="basin" />

      {A10_WINDOWS.map((item) => (
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

      {A10_DOORS.map((door) => {
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
                x={u(door.x + 1.4)}
                y={u(door.y + 3.4)}
                textAnchor="middle"
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

      {A10_ROOMS.filter((room) => room.kind !== "corridor" && room.label).map((room) => (
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

      <text x={u(-4.5)} y={u(39.4)} textAnchor="middle" fill="#3d5247" fontSize="10" fontWeight="700">
        Lift
      </text>
      <text x={u(16)} y={u(39.8)} textAnchor="middle" fill="#3d5247" fontSize="10" fontWeight="700">
        Common corridor
      </text>
      <text
        x={u(30.5)}
        y={u(36.6)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="7"
        fontWeight="700"
      >
        AC ledge
      </text>
      <text
        x={u(40)}
        y={u(19.2)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="10"
        fontWeight="700"
        transform={`rotate(90 ${u(40)} ${u(19.2)})`}
      >
        Lobby
      </text>

      <circle cx={u(4.6)} cy={u(31.4)} r="11" fill="#c0392b" />
      <text x={u(4.6)} y={u(31.8)} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">
        A10
      </text>

      <NorthRose x={-52} y={u(10)} />
      <text x="-52" y={u(16.4)} textAnchor="middle" fill="#3d5247" fontSize="8">
        N up · E right
      </text>
    </svg>
  );

  if (!framed) return drawing;

  return (
    <figure className="rounded-2xl bg-[#ebe6dc] p-3 ring-1 ring-[rgba(27,58,47,0.12)] md:p-5">
      {drawing}
      <figcaption className="mt-3 text-xs leading-5 text-[#3d5247]">
        Typical <strong>A10</strong> (east of A9, end of the A-block pair). North is the top of
        this drawing, south is the common corridor / entrance. Drawing and living/dining stay
        separate. 5' utility and 6' balcony are on the north; 4'-6" balcony is on the east. Lift,
        lobby and corridor are outside A10. Puja has no readable source dimension. No furniture.
        Apartment is not rotated or mirrored.
      </figcaption>
    </figure>
  );
}
