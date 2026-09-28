import {
  B14_DOORS,
  B14_EXTENT,
  B14_META,
  B14_OPENINGS,
  B14_ROOMS,
  B14_WINDOWS,
  splitB14Walls,
  type B14Door,
} from "@/lib/plans/b14";

const S = 10;
const FILL: Record<(typeof B14_ROOMS)[number]["kind"], string> = {
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
  "balc-ne",
  "balc-se",
  "wash",
  "puja",
  "toilet-1",
  "toilet-2",
  "toilet-3",
] as const;

function u(n: number) {
  return n * S;
}

function doorGeom(door: B14Door) {
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

export function B14ArchitecturalPlan({
  framed = true,
  homeLabel,
  compact = false,
}: {
  readonly framed?: boolean
  readonly homeLabel?: string
  readonly compact?: boolean
}) {
  const unitLabel = homeLabel ?? B14_META.unit;
  const vbW = u(B14_EXTENT.w + 16);
  const vbH = u(B14_EXTENT.h + (compact ? 8 : 16));
  const padX = compact ? -128 : -140;
  const padY = compact ? -28 : -70;
  const walls = splitB14Walls();
  const rooms = [...B14_ROOMS].sort(
    (left, right) =>
      DRAW_ORDER.indexOf(left.id as (typeof DRAW_ORDER)[number]) -
      DRAW_ORDER.indexOf(right.id as (typeof DRAW_ORDER)[number]),
  );

  const drawing = (
    <svg
      viewBox={`${padX} ${padY} ${vbW} ${vbH}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${unitLabel} apartment plan. North at top, east at right.`}
    >
      <rect x={padX} y={padY} width={vbW} height={vbH} fill="#cfc7b8" />
      {compact ? null : (
        <>
          <text x="-50" y="-52" fill="#7a5c22" fontSize="11" fontWeight="700" letterSpacing="1.6">
            RV UDDIIPTA · B-BLOCK · SOUTH OF B15
          </text>
          <text x="-50" y="-34" fill="#14241c" fontSize="20" fontWeight="700">
            {unitLabel} · {B14_META.type}
          </text>
          <text x="210" y="-34" fill="#3d5247" fontSize="11">
            SBUA {B14_META.sbuaSft.toLocaleString()} sft
          </text>
        </>
      )}
      <text x={u(22)} y={-16} textAnchor="middle" fill="#c45a12" fontSize="12" fontWeight="700">
        NORTH
      </text>
      <text x={u(22)} y={u(29.2)} textAnchor="middle" fill="#14241c" fontSize="12" fontWeight="700">
        SOUTH
      </text>
      <text
        x={-118}
        y={u(14)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(-90 -118 ${u(14)})`}
      >
        WEST
      </text>
      <text
        x={u(53)}
        y={u(14)}
        textAnchor="middle"
        fill="#14241c"
        fontSize="12"
        fontWeight="700"
        transform={`rotate(90 ${u(53)} ${u(14)})`}
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

      {B14_OPENINGS.map((opening) => (
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
        width={u(9.2)}
        height={u(1.7)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <text x={u(5)} y={u(5.3)} textAnchor="middle" fill="#7a5c22" fontSize="7" fontWeight="700">
        Counter
      </text>
      <rect
        x={u(0.4)}
        y={u(6.1)}
        width={u(1.7)}
        height={u(2.8)}
        fill="#efe2c8"
        stroke="#7a5c22"
        strokeWidth="1"
      />
      <circle cx={u(7.4)} cy={u(5.05)} r="5" fill="none" stroke="#4a5a62" strokeWidth="1" />

      <WetFixture x={20.85} y={4.3} kind="wc" />
      <WetFixture x={21.3} y={8.4} kind="basin" />
      <WetFixture x={25.0} y={4.3} kind="wc" />
      <WetFixture x={26.4} y={8.4} kind="basin" />
      <WetFixture x={27.3} y={15.6} kind="wc" />
      <WetFixture x={27.7} y={19.4} kind="basin" />

      {B14_WINDOWS.map((item) => (
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

      {B14_DOORS.map((door) => {
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

      {B14_ROOMS.filter((room) => room.kind !== "corridor" && room.label).map((room) => {
        const cx = room.id === "dining" ? room.x + room.w / 2 + 1.6 : room.x + room.w / 2;
        const cy = room.id === "dining" ? room.y + room.h / 2 - 1.2 : room.y + room.h / 2;
        const vertical = room.id === "balc-ne" || room.id === "balc-se" || room.id === "toilet-3";
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
        y={u(20.6)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="10"
        fontWeight="700"
        transform={`rotate(-90 ${u(-4.5)} ${u(20.6)})`}
      >
        Common corridor
      </text>
      <text
        x={u(-0.8)}
        y={u(20.8)}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="7"
        fontWeight="700"
        transform={`rotate(-90 ${u(-0.8)} ${u(20.8)})`}
      >
        AC ledge
      </text>

      <circle cx={u(2.6)} cy={u(20.8)} r={unitLabel.length > 3 ? 13 : 11} fill="#c0392b" />
      <text
        x={u(2.6)}
        y={u(21.2)}
        textAnchor="middle"
        fill="#fff"
        fontSize={unitLabel.length > 3 ? 8 : 10}
        fontWeight="700"
      >
        {unitLabel}
      </text>

      <NorthRose x={-118} y={u(7)} />
      <text x="-118" y={u(13.4)} textAnchor="middle" fill="#3d5247" fontSize="8">
        N up · E right
      </text>
    </svg>
  );

  if (!framed) return drawing;

  return (
    <figure className="rounded-2xl bg-[#ebe6dc] p-2 ring-1 ring-[rgba(27,58,47,0.12)] md:p-3">
      {drawing}
      <figcaption className="mt-2 text-xs leading-5 text-[#3d5247]">
        {compact ? (
          <>
            <strong>{unitLabel}</strong>
            {" · North up · East right · West corridor"}
          </>
        ) : (
          <>
            Typical <strong>B14</strong> (south of B15). North is the top of this drawing. 3BHK-E with
            separate dining and puja — no store. Kitchen 10'-½" × 7'-9" sits under the 4' wash. Drawing
            is 16' × 11". Bedroom 1 has a 4' east balcony; bedroom 3 has a 5' east balcony. Toilet 3
            sits between the two south bedrooms. West corridor and AC ledge are outside B14. No
            furniture. Apartment is not rotated or mirrored.
          </>
        )}
      </figcaption>
    </figure>
  );
}
