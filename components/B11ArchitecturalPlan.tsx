import {
  B11_DOORS,
  B11_EXTENT,
  B11_META,
  B11_OPENINGS,
  B11_ROOMS,
  B11_WINDOWS,
  splitB11Walls,
  type B11Door,
} from "@/lib/plans/b11";

const S = 10;
const FILL: Record<(typeof B11_ROOMS)[number]["kind"], string> = {
  room: "#f7f1e4",
  wet: "#dce4ea",
  balcony: "#d4c19a",
  utility: "#eee4d2",
  corridor: "#e4e0d6",
};

const DRAW_ORDER = [
  "corridor",
  "ac-ledge",
  "kit-foyer",
  "hall",
  "t3-south",
  "drawing",
  "dining",
  "kitchen",
  "bed-1",
  "bed-2",
  "bed-3",
  "balc-s",
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

function doorGeom(door: B11Door) {
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

function Bed({ x, y, w, h }: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }) {
  return (
    <g>
      <rect
        x={u(x)}
        y={u(y)}
        width={u(w)}
        height={u(h)}
        rx={3}
        fill="#efe8d8"
        stroke="#8a7350"
        strokeWidth="1"
      />
      <rect
        x={u(x + 0.15)}
        y={u(y + 0.15)}
        width={u(w - 0.3)}
        height={u(1.1)}
        rx={2}
        fill="#f7f2e6"
        stroke="#8a7350"
        strokeWidth="0.8"
      />
    </g>
  );
}

export function B11ArchitecturalPlan({
  framed = true,
  homeLabel,
}: {
  readonly framed?: boolean
  readonly homeLabel?: string
}) {
  const unitLabel = homeLabel ?? B11_META.unit;
  const vbW = u(B11_EXTENT.w + 16);
  const vbH = u(B11_EXTENT.h + 16);
  const walls = splitB11Walls();
  const rooms = [...B11_ROOMS].sort(
    (left, right) =>
      DRAW_ORDER.indexOf(left.id as (typeof DRAW_ORDER)[number]) -
      DRAW_ORDER.indexOf(right.id as (typeof DRAW_ORDER)[number]),
  );

  const drawing = (
    <svg
      viewBox={`-140 -70 ${vbW} ${vbH}`}
      className="h-auto w-full"
      role="img"
      aria-label="RV Uddiipta B11 typical 3BHK-E architectural base plan"
    >
      <rect x={-140} y={-70} width={vbW} height={vbH} fill="#cfc7b8" />
      <text x="-50" y="-52" fill="#7a5c22" fontSize="11" fontWeight="700" letterSpacing="1.6">
        RV UDDIIPTA · B-BLOCK · EAST OF B10
      </text>
      <text x="-50" y="-34" fill="#14241c" fontSize="20" fontWeight="700">
        {unitLabel} · {B11_META.type}
      </text>
      <text x="210" y="-34" fill="#3d5247" fontSize="11">
        SBUA {B11_META.sbuaSft.toLocaleString()} sft
      </text>
      <text x={u(22)} y={-16} textAnchor="middle" fill="#c45a12" fontSize="12" fontWeight="700">
        NORTH
      </text>
      <text x={u(22)} y={u(35.4)} textAnchor="middle" fill="#14241c" fontSize="12" fontWeight="700">
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
        x={u(54)}
        y={u(16)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(90 ${u(54)} ${u(16)})`}
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

      {B11_OPENINGS.map((opening) => (
        <rect
          key={opening.id}
          x={u(opening.x)}
          y={u(opening.y)}
          width={u(opening.w)}
          height={u(opening.h)}
          fill="#f7f1e4"
        />
      ))}

      <ellipse cx={u(14.8)} cy={u(9.4)} rx={u(2.6)} ry={u(1.7)} fill="#efe8d8" stroke="#8a7350" strokeWidth="1" />
      <rect x={u(2.2)} y={u(19.4)} width={u(7.2)} height={u(2.2)} rx={3} fill="#efe8d8" stroke="#8a7350" strokeWidth="1" />
      <rect x={u(10.4)} y={u(18.8)} width={u(0.6)} height={u(3.4)} fill="#efe8d8" stroke="#8a7350" strokeWidth="1" />
      <Bed x={31.6} y={6.2} w={6.4} h={5.2} />
      <rect x={u(40.2)} y={u(5.4)} width={u(1.5)} height={u(6.8)} fill="#efe8d8" stroke="#8a7350" strokeWidth="1" />
      <Bed x={17.4} y={17.2} w={6.2} h={5} />
      <rect x={u(15.4)} y={u(17.4)} width={u(1.4)} height={u(6.2)} fill="#efe8d8" stroke="#8a7350" strokeWidth="1" />
      <Bed x={29.2} y={17.2} w={6.4} h={5} />
      <rect x={u(37.8)} y={u(17.4)} width={u(1.4)} height={u(6.4)} fill="#efe8d8" stroke="#8a7350" strokeWidth="1" />

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
        y={u(4.35)}
        width={u(7.6)}
        height={u(1.65)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <text x={u(4.1)} y={u(5.45)} textAnchor="middle" fill="#7a5c22" fontSize="7" fontWeight="700">
        Counter
      </text>
      <rect
        x={u(0.35)}
        y={u(6.15)}
        width={u(1.65)}
        height={u(2.8)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <circle cx={u(6.4)} cy={u(5.15)} r="5" fill="none" stroke="#4a5a62" strokeWidth="1" />

      <WetFixture x={19.3} y={4.4} kind="wc" />
      <WetFixture x={19.7} y={8.6} kind="basin" />
      <WetFixture x={23.4} y={4.4} kind="wc" />
      <WetFixture x={25.2} y={8.6} kind="basin" />
      <WetFixture x={39.8} y={15.9} kind="wc" />
      <WetFixture x={41.4} y={19.6} kind="basin" />

      {B11_WINDOWS.map((item) => (
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

      {B11_DOORS.map((door) => {
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

      {B11_ROOMS.filter((room) => room.kind !== "corridor" && room.label).map((room) => {
        const cx = room.id === "dining" ? room.x + room.w / 2 + 1.4 : room.x + room.w / 2;
        const cy = room.id === "dining" ? room.y + room.h / 2 - 1.4 : room.y + room.h / 2;
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
        y={u(20.4)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="10"
        fontWeight="700"
        transform={`rotate(-90 ${u(-4.5)} ${u(20.4)})`}
      >
        Common corridor
      </text>
      <text
        x={u(-0.8)}
        y={u(21)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="7"
        fontWeight="700"
        transform={`rotate(-90 ${u(-0.8)} ${u(21)})`}
      >
        AC ledge
      </text>

      <circle cx={u(2.6)} cy={u(21.6)} r="11" fill="#c0392b" />
      <text x={u(2.6)} y={u(22)} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
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
        Typical <strong>B11</strong> (east of B10). North is the top of this drawing. 3BHK-E with
        separate dining and puja. Kitchen 8'-4½" × 7'-9" sits under the 4'-1½" wash. Drawing is 15'
        × 11" with a 5' south balcony. Toilet 3 sits between bedroom 3 and the 5' east balcony.
        West corridor and AC ledge are outside B11. Apartment is not rotated or mirrored.
      </figcaption>
    </figure>
  );
}
