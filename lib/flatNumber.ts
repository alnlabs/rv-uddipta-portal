const WINGS = new Set(["A", "B"]);

export function formatFlatNumber(wing: string, floor: number, unit: number) {
  return `${wing}${floor}${String(unit).padStart(2, "0")}`;
}

export function parseFlatNumber(raw: string) {
  const value = String(raw || "").replace(/\s+/g, "").toUpperCase();
  const match = value.match(/^([AB])(\d{1,2})(\d{2})$/);
  if (!match) return null;

  const wing = match[1];
  const floor = Number(match[2]);
  const unit = Number(match[3]);
  if (!WINGS.has(wing) || floor < 1 || floor > 10 || unit < 1 || unit > 15) {
    return null;
  }

  return {
    flatNumber: formatFlatNumber(wing, floor, unit),
    wing,
    floor,
    unit,
  };
}
