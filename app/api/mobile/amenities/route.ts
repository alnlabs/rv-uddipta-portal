import { BOOKING_SLOTS, bookingSlot } from "@/lib/bookingSlots";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { isCommunityRole } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

async function slotTaken(
  admin: ReturnType<typeof createAdminClient>,
  amenityId: number,
  startsOn: string,
  slot: string,
) {
  const { data } = await admin
    .from("amenity_bookings")
    .select("id")
    .eq("amenity_id", amenityId)
    .eq("starts_on", startsOn)
    .eq("slot", slot)
    .in("status", ["pending", "confirmed"]);
  return (data ?? []).length > 0;
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "amenities");
  if (access === "none") return mobileJson({ message: "Amenity booking is turned off." }, 403);

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: amenities, error: amenityError }, { data: bookings, error: bookingError }] = await Promise.all([
    admin.from("amenities").select("id, name, hours_note, enabled").eq("enabled", true).order("name"),
    admin
      .from("amenity_bookings")
      .select("id, amenity_id, flat_number, resident_name, starts_on, slot, status, user_id")
      .gte("starts_on", today)
      .in("status", ["pending", "confirmed"])
      .order("starts_on", { ascending: true })
      .limit(80),
  ]);
  if (amenityError) return mobileJson({ message: amenityError.message }, 500);
  if (bookingError) return mobileJson({ message: bookingError.message }, 500);

  const mine = (bookings ?? []).filter((row) => row.user_id === member.user.id);
  return mobileJson({
    canBook: access === "manage" && isCommunityRole(member.profile.role) && Boolean(member.profile.flatId),
    slots: BOOKING_SLOTS.map((slot) => ({ value: slot.value, label: slot.label })),
    amenities: (amenities ?? []).map((item) => ({
      id: item.id as number,
      name: String(item.name),
      hours: String(item.hours_note || ""),
    })),
    mine: mine.map((row) => ({
      id: row.id as number,
      amenityId: row.amenity_id as number,
      home: String(row.flat_number || ""),
      when: String(row.starts_on),
      slot: String(row.slot),
      status: String(row.status),
      space: (amenities ?? []).find((item) => item.id === row.amenity_id)?.name || "Space",
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "amenities");
  if (access !== "manage") return mobileJson({ message: "You can see amenities. You cannot book yet." }, 403);
  if (!isCommunityRole(member.profile.role)) return mobileJson({ message: "Sign in as a resident first." }, 403);
  if (!member.profile.flatId) return mobileJson({ message: "Link a home first." }, 400);

  const body = await request.json().catch(() => null);
  const amenityId = Number(body?.amenityId);
  const startsOn = String(body?.startsOn || "");
  const slot = String(body?.slot || "").trim();
  if (!amenityId || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !bookingSlot(slot)) {
    return mobileJson({ message: "Choose a space, a date, and a time." }, 400);
  }

  const admin = createAdminClient();
  if (await slotTaken(admin, amenityId, startsOn, slot)) {
    return mobileJson({ message: "That time is already taken. Choose another." }, 400);
  }

  const { error } = await admin.from("amenity_bookings").insert({
    amenity_id: amenityId,
    flat_id: member.profile.flatId,
    flat_number: member.flatNumber,
    user_id: member.user.id,
    resident_name: member.name,
    starts_on: startsOn,
    slot,
    status: "pending",
  });
  if (error) {
    return mobileJson({
      message: error.code === "23505" ? "That time is already taken. Choose another." : error.message,
    }, 500);
  }
  return mobileJson({ ok: true, message: "Booking sent. The office will confirm it." });
}
