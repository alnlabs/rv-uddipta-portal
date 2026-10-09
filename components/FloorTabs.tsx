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
                ? "border-[#1e293b] bg-[#1e293b] text-[#f8fafc]"
                : "border-[rgba(15,23,42,0.14)] bg-[#ffffff] text-[#0f172a]"
            }`}
          >
            {floor}
          </button>
        );
      })}
    </div>
  );
}
