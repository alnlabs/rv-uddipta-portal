import { redirect } from "next/navigation";
import { bookAmenity, decideBooking, saveAmenityHours } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { DateField } from "@/components/form-ui";
import { BOOKING_SLOTS } from "@/lib/bookingSlots";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canManageAdmin, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function AmenitiesPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/amenities");
  if (!isCommunityRole(profile.role)) redirect("/register");
  const access = await resolveDeskAccess(profile.role, user, "amenities");
  if (access === "none") return <FeatureOff label="Amenities" />;

  const admin = createAdminClient();
  const office = access === "manage" && (canManageAdmin(profile.role, user) || profile.role === "facility");
  const canBook = access === "manage";
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: spaces, error }, { data: bookings }] = await Promise.all([
    admin.from("amenities").select("id, name, hours_note, enabled").eq("enabled", true).order("name"),
    admin
      .from("amenity_bookings")
      .select("id, amenity_id, resident_name, flat_number, starts_on, slot, status, user_id")
      .in("status", ["pending", "confirmed"])
      .gte("starts_on", today)
      .order("starts_on", { ascending: true })
      .limit(200),
  ]);
  if (error) return <DeskError message={error.message} />;

  const mine = (bookings ?? []).filter((row) => row.user_id === user.id);
  const pending = (bookings ?? []).filter((row) => row.status === "pending");

  return (
    <section className="page-gutter max-w-5xl py-8 md:py-12">
      <p className="eyebrow">Services</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Amenities</h1>
      <p className="mt-2 text-[#475569]">Book a shared space. The office confirms or refuses.</p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {(spaces ?? []).map((space) => (
          <li key={space.id} className="slab p-4">
            <h2 className="text-lg font-semibold text-[#0f172a]">{space.name}</h2>
            <p className="mt-1 text-sm text-[#475569]">{space.hours_note || "Ask the office for hours."}</p>
            <TakenSlots rows={(bookings ?? []).filter((row) => row.amenity_id === space.id)} />
            {canBook ? (
              <form action={bookAmenity} className="mt-3 grid gap-2">
                <input type="hidden" name="amenityId" value={space.id} />
                <DateField label="Date" name="startsOn" required notBeforeToday />
                <select name="slot" required className="field-control" defaultValue="">
                  <option value="" disabled>Choose a time</option>
                  {BOOKING_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
                <button type="submit" className="btn-slate w-fit">Request booking</button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-[#475569]">You can see the spaces. You cannot book one.</p>
            )}
            {office ? (
              <form action={saveAmenityHours} className="mt-3 flex gap-2">
                <input type="hidden" name="amenityId" value={space.id} />
                <input name="hours" defaultValue={space.hours_note} className="field-control" />
                <button type="submit" className="btn-line">Save hours</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">My bookings</h2>
      <BookingList rows={mine} spaces={spaces ?? []} office={false} />
      {office ? (
        <>
          <h2 className="mt-8 text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Waiting for the office</h2>
          <BookingList rows={pending} spaces={spaces ?? []} office />
        </>
      ) : null}
    </section>
  );
}

function TakenSlots({
  rows,
}: {
  rows: { starts_on: string; slot: string; flat_number: string | null; status: string }[]
}) {
  if (!rows.length) return null;
  return (
    <ul className="mt-3 grid gap-1">
      {rows.slice(0, 6).map((row) => (
        <li key={`${row.starts_on}-${row.slot}-${row.flat_number}`} className="text-sm text-[#475569]">
          Taken · {row.starts_on} · {row.slot}
          {row.flat_number ? ` · ${row.flat_number}` : ""}
        </li>
      ))}
    </ul>
  );
}

function BookingList({
  rows,
  spaces,
  office,
}: {
  rows: { id: number; amenity_id: number; resident_name: string; flat_number: string | null; starts_on: string; slot: string; status: string }[]
  spaces: { id: number; name: string }[]
  office: boolean
}) {
  const name = new Map(spaces.map((space) => [space.id, space.name]));
  if (!rows.length) return <p className="mt-3 text-sm text-[#475569]">Nothing here.</p>;
  return (
    <ul className="mt-3 grid gap-2">
      {rows.map((row) => (
        <li key={row.id} className="slab flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-semibold text-[#0f172a]">{name.get(row.amenity_id) || "Space"}</p>
            <p className="text-sm text-[#475569]">
              {row.starts_on} · {row.slot} · {row.resident_name}
              {row.flat_number ? ` · ${row.flat_number}` : ""} · {row.status}
            </p>
          </div>
          {office && row.status === "pending" ? (
            <div className="flex gap-2">
              <form action={decideBooking}>
                <input type="hidden" name="bookingId" value={row.id} />
                <input type="hidden" name="status" value="confirmed" />
                <button type="submit" className="btn-slate">Confirm</button>
              </form>
              <form action={decideBooking}>
                <input type="hidden" name="bookingId" value={row.id} />
                <input type="hidden" name="status" value="refused" />
                <button type="submit" className="btn-line">Refuse</button>
              </form>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
