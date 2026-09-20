import { FlatListing } from "@/components/FlatListing";
import { possessionLabel } from "@/lib/flatDisplay";
import type { PublicFlat } from "@/lib/types";

export default function FlatGrid({ floor, flats }: { floor: number; flats: PublicFlat[] }) {
  return (
    <FlatListing
      floor={floor}
      showOwners
      flats={flats.map((flat) => ({
        flatNumber: flat.flatNumber,
        wing: flat.wing,
        unit: flat.unit,
        type: flat.type,
        facing: flat.facing,
        areaSqft: flat.areaSqft,
        ownerName: flat.ownerName,
        statusLabel: possessionLabel(flat),
      }))}
    />
  );
}
