import { cookies } from "next/headers";
import { BuildingHighlights } from "@/components/BuildingHighlights";
import { HomeBoard } from "@/components/HomeBoard";
import { PublicFloorGuide } from "@/components/PublicFloorGuide";
import { PublicGate } from "@/components/PublicGate";
import { groupByFloor, mapPublicFlat } from "@/lib/flats";
import type { PublicFlat } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PublicGate />;
  }

  const { data: ownFlat } = await supabase
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownFlat) {
    return (
      <>
        <section className="mx-auto w-[calc(100%-1.25rem)] py-10 md:w-[min(720px,calc(100%-2rem))]">
          <h1 className="text-3xl font-semibold tracking-tight text-[#14241c]">
            Waiting for approval
          </h1>
          <p className="mt-3 text-[#3d5247]">
            Your account is not linked to an approved flat yet. Owner names,
            phones, and possession stay hidden. Brochure details below are
            public.
          </p>
        </section>
        <BuildingHighlights showSnapshot={false} />
        <PublicFloorGuide />
      </>
    );
  }

  const { data: rows, error } = await supabase
    .from("flats_public")
    .select()
    .order("floor")
    .order("unit");

  const flats = (rows ?? [])
    .map((row) => mapPublicFlat(row))
    .filter((flat): flat is PublicFlat => Boolean(flat));

  return <HomeBoard data={groupByFloor(flats)} error={error?.message ?? ""} />;
}
