import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Building3DLoader } from "@/components/Building3DLoader";
import type { ModelFlat } from "@/components/Building3DView";
import { possessionLabel } from "@/lib/flatDisplay";
import { mapPublicFlat } from "@/lib/flats";
import { INVENTORY } from "@/lib/inventory";
import { createClient } from "@/utils/supabase/server";

export default async function ModelPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ownFlat } = await supabase
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();

  let flats: ModelFlat[] = INVENTORY.map((flat) => ({
    flatNumber: flat.flatNumber,
    wing: flat.wing,
    floor: flat.floor,
    unit: flat.unit,
    type: flat.type,
    facing: flat.facing,
    areaSqft: flat.areaSqft,
  }));

  const { data: rows } = await supabase.from("flats_public").select();
  const byNumber = new Map(
    (rows ?? [])
      .map((row) => mapPublicFlat(row))
      .filter((flat) => Boolean(flat))
      .map((flat) => [flat!.flatNumber, flat!]),
  );
  flats = flats.map((flat) => {
    const owned = byNumber.get(flat.flatNumber);
    if (!owned) return flat;
    return {
      ...flat,
      ownerName: owned.ownerName,
      statusLabel: possessionLabel(owned),
    };
  });

  return (
    <section className="mx-auto w-[calc(100%-1.25rem)] py-6 md:w-[min(1100px,calc(100%-2rem))] md:py-10">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#c9a45c] uppercase">
        After login
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
        3D layout
      </h1>
      <p className="mt-2 max-w-2xl text-[#3d5247]">
        Interactive schematic of all 238 brochure flats. This is a massing model
        from the masterplan, not a photorealistic BIM tour.
      </p>
      <div className="mt-5">
        <Building3DLoader flats={flats} myFlatNumber={ownFlat?.flat_number} />
      </div>
    </section>
  );
}
