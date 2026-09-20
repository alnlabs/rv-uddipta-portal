import type { PublicFlat } from "@/lib/types";

export function facingLabel(facing: string) {
  if (facing === "E") return "East";
  if (facing === "W") return "West";
  return facing || "";
}

export function typeLabel(type: string) {
  if (type === "2BHK") return "2 BHK";
  if (type === "3BHK") return "3 BHK";
  return type;
}

export function possessionLabel(flat: Pick<
  PublicFlat,
  "ownerName" | "registration" | "interior" | "ceremony" | "moving"
>) {
  if (!flat.ownerName) return null;
  if (flat.moving === "moved_in") return "Moved in";
  if (flat.ceremony === "completed") return "Ceremony done";
  if (flat.interior === "completed") return "Interior done";
  if (flat.interior === "in_progress") return "Interior on";
  if (flat.registration === "completed") return "Registered";
  return "Just linked";
}

export function possessionTone(label: string | null) {
  if (label === "Moved in") return "bg-[rgba(79,138,108,0.22)] text-[#103126]";
  if (label === "Ceremony done") return "bg-[rgba(201,164,92,0.24)] text-[#103126]";
  if (label === "Interior done" || label === "Interior on") {
    return "bg-[rgba(154,91,60,0.16)] text-[#6d3a22]";
  }
  if (label === "Registered") return "bg-[rgba(47,90,72,0.18)] text-[#103126]";
  return "bg-[rgba(27,58,47,0.06)] text-[#3d5247]";
}
