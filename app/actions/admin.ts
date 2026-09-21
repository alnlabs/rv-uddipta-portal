"use server";

import { revalidatePath } from "next/cache";
import { publishActivity } from "@/lib/activity";
import { requireAdminUser } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong",
  };
}

export async function approveRegistration(requestId: number): Promise<ActionResult> {
  try {
    const adminUser = await requireAdminUser();
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
      .select("id, flat_number, user_id")
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
        sale_status: "sold",
        occupancy: "owner_stay",
        tenant_name: null,
        tenant_phone: null,
        open_for_rent: false,
        open_for_resale: false,
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
      await admin.from("profiles").upsert({
        user_id: request.user_id,
        role: "owner",
        flat_id: inventory.id,
        display_name: request.owner_name,
      });
      await publishActivity({
        actorUserId: adminUser.id,
        flatId: inventory.id,
        kind: "owner_joined",
        title: `${request.owner_name} linked to ${request.flat_number}`,
        visibility: "community",
        href: "/community",
        notify: "community",
      });
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/register");
    revalidatePath("/update");
    revalidatePath("/feed");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function rejectRegistration(
  requestId: number,
  reason: string,
): Promise<ActionResult> {
  try {
    const adminUser = await requireAdminUser();
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
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
