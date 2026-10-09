export const BOOKING_SLOTS = [
  { value: "06:00–09:00", label: "Morning, 6 to 9" },
  { value: "09:00–12:00", label: "Morning, 9 to 12" },
  { value: "12:00–16:00", label: "Afternoon, 12 to 4" },
  { value: "16:00–19:00", label: "Evening, 4 to 7" },
  { value: "19:00–22:00", label: "Evening, 7 to 10" },
] as const;

export function bookingSlot(value: string) {
  return BOOKING_SLOTS.find((slot) => slot.value === value) ?? null;
}
