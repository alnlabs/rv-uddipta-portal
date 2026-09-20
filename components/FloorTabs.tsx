"use client";

export function FloorTabs({
  floors,
  activeFloor,
  onChange,
}: {
  floors: number[]
  activeFloor: number | null
  onChange: (floor: number) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Floors">
      {floors.map((floor) => {
        const active = activeFloor === floor;
        return (
          <button
            key={floor}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(floor)}
            className={`flex min-h-12 flex-col items-center justify-center rounded-xl border ${
              active
                ? "border-[#1b3a2f] bg-[#1b3a2f] text-[#e8d5a3]"
                : "border-[rgba(27,58,47,0.14)] bg-[#fffcf5] text-[#3d5247]"
            }`}
          >
            <span className="text-[0.65rem] tracking-wider uppercase">Floor</span>
            <strong className={active ? "text-white" : "text-[#14241c]"}>{floor}</strong>
          </button>
        );
      })}
    </div>
  );
}
