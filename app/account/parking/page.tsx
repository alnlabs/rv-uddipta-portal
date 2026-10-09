import { redirect } from "next/navigation";
import { addParkingBay, removeVehicle, setParkingBay } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { TextField } from "@/components/form-ui";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

type Bay = { id: number; label: string; kind: string; flat_id: number | null };
type Vehicle = { id: number; plate: string; label: string | null; flat_id: number };
type Guest = { id: number; visitor_name: string; flat_number: string; bay_id: number | null };

export default async function OfficeParkingPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/");
  if ((await resolveDeskAccess(profile.role, user, "parking")) === "none") {
    return <FeatureOff label="Parking" />;
  }

  const admin = createAdminClient();
  const [baysResult, vehiclesResult, insideResult, flatsResult] = await Promise.all([
    admin.from("parking_bays").select("id, label, kind, flat_id").order("label"),
    admin.from("vehicles").select("id, plate, label, flat_id").order("plate"),
    admin.from("visitor_passes").select("id, visitor_name, flat_number, bay_id").eq("status", "inside"),
    admin.from("flats").select("id, flat_number"),
  ]);
  const error = baysResult.error || vehiclesResult.error || insideResult.error || flatsResult.error;
  if (error) return <DeskError message={error.message} />;

  const bays = (baysResult.data ?? []) as Bay[];
  const vehicles = (vehiclesResult.data ?? []) as Vehicle[];
  const inside = (insideResult.data ?? []) as Guest[];
  const flatName = new Map((flatsResult.data ?? []).map((flat) => [flat.id as number, String(flat.flat_number)]));
  const homeBays = bays.filter((bay) => bay.kind === "resident");
  const visitorBays = bays.filter((bay) => bay.kind !== "resident");

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Parking</h1>
      <p className="mt-2 max-w-3xl text-[#475569]">
        Give a bay to a home, or keep it for visitors. A visitor who is inside stays in that bay until the gate frees it.
      </p>

      <form action={addParkingBay} className="field-panel mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <TextField label="Bay name" name="label" required hint="Such as B12 or Visitor 7." />
        <TextField label="Home number" name="flatNumber" hint="Leave empty to keep it as a visitor bay." />
        <button type="submit" className="btn-slate">Add bay</button>
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#0f172a]">Visitor bays</h2>
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {visitorBays.map((bay) => (
            <BayCard key={bay.id} bay={bay} home={null} guest={inside.find((pass) => pass.bay_id === bay.id) ?? null} />
          ))}
          {visitorBays.length === 0 ? <li className="text-sm text-[#475569]">No visitor bays.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#0f172a]">Home bays</h2>
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {homeBays.map((bay) => (
            <BayCard
              key={bay.id}
              bay={bay}
              home={bay.flat_id ? flatName.get(bay.flat_id) ?? null : null}
              guest={inside.find((pass) => pass.bay_id === bay.id) ?? null}
            />
          ))}
          {homeBays.length === 0 ? <li className="text-sm text-[#475569]">No bay is given to a home yet.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#0f172a]">Vehicles</h2>
        <ul className="mt-3 grid gap-2">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id} className="slab flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-[#0f172a]">
                <span className="font-semibold">{vehicle.plate}</span>
                {vehicle.label ? ` · ${vehicle.label}` : ""}
                <span className="text-[#475569]"> · {flatName.get(vehicle.flat_id) || "Home"}</span>
              </p>
              <form action={removeVehicle}>
                <input type="hidden" name="vehicleId" value={vehicle.id} />
                <button type="submit" className="btn-line">Remove</button>
              </form>
            </li>
          ))}
          {vehicles.length === 0 ? <li className="text-sm text-[#475569]">No vehicle is listed.</li> : null}
        </ul>
      </section>
    </section>
  );
}

function BayCard({
  bay,
  home,
  guest,
}: {
  bay: Bay
  home: string | null
  guest: Guest | null
}) {
  return (
    <li className="slab flex flex-col gap-3 p-4">
      <div>
        <p className="text-lg font-semibold text-[#0f172a]">{bay.label}</p>
        <p className="text-sm text-[#475569]">
          {home ? `${home}'s bay` : "Visitor bay"}
          {guest ? ` · ${guest.visitor_name} for ${guest.flat_number} is inside` : home ? "" : " · Free"}
        </p>
      </div>
      {guest ? null : (
        <form action={setParkingBay} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="bayId" value={bay.id} />
          <input type="hidden" name="mode" value="home" />
          <TextField
            label={home ? "Give to another home" : "Give to a home"}
            name="flatNumber"
            hint="Such as A101."
            className="min-w-[12rem] flex-1"
          />
          <button type="submit" className="btn-slate">Save</button>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        {home && !guest ? (
          <form action={setParkingBay}>
            <input type="hidden" name="bayId" value={bay.id} />
            <input type="hidden" name="mode" value="visitor" />
            <button type="submit" className="btn-line">Make it a visitor bay</button>
          </form>
        ) : null}
        {guest ? null : (
          <form action={setParkingBay}>
            <input type="hidden" name="bayId" value={bay.id} />
            <input type="hidden" name="mode" value="remove" />
            <button type="submit" className="btn-line">Remove bay</button>
          </form>
        )}
      </div>
    </li>
  );
}
