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
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="tablist" aria-label="Floors">
      {floors.map((floor) => {
        const active = activeFloor === floor;
        return (
          <button
            key={floor}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(floor)}
            aria-label={`Floor ${floor}`}
            className={`flex min-h-14 items-center justify-center rounded-xl border text-xl font-semibold ${
              active
                ? "border-[#1b3a2f] bg-[#1b3a2f] text-[#e8d5a3]"
                : "border-[rgba(27,58,47,0.14)] bg-[#fffcf5] text-[#14241c]"
            }`}
          >
            {floor}
          </button>
        );
      })}
    </div>
  );
}
