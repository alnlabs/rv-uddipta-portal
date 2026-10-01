"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isSuperAdmin, SUPER_ADMIN_NO_FLAT } from "@/lib/admin";
import { findInventoryFlat } from "@/lib/inventory";
import { normalizePhone } from "@/lib/phone";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type RegisterState = { ok: boolean; message: string };

export async function registerOwner(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in with Google first." };
  }
  if (isSuperAdmin(user)) {
    return { ok: false, message: SUPER_ADMIN_NO_FLAT };
  }

  const phone = normalizePhone(String(formData.get("phone") || ""));
  const ownerName = String(formData.get("ownerName") || "").trim();
  const kind = String(formData.get("kind") || "owner") === "family" ? "family" : "owner";
  const unit = findInventoryFlat(String(formData.get("flatNumber") || ""));

  if (!user.email) {
    return { ok: false, message: "Your Google account needs an email." };
  }
  if (!phone) return { ok: false, message: "Enter a valid 10-digit phone number." };
  if (ownerName.length < 2) return { ok: false, message: "Your name is too short." };
  if (!unit) {
    return { ok: false, message: "Enter a brochure flat such as A101 or B1004." };
  }

  const admin = createAdminClient();

  const { data: existingFlat } = await admin
    .from("flats")
    .select("flat_number")
    .eq("phone", phone)
    .maybeSingle();
  if (existingFlat) {
    return { ok: false, message: "This phone is already linked to an approved owner." };
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
    return { ok: false, message: `Flat ${unit.flatNumber} is already linked to an owner.` };
  }
  if (kind === "family" && !flatHasOwner) {
    return {
      ok: false,
      message: `Flat ${unit.flatNumber} needs an owner before family can join.`,
    };
  }

  const { data: ownFlat } = await admin
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();
  if (ownFlat) {
    return { ok: false, message: "This Google account is already an approved owner." };
  }

  const { data: openRequest } = await admin
    .from("registration_requests")
    .select("id, status")
    .or(`phone.eq.${phone},user_id.eq.${user.id}`)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (openRequest?.status === "pending") {
    return { ok: false, message: "A registration is already waiting for admin approval." };
  }
  if (openRequest?.status === "approved") {
    return { ok: false, message: "This account is already approved." };
  }

  if (kind === "owner") {
    const { data: openFlat } = await admin
      .from("registration_requests")
      .select("id")
      .eq("flat_number", unit.flatNumber)
      .eq("status", "pending")
      .eq("request_kind", "owner")
      .maybeSingle();
    if (openFlat) {
      return { ok: false, message: `Flat ${unit.flatNumber} already has a pending owner request.` };
    }
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      phone,
      flatNumber: unit.flatNumber,
      ownerName,
      registrationStatus: "pending",
    },
  });

  const { error } = await admin.from("registration_requests").insert({
    user_id: user.id,
    email: user.email,
    phone,
    owner_name: ownerName,
    flat_number: unit.flatNumber,
    floor: unit.floor,
    unit: unit.unit,
    type: unit.type,
    status: "pending",
    request_kind: kind,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/register");
}
