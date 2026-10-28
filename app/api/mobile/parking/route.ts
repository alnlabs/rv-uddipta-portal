import { writeAudit } from "@/lib/audit";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canManageAdmin, isCommunityRole } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "parking");
  if (access === "none") return mobileJson({ message: "Parking is turned off." }, 403);

  const admin = createAdminClient();
  const flatId = member.profile.flatId;
  const [{ data: vehicles, error: vehicleError }, { data: bays, error: bayError }] = await Promise.all([
    flatId
      ? admin.from("vehicles").select("id, plate, label, created_at").eq("flat_id", flatId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    admin.from("parking_bays").select("id, label, kind, flat_id").order("label"),
  ]);
  if (vehicleError) return mobileJson({ message: vehicleError.message }, 500);
  if (bayError) return mobileJson({ message: bayError.message }, 500);

  const bayFlatIds = [...new Set((bays ?? []).map((bay) => bay.flat_id).filter(Boolean))] as number[];
  const { data: bayFlats } = bayFlatIds.length
    ? await admin.from("flats").select("id, flat_number").in("id", bayFlatIds)
    : { data: [] };
  const flatMap = new Map((bayFlats ?? []).map((flat) => [flat.id as number, String(flat.flat_number)]));

  return mobileJson({
    canManage: access === "manage" && isCommunityRole(member.profile.role) && Boolean(flatId),
    home: member.flatNumber,
    vehicles: (vehicles ?? []).map((row) => ({
      id: row.id as number,
      plate: String(row.plate),
      label: String(row.label || "Car"),
    })),
    bays: (bays ?? []).map((bay) => ({
      id: bay.id as number,
      label: String(bay.label),
      kind: String(bay.kind),
      home: bay.flat_id ? flatMap.get(bay.flat_id as number) || null : null,
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "parking");
  if (access !== "manage") return mobileJson({ message: "You can see parking. You cannot change it." }, 403);
  if (!isCommunityRole(member.profile.role)) return mobileJson({ message: "You cannot add a vehicle." }, 403);
  if (!member.profile.flatId) return mobileJson({ message: "Link a home first." }, 400);

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "add");
  const admin = createAdminClient();

  if (action === "remove") {
    const vehicleId = Number(body?.vehicleId);
    if (!vehicleId) return mobileJson({ message: "Choose a vehicle." }, 400);
    const { data: vehicle } = await admin.from("vehicles").select("id, flat_id, plate").eq("id", vehicleId).maybeSingle();
    if (!vehicle) return mobileJson({ message: "That vehicle is gone." }, 404);
    const office = canManageAdmin(member.profile.role, member.user);
    if (!office && vehicle.flat_id !== member.profile.flatId) {
      return mobileJson({ message: "You can remove a vehicle for your own home." }, 403);
    }
    await admin.from("vehicles").delete().eq("id", vehicleId);
    await writeAudit({
      actorUserId: member.user.id,
      actorName: member.name,
      action: "Removed a vehicle",
      subject: vehicle.plate,
    });
    return mobileJson({ ok: true });
  }

  const plate = String(body?.plate || "").trim().toUpperCase();
  const label = String(body?.label || "").trim();
  if (plate.length < 4) return mobileJson({ message: "Enter the vehicle number." }, 400);
  const { error } = await admin.from("vehicles").insert({
    flat_id: member.profile.flatId,
    plate,
    label: label || "Car",
  });
  if (error) return mobileJson({ message: error.message }, 500);
  return mobileJson({ ok: true, message: "Vehicle added." });
}
