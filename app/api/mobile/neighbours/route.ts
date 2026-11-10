import { writeAudit } from "@/lib/audit";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { pushHome } from "@/lib/push";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type FlatPublic = {
  id: number
  flat_number: string
  wing: string | null
  floor: number | null
  type: string | null
  facing: string | null
  area_sqft: number | null
  owner_name: string | null
  owner_photo_url: string | null
  email: string | null
  phone_masked: string | null
  tenant_name: string | null
  tenant_phone_masked: string | null
  occupancy: string | null
};

function shapeHome(row: FlatPublic, extras?: {
  family?: { name: string; photoUrl: string | null }[]
  renters?: { name: string; phone: string; startDate: string | null; endDate: string | null; current: boolean }[]
  people?: { name: string; role: string }[]
  connection?: string | null
  requestId?: number | null
  mine?: boolean
  registered?: boolean
  full?: boolean
}) {
  const full = Boolean(extras?.full ?? extras?.registered ?? extras?.mine);
  return {
    home: String(row.flat_number),
    flatId: row.id,
    wing: String(row.wing || ""),
    floor: Number(row.floor || 0),
    type: String(row.type || ""),
    facing: full ? String(row.facing || "") : "",
    area: full && row.area_sqft != null ? Number(row.area_sqft) : null,
    owner: String(row.owner_name || ""),
    photo: row.owner_photo_url ? String(row.owner_photo_url) : "",
    email: full && row.email ? String(row.email) : "",
    phone: full ? String(row.phone_masked || "") : "",
    tenant: full ? String(row.tenant_name || "") : "",
    tenantPhone: full ? String(row.tenant_phone_masked || "") : "",
    occupancy: String(row.occupancy || ""),
    family: full ? (extras?.family ?? []) : [],
    renters: full ? (extras?.renters ?? []) : [],
    people: full ? (extras?.people ?? []) : [],
    connection: extras?.connection ?? null,
    requestId: extras?.requestId ?? null,
    mine: Boolean(extras?.mine),
    registered: Boolean(extras?.registered),
  };
}

async function registeredFlatIds(admin: ReturnType<typeof createAdminClient>) {
  const [{ data: profiles }, { data: linkedFlats }, { data: roles }] = await Promise.all([
    admin.from("profiles").select("flat_id").not("flat_id", "is", null),
    admin.from("flats").select("id").not("user_id", "is", null),
    admin.from("person_roles").select("flat_id").not("flat_id", "is", null),
  ]);
  const ids = new Set<number>();
  for (const row of [...(profiles ?? []), ...(roles ?? [])]) {
    if (row.flat_id != null) ids.add(Number(row.flat_id));
  }
  for (const row of linkedFlats ?? []) {
    if (row.id != null) ids.add(Number(row.id));
  }
  return ids;
}

async function familyFor(admin: ReturnType<typeof createAdminClient>, flatId: number) {
  const { data } = await admin
    .from("flat_members")
    .select("name, photo_url")
    .eq("flat_id", flatId)
    .order("id");
  return (data ?? []).map((row) => ({
    name: String(row.name || ""),
    photoUrl: row.photo_url ? String(row.photo_url) : null,
  })).filter((row) => row.name);
}

async function rentersFor(admin: ReturnType<typeof createAdminClient>, flatId: number) {
  const { data } = await admin
    .from("flat_renters")
    .select("name, phone, start_date, end_date")
    .eq("flat_id", flatId)
    .order("id");
  return (data ?? []).map((row) => {
    const phone = String(row.phone || "");
    const endDate = row.end_date ? String(row.end_date).slice(0, 10) : null;
    return {
      name: String(row.name || ""),
      phone: phone.length >= 4 ? `${phone.slice(0, 2)}******${phone.slice(-2)}` : phone ? "****" : "",
      startDate: row.start_date ? String(row.start_date).slice(0, 10) : null,
      endDate,
      current: !endDate,
    };
  }).filter((row) => row.name);
}

async function peopleOnApp(admin: ReturnType<typeof createAdminClient>, flatId: number) {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    admin.from("profiles").select("display_name, role").eq("flat_id", flatId),
    admin.from("person_roles").select("role, user_id").eq("flat_id", flatId),
  ]);
  const byUser = new Map<string, { name: string; role: string }>();
  for (const row of profiles ?? []) {
    byUser.set(`p-${row.role}-${row.display_name}`, {
      name: String(row.display_name || "Member"),
      role: String(row.role || "owner"),
    });
  }
  const userIds = [...new Set((roles ?? []).map((row) => String(row.user_id)).filter(Boolean))];
  if (userIds.length) {
    const { data: named } = await admin
      .from("profiles")
      .select("user_id, display_name, role")
      .in("user_id", userIds);
    for (const row of named ?? []) {
      byUser.set(String(row.user_id), {
        name: String(row.display_name || "Member"),
        role: String(row.role || "owner"),
      });
    }
  }
  return [...byUser.values()];
}

async function connectionBetween(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  myFlatId: number | null,
  theirFlatId: number,
) {
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    admin
      .from("connection_requests")
      .select("id, status, from_user_id, from_flat_id, to_flat_id")
      .eq("from_user_id", userId)
      .eq("to_flat_id", theirFlatId)
      .order("created_at", { ascending: false })
      .limit(5),
    myFlatId
      ? admin
          .from("connection_requests")
          .select("id, status, from_user_id, from_flat_id, to_flat_id")
          .eq("to_flat_id", myFlatId)
          .eq("from_flat_id", theirFlatId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as { id: number; status: string; from_user_id: string; from_flat_id: number | null; to_flat_id: number }[] }),
  ]);
  const rows = [...(outgoing ?? []), ...(incoming ?? [])];
  const accepted = rows.find((row) => row.status === "accepted");
  if (accepted) return { status: "accepted", requestId: accepted.id as number, incoming: false };
  const pendingOut = (outgoing ?? []).find((row) => row.status === "pending");
  if (pendingOut) return { status: "pending", requestId: pendingOut.id as number, incoming: false };
  const pendingIn = (incoming ?? []).find((row) => row.status === "pending");
  if (pendingIn) return { status: "pending", requestId: pendingIn.id as number, incoming: true };
  return { status: null, requestId: null, incoming: false };
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "neighbours");
  if (access === "none") return mobileJson({ message: "Neighbours is turned off." }, 403);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toUpperCase() || "";
  const home = url.searchParams.get("home")?.trim() || "";
  const flatId = Number(url.searchParams.get("flatId") || 0) || 0;
  const admin = createAdminClient();
  const myFlatId = member.profile.flatId;

  const onApp = await registeredFlatIds(admin);

  if (home || flatId) {
    let query = admin
      .from("flats_public")
      .select("id, flat_number, wing, floor, type, facing, area_sqft, owner_name, owner_photo_url, email, phone_masked, tenant_name, tenant_phone_masked, occupancy")
      .eq("sale_status", "sold");
    if (flatId) query = query.eq("id", flatId);
    else query = query.ilike("flat_number", home.replace(/[%_]/g, ""));
    const { data: row, error } = await query.maybeSingle();
    if (error) return mobileJson({ message: error.message }, 500);
    if (!row?.owner_name) return mobileJson({ message: "That home is not in the directory." }, 404);

    const registered = onApp.has(row.id) || myFlatId === row.id;
    const [family, renters, people] = registered
      ? await Promise.all([
          familyFor(admin, row.id),
          rentersFor(admin, row.id),
          peopleOnApp(admin, row.id),
        ])
      : [[], [], []];
    const link = myFlatId === row.id
      ? { status: "mine", requestId: null as number | null, incoming: false }
      : await connectionBetween(admin, member.user.id, myFlatId, row.id);

    return mobileJson({
      canManage: access === "manage",
      flat: member.flatNumber,
      home: shapeHome(row as FlatPublic, {
        family,
        renters,
        people,
        connection: link.status,
        requestId: link.requestId,
        mine: myFlatId === row.id,
        registered,
        full: registered,
      }),
      incoming: link.incoming,
    });
  }

  let query = admin
    .from("flats_public")
    .select("id, flat_number, wing, floor, type, facing, area_sqft, owner_name, owner_photo_url, email, phone_masked, tenant_name, tenant_phone_masked, occupancy")
    .eq("sale_status", "sold")
    .not("owner_name", "is", null)
    .order("flat_number")
    .limit(120);

  if (q) {
    query = query.or(`flat_number.ilike.%${q}%,owner_name.ilike.%${q}%,tenant_name.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return mobileJson({ message: error.message }, 500);

  return mobileJson({
    canManage: access === "manage",
    flat: member.flatNumber,
    homes: (data ?? [])
      .filter((row) => row.owner_name)
      .map((row) => shapeHome(row as FlatPublic, {
        mine: myFlatId === row.id,
        registered: onApp.has(row.id),
      })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "neighbours");
  if (access !== "manage") return mobileJson({ message: "You can look at neighbours. You cannot connect yet." }, 403);
  if (!member.profile.flatId || !member.flatNumber) {
    return mobileJson({ message: "Link your home before connecting with a neighbour." }, 400);
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "connect");
  const home = String(body?.home || "").trim().toUpperCase();
  const note = String(body?.note || "").trim().slice(0, 280);
  const requestId = Number(body?.requestId || 0);
  const admin = createAdminClient();

  if (action === "accept" || action === "refuse") {
    if (!requestId) return mobileJson({ message: "That connect request is missing." }, 400);
    const { data: row, error } = await admin
      .from("connection_requests")
      .select("id, status, from_user_id, from_flat_id, to_flat_id")
      .eq("id", requestId)
      .maybeSingle();
    if (error) return mobileJson({ message: error.message }, 500);
    if (!row || row.status !== "pending") return mobileJson({ message: "That request is no longer open." }, 400);
    if (row.to_flat_id !== member.profile.flatId) {
      return mobileJson({ message: "Only that home can answer this request." }, 403);
    }
    const next = action === "accept" ? "accepted" : "refused";
    const { error: updateError } = await admin
      .from("connection_requests")
      .update({ status: next, answered_at: new Date().toISOString(), answered_by: member.user.id })
      .eq("id", row.id);
    if (updateError) return mobileJson({ message: updateError.message }, 500);

    const { data: fromFlat } = await admin.from("flats").select("flat_number").eq("id", row.from_flat_id).maybeSingle();
    await pushHome({
      hostUserId: row.from_user_id,
      flatId: row.from_flat_id,
      title: next === "accepted" ? "Neighbour connected" : "Connect request declined",
      body: next === "accepted"
        ? `${member.flatNumber} accepted your connect request.`
        : `${member.flatNumber} declined your connect request.`,
      href: `/neighbour/${fromFlat?.flat_number || member.flatNumber}`,
      kind: "connect",
    });
    return mobileJson({ message: next === "accepted" ? "You are connected." : "Request declined.", status: next });
  }

  if (!home) return mobileJson({ message: "Choose a home." }, 400);
  const { data: target, error: targetError } = await admin
    .from("flats_public")
    .select("id, flat_number, owner_name")
    .ilike("flat_number", home.replace(/[%_]/g, ""))
    .eq("sale_status", "sold")
    .maybeSingle();
  if (targetError) return mobileJson({ message: targetError.message }, 500);
  if (!target?.owner_name) return mobileJson({ message: "That home is not in the directory." }, 404);
  if (target.id === member.profile.flatId) return mobileJson({ message: "That is your own home." }, 400);

  const existing = await connectionBetween(admin, member.user.id, member.profile.flatId, target.id);
  if (existing.status === "accepted") return mobileJson({ message: "You are already connected.", status: "accepted" });
  if (existing.status === "pending") {
    return mobileJson({
      message: existing.incoming ? "They already asked to connect. Open the request to accept." : "Your connect request is waiting.",
      status: "pending",
      requestId: existing.requestId,
      incoming: existing.incoming,
    });
  }

  const { data: created, error } = await admin
    .from("connection_requests")
    .insert({
      from_user_id: member.user.id,
      from_flat_id: member.profile.flatId,
      to_flat_id: target.id,
      note: note || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) {
    if (/connection_requests/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return mobileJson({ message: "Connect is not ready on the database yet. Apply the latest migration." }, 503);
    }
    return mobileJson({ message: error.message }, 500);
  }

  await writeAudit({
    actorUserId: member.user.id,
    actorName: member.name,
    action: "Asked to connect",
    subject: String(target.flat_number),
  });
  await pushHome({
    flatId: target.id,
    title: "Neighbour wants to connect",
    body: note
      ? `${member.flatNumber} (${member.name}): ${note}`
      : `${member.name} from ${member.flatNumber} asked to connect.`,
    href: `/neighbour/${member.flatNumber}`,
    kind: "connect",
  });

  return mobileJson({
    message: "Connect request sent.",
    status: "pending",
    requestId: created.id,
  });
}
