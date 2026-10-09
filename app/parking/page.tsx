import { redirect } from "next/navigation";
import { removeVehicle, saveVehicle } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { ChoiceField, TextField } from "@/components/form-ui";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function ParkingPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/parking");
  if (!isCommunityRole(profile.role)) redirect("/register");
  const access = await resolveDeskAccess(profile.role, user, "parking");
  if (access === "none") return <FeatureOff label="Parking" />;

  const admin = createAdminClient();
  const [{ data: vehicles, error: vehicleError }, { data: bays, error: bayError }, { data: inside }] =
    await Promise.all([
      profile.flatId
        ? admin.from("vehicles").select("id, plate, label").eq("flat_id", profile.flatId)
        : Promise.resolve({ data: [], error: null }),
      admin.from("parking_bays").select("id, label, kind, flat_id").order("label"),
      admin.from("visitor_passes").select("id, visitor_name, flat_number, bay_id").eq("status", "inside"),
    ]);
  if (vehicleError || bayError) return <DeskError message={vehicleError?.message || bayError?.message || ""} />;

  const flatIds = (bays ?? []).map((bay) => bay.flat_id).filter((id): id is number => id != null);
  const { data: flats } = flatIds.length
    ? await admin.from("flats").select("id, flat_number").in("id", flatIds)
    : { data: [] as { id: number; flat_number: string }[] };
  const flatName = new Map((flats ?? []).map((flat) => [flat.id, flat.flat_number]));
  const canChange = access === "manage" && Boolean(profile.flatId);

  return (
    <section className="page-gutter max-w-5xl py-8 md:py-12">
      <p className="eyebrow">Parking</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Parking</h1>
      <p className="mt-2 max-w-xl text-[#475569]">
        List the vehicles for this home. Bays are set by the office.
      </p>
      {canChange ? (
        <form action={saveVehicle} className="field-panel mt-6 grid gap-4">
          <ChoiceField
            legend="What is it?"
            name="label"
            defaultValue="Car"
            options={[
              { value: "Car", label: "Car" },
              { value: "Bike", label: "Bike" },
              { value: "Other", label: "Other" },
            ]}
          />
          <TextField label="Vehicle number" name="plate" required hint="As on the number plate." />
          <button type="submit" className="btn-slate w-fit">Add vehicle</button>
        </form>
      ) : null}
      <h2 className="mt-8 text-lg font-semibold text-[#0f172a]">This home</h2>
      <ul className="mt-3 grid gap-2">
        {(vehicles ?? []).map((vehicle) => (
          <li key={vehicle.id} className="slab flex items-center justify-between gap-3 px-4 py-3">
            <p className="font-semibold text-[#0f172a]">
              {vehicle.plate}
              {vehicle.label ? <span className="font-medium text-[#475569]"> · {vehicle.label}</span> : null}
            </p>
            {canChange ? (
              <form action={removeVehicle}>
                <input type="hidden" name="vehicleId" value={vehicle.id} />
                <button type="submit" className="btn-line">Remove</button>
              </form>
            ) : null}
          </li>
        ))}
        {!vehicles?.length ? <li className="text-sm text-[#475569]">No vehicle listed for this home.</li> : null}
      </ul>
      <h2 className="mt-8 text-lg font-semibold text-[#0f172a]">Bays</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {(bays ?? []).map((bay) => {
          const guest = (inside ?? []).find((pass) => pass.bay_id === bay.id);
          const home = bay.flat_id ? flatName.get(bay.flat_id) : null;
          const mine = bay.flat_id != null && bay.flat_id === profile.flatId;
          return (
            <li key={bay.id} className="slab px-4 py-3">
              <p className="font-semibold text-[#0f172a]">{bay.label}</p>
              <p className="text-sm text-[#475569]">
                {mine ? "This home's bay" : home ? `${home}'s bay` : "Visitor bay"}
                {guest ? ` · ${guest.visitor_name} for ${guest.flat_number} is inside` : home ? "" : " · Free"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
