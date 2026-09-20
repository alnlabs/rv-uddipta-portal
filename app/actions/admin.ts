"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) {
    throw new Error("Not allowed");
  }
  return user;
}

export async function approveRegistration(requestId: number) {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();

  const { data: request, error: loadError } = await admin
    .from("registration_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (loadError || !request) throw new Error("Request not found");
  if (request.status !== "pending") throw new Error("This request is no longer pending");

  const { data: inventory, error: inventoryError } = await admin
    .from("flats")
    .select("flat_number, user_id")
    .eq("flat_number", request.flat_number)
    .maybeSingle();
  if (inventoryError) throw new Error(inventoryError.message);
  if (!inventory) throw new Error(`Flat ${request.flat_number} is not in the brochure inventory`);
  if (inventory.user_id && inventory.user_id !== request.user_id) {
    throw new Error(`Flat ${request.flat_number} is already linked to another owner`);
  }

  const { error: upsertError } = await admin
    .from("flats")
    .update({
      user_id: request.user_id,
      owner_name: request.owner_name,
      phone: request.phone,
    })
    .eq("flat_number", request.flat_number);
  if (upsertError) throw new Error(upsertError.message);

  const { error: updateError } = await admin
    .from("registration_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
    })
    .eq("id", requestId);
  if (updateError) throw new Error(updateError.message);

  if (request.user_id) {
    await admin.auth.admin.updateUserById(request.user_id, {
      user_metadata: {
        phone: request.phone,
        flatNumber: request.flat_number,
        ownerName: request.owner_name,
        registrationStatus: "approved",
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/register");
  revalidatePath("/update");
}

export async function rejectRegistration(requestId: number, reason: string) {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("registration_requests")
    .update({
      status: "rejected",
      reject_reason: reason.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
    })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
