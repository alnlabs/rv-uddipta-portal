import type { Occupancy, PublicFlat, SaleStatus } from "@/lib/types";

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

export function saleOccupancyLabel(
  flat: Pick<PublicFlat, "saleStatus" | "occupancy">,
) {
  if (flat.saleStatus !== "sold") return "Unsold";
  if (flat.occupancy === "rented") return "Rented";
  return "Owner stay";
}

export function saleOccupancyTone(label: string | null) {
  if (label === "Rented") {
    return "bg-[#f0e0d4] text-[#6d3a22] ring-1 ring-[rgba(154,91,60,0.28)]";
  }
  if (label === "Owner stay") {
    return "bg-[#d8ebe1] text-[#103126] ring-1 ring-[rgba(47,120,80,0.28)]";
  }
  return "bg-[#ebe6dc] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.12)]";
}

export function listingChipTone(kind: "rent" | "resale") {
  if (kind === "rent") {
    return "bg-[#f0e0d4] text-[#6d3a22] ring-1 ring-[rgba(154,91,60,0.28)]";
  }
  return "bg-[#f0e6d0] text-[#103126] ring-1 ring-[rgba(201,164,92,0.35)]";
}

export function isSoldFlat(
  flat: Pick<PublicFlat, "saleStatus" | "ownerName">,
) {
  return flat.saleStatus === "sold" || Boolean(flat.ownerName);
}

export function possessionLabel(flat: Pick<
  PublicFlat,
  "saleStatus" | "ownerName" | "registration" | "interior" | "ceremony" | "moving"
>) {
  if (!isSoldFlat(flat)) return null;
  if (flat.moving === "moved_in") return "Moved in";
  if (flat.ceremony === "completed") return "Ceremony done";
  if (flat.interior === "completed") return "Interior done";
  if (flat.interior === "in_progress") return "Interior on";
  if (flat.registration === "completed") return "Registered";
  return "Just linked";
}

export function possessionTone(label: string | null) {
  if (label === "Moved in") {
    return "bg-[#d5e6dc] text-[#103126] ring-1 ring-[rgba(79,138,108,0.3)]";
  }
  if (label === "Ceremony done") {
    return "bg-[#f0e6d0] text-[#103126] ring-1 ring-[rgba(201,164,92,0.35)]";
  }
  if (label === "Interior done" || label === "Interior on") {
    return "bg-[#f0e0d4] text-[#6d3a22] ring-1 ring-[rgba(154,91,60,0.28)]";
  }
  if (label === "Registered") {
    return "bg-[#d8ebe1] text-[#103126] ring-1 ring-[rgba(47,90,72,0.28)]";
  }
  return "bg-[#ebe6dc] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.12)]";
}

export function normalizeSaleFields(input: {
  saleStatus: SaleStatus
  occupancy: Occupancy | null
  tenantName: string
  tenantPhone: string
  openForRent?: boolean
  openForResale?: boolean
}) {
  if (input.saleStatus === "unsold") {
    return {
      sale_status: "unsold" as const,
      occupancy: null,
      tenant_name: null,
      tenant_phone: null,
      open_for_rent: false,
      open_for_resale: false,
    };
  }
  const occupancy = input.occupancy === "rented" ? "rented" : "owner_stay";
  if (occupancy === "owner_stay") {
    return {
      sale_status: "sold" as const,
      occupancy: "owner_stay" as const,
      tenant_name: null,
      tenant_phone: null,
      open_for_rent: Boolean(input.openForRent),
      open_for_resale: Boolean(input.openForResale),
    };
  }
  return {
    sale_status: "sold" as const,
    occupancy: "rented" as const,
    tenant_name: input.tenantName.trim() || null,
    tenant_phone: input.tenantPhone.trim() || null,
    open_for_rent: Boolean(input.openForRent),
    open_for_resale: Boolean(input.openForResale),
  };
}
