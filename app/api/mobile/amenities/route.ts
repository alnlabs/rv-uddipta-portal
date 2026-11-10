import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { BOOKING_SLOTS, bookingSlot } from "@/lib/bookingSlots";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { pushUsers } from "@/lib/push";
import { type AppRole, canManageAdmin, isCommunityRole } from "@/lib/roles";
import { indiaDay } from "@/lib/indiaDay";
import { createAdminClient } from "@/utils/supabase/admin";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function slotTaken(
  admin: ReturnType<typeof createAdminClient>,
  amenityId: number,
  startsOn: string,
  slot: string,
  exceptId?: number,
) {
  const { data } = await admin
    .from("amenity_bookings")
    .select("id")
    .eq("amenity_id", amenityId)
    .eq("starts_on", startsOn)
    .eq("slot", slot)
    .in("status", ["pending", "confirmed"]);
  return (data ?? []).some((row) => row.id !== exceptId);
}

function canDecideBookings(role: AppRole | null | undefined, user: User | null) {
  return canManageAdmin(role, user) || role === "facility";
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "amenities");
  if (access === "none") return mobileJson({ message: "Amenity booking is turned off." }, 403);

  const admin = createAdminClient();
  const today = indiaDay();
  const office = access === "manage" && canDecideBookings(member.profile.role, member.user);
  const [{ data: amenities, error: amenityError }, { data: upcoming, error: upcomingError }, pendingResult] = await Promise.all([
    admin.from("amenities").select("id, name, hours_note, enabled").eq("enabled", true).order("name"),
    admin
      .from("amenity_bookings")
      .select("id, amenity_id, flat_number, resident_name, starts_on, slot, status, user_id")
      .gte("starts_on", today)
      .in("status", ["pending", "confirmed"])
      .order("starts_on", { ascending: true })
      .limit(80),
    office
      ? admin
          .from("amenity_bookings")
          .select("id, amenity_id, flat_number, resident_name, starts_on, slot, status, user_id")
          .eq("status", "pending")
          .order("starts_on", { ascending: true })
          .limit(80)
      : Promise.resolve({ data: [] as never[], error: null }),
  ]);
  if (amenityError) return mobileJson({ message: amenityError.message }, 500);
  if (upcomingError) return mobileJson({ message: upcomingError.message }, 500);
  if (pendingResult.error) return mobileJson({ message: pendingResult.error.message }, 500);

  const mine = (upcoming ?? []).filter((row) => row.user_id === member.user.id);
  const pending = office ? (pendingResult.data ?? []) : [];
  const spaceName = (amenityId: number) =>
    (amenities ?? []).find((item) => item.id === amenityId)?.name || "Space";

  return mobileJson({
    canBook: access === "manage" && isCommunityRole(member.profile.role) && Boolean(member.profile.flatId),
    canDecide: office,
    slots: BOOKING_SLOTS.map((slot) => ({ value: slot.value, label: slot.label })),
    amenities: (amenities ?? []).map((item) => ({
      id: item.id as number,
      name: String(item.name),
      hours: String(item.hours_note || ""),
    })),
    pending: pending.map((row) => ({
      id: row.id as number,
      amenityId: row.amenity_id as number,
      home: String(row.flat_number || ""),
      who: String(row.resident_name || ""),
      when: String(row.starts_on),
      slot: String(row.slot),
      status: String(row.status),
      space: spaceName(row.amenity_id as number),
      overdue: String(row.starts_on) < today,
    })),
    mine: mine.map((row) => ({
      id: row.id as number,
      amenityId: row.amenity_id as number,
      home: String(row.flat_number || ""),
      when: String(row.starts_on),
      slot: String(row.slot),
      status: String(row.status),
      space: spaceName(row.amenity_id as number),
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "amenities");
  if (access !== "manage") return mobileJson({ message: "You can see amenities. You cannot change them." }, 403);

  const body = await request.json().catch(() => null);
  const admin = createAdminClient();

  const bookingId = Number(body?.bookingId || 0);
  if (bookingId) {
    if (!canDecideBookings(member.profile.role, member.user)) {
      return mobileJson({ message: "Only the office can confirm a booking." }, 403);
    }
    const status = String(body?.status || "");
    if (status !== "confirmed" && status !== "refused") {
      return mobileJson({ message: "Choose confirm or refuse." }, 400);
    }
    const { data: booking } = await admin
      .from("amenity_bookings")
      .select("id, amenity_id, starts_on, slot, user_id, flat_number, resident_name, status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return mobileJson({ message: "That booking is gone." }, 404);
    if (booking.status !== "pending") {
      return mobileJson({ message: "That booking was already decided." }, 400);
    }
    if (status === "confirmed") {
      if (await slotTaken(admin, booking.amenity_id, booking.starts_on, booking.slot, bookingId)) {
        return mobileJson({ message: "That time is already taken. Refuse this one." }, 400);
      }
    }
    const { error } = await admin.from("amenity_bookings").update({ status }).eq("id", bookingId);
    if (error) {
      return mobileJson({
        message: error.code === "23505" ? "That time is already taken." : error.message,
      }, 500);
    }
    await writeAudit({
      actorUserId: member.user.id,
      actorName: member.name,
      action: status === "confirmed" ? "Confirmed a booking" : "Refused a booking",
      subject: String(bookingId),
    });
    if (booking.user_id) {
      const { data: space } = await admin.from("amenities").select("name").eq("id", booking.amenity_id).maybeSingle();
      const spaceName = space?.name || "Amenity";
      const title = status === "confirmed" ? "Booking confirmed" : "Booking refused";
      const detail = `${spaceName} · ${booking.starts_on} · ${booking.slot}`;
      await admin.from("notifications").insert({
        user_id: booking.user_id,
        kind: "booking",
        title,
        body: detail,
        href: "/amenities",
      });
      await pushUsers([booking.user_id], title, detail, { href: "/amenities", kind: "booking" });
    }
    revalidatePath("/amenities");
    revalidatePath("/notifications");
    return mobileJson({
      ok: true,
      message: status === "confirmed" ? "Confirmed." : "Refused.",
    });
  }

  const hoursAmenityId = Number(body?.amenityId || 0);
  if (hoursAmenityId && body?.hours != null && !body?.startsOn) {
    if (!canDecideBookings(member.profile.role, member.user)) {
      return mobileJson({ message: "Only the office can set hours." }, 403);
    }
    const hours = String(body.hours || "").trim();
    await admin.from("amenities").update({ hours_note: hours }).eq("id", hoursAmenityId);
    revalidatePath("/amenities");
    return mobileJson({ ok: true, message: "Hours saved." });
  }

  if (!isCommunityRole(member.profile.role)) return mobileJson({ message: "Sign in as a resident first." }, 403);
  if (!member.profile.flatId) return mobileJson({ message: "Link a home first." }, 400);

  const amenityId = Number(body?.amenityId);
  const startsOn = String(body?.startsOn || "");
  const slot = String(body?.slot || "").trim();
  if (!amenityId || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !bookingSlot(slot)) {
    return mobileJson({ message: "Choose a space, a date, and a time." }, 400);
  }

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
