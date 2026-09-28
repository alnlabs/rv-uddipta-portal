import {
  B15_DOORS,
  B15_EXTENT,
  B15_META,
  B15_OPENINGS,
  B15_ROOMS,
  B15_WINDOWS,
  splitB15Walls,
  type B15Door,
} from "@/lib/plans/b15";

const S = 10;
const FILL: Record<(typeof B15_ROOMS)[number]["kind"], string> = {
  room: "#f7f1e4",
  wet: "#dce4ea",
  balcony: "#d4c19a",
  utility: "#eee4d2",
  corridor: "#e4e0d6",
};

const DRAW_ORDER = [
  "corridor",
  "ac-ledge",
  "t1-foyer",
  "hall",
  "drawing",
  "dining",
  "kitchen",
  "store",
  "bed-1",
  "bed-2",
  "bed-3",
  "bed-3-alcove",
  "balc-n",
  "balc-e",
  "wash",
  "puja",
  "toilet-1",
  "toilet-2",
  "toilet-3",
] as const;

function u(n: number) {
  return n * S;
}

function doorGeom(door: B15Door) {
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

export function B15ArchitecturalPlan({
  framed = true,
  homeLabel,
}: {
  readonly framed?: boolean
  readonly homeLabel?: string
}) {
  const unitLabel = homeLabel ?? B15_META.unit;
  const vbW = u(B15_EXTENT.w + 16);
  const vbH = u(B15_EXTENT.h + 16);
  const walls = splitB15Walls();
  const rooms = [...B15_ROOMS].sort(
    (left, right) =>
      DRAW_ORDER.indexOf(left.id as (typeof DRAW_ORDER)[number]) -
      DRAW_ORDER.indexOf(right.id as (typeof DRAW_ORDER)[number]),
  );

  const drawing = (
    <svg
      viewBox={`-140 -70 ${vbW} ${vbH}`}
      className="h-auto w-full"
      role="img"
      aria-label="RV Uddiipta B15 typical 3BHK-E architectural base plan"
    >
      <rect x={-140} y={-70} width={vbW} height={vbH} fill="#cfc7b8" />
      <text x="-50" y="-52" fill="#7a5c22" fontSize="11" fontWeight="700" letterSpacing="1.6">
        RV UDDIIPTA · B-BLOCK · EAST OF B9
      </text>
      <text x="-50" y="-34" fill="#14241c" fontSize="20" fontWeight="700">
        {unitLabel} · {B15_META.type}
      </text>
      <text x="210" y="-34" fill="#3d5247" fontSize="11">
        SBUA {B15_META.sbuaSft.toLocaleString()} sft · Carpet {B15_META.carpetSft.toLocaleString()} sft · Balcony{" "}
        {B15_META.balconySft} sft
      </text>
      <text x={u(20)} y={-16} textAnchor="middle" fill="#c45a12" fontSize="12" fontWeight="700">
        NORTH
      </text>
      <text x={u(20)} y={u(34.4)} textAnchor="middle" fill="#14241c" fontSize="12" fontWeight="700">
        SOUTH
      </text>
      <text
        x={-118}
        y={u(16)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(-90 -118 ${u(16)})`}
      >
        WEST
      </text>
      <text
        x={u(50)}
        y={u(16)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(90 ${u(50)} ${u(16)})`}
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

      {B15_OPENINGS.map((opening) => (
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
        x={u(0.4)}
        y={u(4.2)}
        width={u(9.8)}
        height={u(1.85)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <text x={u(5.3)} y={u(5.4)} textAnchor="middle" fill="#7a5c22" fontSize="7" fontWeight="700">
        Counter
      </text>
      <rect
        x={u(0.4)}
        y={u(6.2)}
        width={u(1.85)}
        height={u(3.4)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <circle cx={u(7.8)} cy={u(5.1)} r="5" fill="none" stroke="#4a5a62" strokeWidth="1" />

      <WetFixture x={20.85} y={5.2} kind="wc" />
      <WetFixture x={21.3} y={9.4} kind="basin" />
      <WetFixture x={25.0} y={5.2} kind="wc" />
      <WetFixture x={25.5} y={11.2} kind="basin" />
      <WetFixture x={36.6} y={18.7} kind="wc" />
      <WetFixture x={37.1} y={23.6} kind="basin" />

      {B15_WINDOWS.map((item) => (
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

      {B15_DOORS.map((door) => {
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
                x={u(door.x - 5.6)}
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

      {B15_ROOMS.filter((room) => room.kind !== "corridor" && room.label).map((room) => {
        const cx = room.x + room.w / 2;
        const cy = room.y + room.h / 2;
        const vertical = room.id === "balc-e" || room.id === "toilet-3";
        const size = room.w < 5.5 || room.h < 4.5 || vertical ? 8 : 10;
        return (
          <g
            key={`${room.id}-label`}
            transform={vertical ? `rotate(-90 ${u(cx)} ${u(cy)})` : undefined}
          >
            <text
              x={u(cx)}
              y={u(cy - (room.dim ? 0.35 : 0))}
              textAnchor="middle"
              fill="#14241c"
              fontSize={size}
              fontWeight="700"
            >
              {room.label}
            </text>
            {room.dim ? (
              <text
                x={u(cx)}
                y={u(cy + 1.15)}
                textAnchor="middle"
                fill="#3d5247"
                fontSize="8"
              >
                {room.dim}
              </text>
            ) : null}
          </g>
        );
      })}

      <text
        x={u(-4.5)}
        y={u(24)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="10"
        fontWeight="700"
        transform={`rotate(-90 ${u(-4.5)} ${u(24)})`}
      >
        Common corridor
      </text>
      <text x={u(-0.8)} y={u(24.6)} textAnchor="middle" fill="#3d5247" fontSize="7" fontWeight="700" transform={`rotate(-90 ${u(-0.8)} ${u(24.6)})`}>
        AC ledge
      </text>

      <circle cx={u(2.6)} cy={u(24.2)} r="11" fill="#c0392b" />
      <text x={u(2.6)} y={u(24.6)} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
        {unitLabel}
      </text>

      <NorthRose x={-118} y={u(8)} />
      <text x="-118" y={u(14.4)} textAnchor="middle" fill="#3d5247" fontSize="8">
        N up · E right
      </text>
    </svg>
  );

  if (!framed) return drawing;

  return (
    <figure className="rounded-2xl bg-[#ebe6dc] p-3 ring-1 ring-[rgba(27,58,47,0.12)] md:p-5">
      {drawing}
      <figcaption className="mt-3 text-xs leading-5 text-[#3d5247]">
        Typical <strong>B15</strong> (east of B9). North is the top of this drawing. 3BHK-E with
        separate dining, store and puja. Kitchen 10'-7½" × 10' sits under the 4' wash. Drawing is
        15' × 12'-3". Three toilets stay separate. 5' balcony on the north and 5' balcony on the
        east. West corridor and AC ledge are outside B15. No furniture. Apartment is not rotated
        or mirrored.
      </figcaption>
    </figure>
  );
}
