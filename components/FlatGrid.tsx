import { FlatListing } from "@/components/FlatListing";
import type { MemberSummary } from "@/lib/boardData";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import type { PublicFlat } from "@/lib/types";

export default function FlatGrid({
  floor,
  flats,
  membersByFlatId = {},
  showOwners = true,
}: {
  floor: number
  flats: PublicFlat[]
  membersByFlatId?: Record<number, MemberSummary[]>
  showOwners?: boolean
}) {
  return (
    <FlatListing
      floor={floor}
      showOwners={showOwners}
      flats={flats.map((flat) => ({
        flatNumber: flat.flatNumber,
        wing: flat.wing,
        unit: flat.unit,
        type: flat.type,
        facing: flat.facing,
        areaSqft: flat.areaSqft,
        saleStatus: flat.saleStatus,
        occupancyLabel: saleOccupancyLabel(flat),
        openForRent: flat.openForRent,
        openForResale: flat.openForResale,
        ownerName: flat.ownerName || undefined,
        ownerEmail: flat.ownerEmail || undefined,
        phoneMasked: flat.phoneMasked || undefined,
        tenantName: flat.tenantName || undefined,
        tenantPhoneMasked: flat.tenantPhoneMasked || undefined,
        statusLabel: possessionLabel(flat),
        memberNames: (membersByFlatId[flat.id] ?? []).map((m) => m.name),
      }))}
    />
  );
}
