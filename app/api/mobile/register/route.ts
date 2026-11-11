import { isSuperAdmin, SUPER_ADMIN_NO_FLAT } from "@/lib/admin";
import { findInventoryFlat } from "@/lib/inventory";
import {
  isHomeJoinKind,
  isJoinKind,
  pathForJoinKind,
  type JoinKind,
} from "@/lib/join";
import { mobileJson, readMobileAuth } from "@/lib/mobileSession";
import { normalizePhone } from "@/lib/phone";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

function isAuth(
  value: Awaited<ReturnType<typeof readMobileAuth>>,
): value is Exclude<Awaited<ReturnType<typeof readMobileAuth>>, Response> {
  return !(value instanceof Response);
}

export async function GET(request: Request) {
  const auth = await readMobileAuth(request);
  if (!isAuth(auth)) return auth;

  const admin = createAdminClient();
  const { data } = await admin
    .from("registration_requests")
    .select("status, flat_number, request_kind, reject_reason, intent_path, why_note, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return mobileJson({
    flatNumber: auth.flatNumber,
    role: auth.profile.role,
    name: auth.name,
    joinIntent: auth.user.user_metadata?.joinIntent ?? null,
    request: data
      ? {
          status: data.status as "pending" | "approved" | "rejected",
          flatNumber: data.flat_number as string | null,
          kind: data.request_kind as string,
          path: (data.intent_path as string) || "home",
          whyNote: String(data.why_note || ""),
          reason: String(data.reject_reason || ""),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await readMobileAuth(request);
  if (!isAuth(auth)) return auth;
  if (isSuperAdmin(auth.user)) return mobileJson({ message: SUPER_ADMIN_NO_FLAT }, 400);

  const body = await request.json().catch(() => null);
  const intent = String(body?.intent || body?.joinIntent || "");
  if (intent === "browse") {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(auth.user.id, {
      user_metadata: {
        ...auth.user.user_metadata,
        joinIntent: "browse",
        registrationStatus: "browse",
      },
    });
    return mobileJson({ ok: true, status: "browse", message: "Public pages are open." });
  }

  const phone = normalizePhone(String(body?.phone || ""));
  const ownerName = String(body?.ownerName || "").trim();
  const whyNote = String(body?.whyNote || "").trim();
  const requested = String(body?.kind || "");
  if (!isJoinKind(requested)) return mobileJson({ message: "Pick who you are." }, 400);
  const kind: JoinKind = requested;
  const path = pathForJoinKind(kind);
  const flatRaw = String(body?.flatNumber || "").trim();
  const unit = flatRaw ? findInventoryFlat(flatRaw) : null;

  if (!auth.user.email) return mobileJson({ message: "Your Google account needs an email." }, 400);
  if (!phone) return mobileJson({ message: "Enter a valid 10-digit phone number." }, 400);
  if (ownerName.length < 2) return mobileJson({ message: "Your name is too short." }, 400);
  if (whyNote.length < 3) {
    return mobileJson({ message: "Tell us briefly why you need access." }, 400);
  }
  if (isHomeJoinKind(kind) && !unit) {
    return mobileJson({ message: "Enter a brochure flat such as A101 or B1004." }, 400);
  }
  if (flatRaw && !unit) {
    return mobileJson({ message: "Enter a brochure flat such as A101 or B1004." }, 400);
  }

  const admin = createAdminClient();

  if (isHomeJoinKind(kind) && unit) {
    const { data: existingRows } = await admin
      .from("flats")
      .select("flat_number")
      .eq("phone", phone)
      .limit(1);
    const existingFlat = existingRows?.[0];
    if (existingFlat && existingFlat.flat_number !== unit.flatNumber) {
      return mobileJson({ message: "This phone is already linked to an approved owner." }, 400);
    }

    const { data: claimed } = await admin
      .from("flats")
      .select("user_id, owner_name, email, phone")
      .eq("flat_number", unit.flatNumber)
      .maybeSingle();
    const flatHasOwner = Boolean(
      claimed?.user_id || (claimed?.owner_name && claimed?.email && claimed?.phone),
    );
    if (kind === "owner" && claimed?.user_id) {
      return mobileJson({ message: `Flat ${unit.flatNumber} is already linked to an owner.` }, 400);
    }
    if (kind === "family" && !flatHasOwner) {
      return mobileJson({ message: `Flat ${unit.flatNumber} needs an owner before family can join.` }, 400);
    }

    const { data: ownFlat } = await admin
      .from("flats")
      .select("flat_number")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (ownFlat) return mobileJson({ message: "This Google account is already an approved owner." }, 400);
  }

  const { data: openRequest } = await admin
    .from("registration_requests")
    .select("id, status")
    .or(`phone.eq.${phone},user_id.eq.${auth.user.id}`)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (openRequest?.status === "pending") {
    return mobileJson({ message: "A registration is already waiting for admin approval." }, 400);
  }
  if (openRequest?.status === "approved") {
    return mobileJson({ message: "This account is already approved." }, 400);
  }

  if (kind === "owner" && unit) {
    const { data: openFlat } = await admin
      .from("registration_requests")
      .select("id")
      .eq("flat_number", unit.flatNumber)
      .eq("status", "pending")
      .eq("request_kind", "owner")
      .maybeSingle();
    if (openFlat) {
      return mobileJson({ message: `Flat ${unit.flatNumber} already has a pending owner request.` }, 400);
    }
  }

  await admin.auth.admin.updateUserById(auth.user.id, {
    user_metadata: {
      ...auth.user.user_metadata,
      phone,
      flatNumber: unit?.flatNumber || null,
      ownerName,
      registrationStatus: "pending",
      joinIntent: path,
    },
  });

  const { error } = await admin.from("registration_requests").insert({
    user_id: auth.user.id,
    email: auth.user.email,
    phone,
    owner_name: ownerName,
    flat_number: unit?.flatNumber ?? null,
    floor: unit?.floor ?? null,
    unit: unit?.unit ?? null,
    type: unit?.type ?? null,
    status: "pending",
    request_kind: kind,
    intent_path: path,
    why_note: whyNote,
  });
  if (error) return mobileJson({ message: error.message }, 500);

  return mobileJson({
    ok: true,
    status: "pending",
    flatNumber: unit?.flatNumber ?? null,
    message: "Sent to the office. You will get a notice when it is approved.",
  });
}
