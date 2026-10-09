"use server";

import { revalidatePath } from "next/cache";
import { publishActivity } from "@/lib/activity";
import { reachPerson } from "@/lib/reach";
import { isSuperAdmin, isSuperAdminContact, SUPER_ADMIN_NO_FLAT } from "@/lib/admin";
import { getAuthState, requireAdminUser } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong",
  };
}

async function notifyApprovedPerson(input: {
  userId: string
  flatNumber: string
  family: boolean
  email?: string | null
  phone?: string | null
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    kind: "registration_approved",
    title: input.family
      ? `You're approved as family on ${input.flatNumber}`
      : `You're approved for ${input.flatNumber}`,
    body: "Your home is open. The portal will refresh.",
    href: "/feed",
  });
  if (error) console.warn("approval notice failed", error.message);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://uddipta.vercel.app";
  await reachPerson({
    title: input.family
      ? `You're approved as family on ${input.flatNumber}`
      : `You're approved for ${input.flatNumber}`,
    body: `Your home is open. Sign in at ${site}/feed`,
    email: input.email,
    phone: input.phone,
  }).catch((error: unknown) => {
    console.warn("approval reach failed", error instanceof Error ? error.message : error);
  });
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
    if (isSuperAdminContact(request.email, request.phone)) {
      throw new Error(SUPER_ADMIN_NO_FLAT);
    }
    if (request.user_id) {
      const { data: account } = await admin.auth.admin.getUserById(request.user_id);
      if (account.user && isSuperAdmin(account.user)) {
        throw new Error(SUPER_ADMIN_NO_FLAT);
      }
    }

    const { data: inventory, error: inventoryError } = await admin
      .from("flats")
      .select("id, flat_number, user_id")
      .eq("flat_number", request.flat_number)
      .maybeSingle();
    if (inventoryError) throw new Error(inventoryError.message);
    if (!inventory) throw new Error(`Flat ${request.flat_number} is not in the brochure inventory`);
    if (!request.phone) throw new Error("This person needs a phone number.");
    if (!request.email) throw new Error("This person needs a verified email.");

    const isFamily = request.request_kind === "family";
    if (isFamily) {
      const { data: home } = await admin
        .from("flats")
        .select("owner_name, email, phone, user_id")
        .eq("id", inventory.id)
        .maybeSingle();
      const hasOwner = Boolean(home?.user_id || (home?.owner_name && home?.email && home?.phone));
      if (!hasOwner) {
        throw new Error("This flat needs an owner before family can be approved.");
      }
    } else if (inventory.user_id && inventory.user_id !== request.user_id) {
      throw new Error(`Flat ${request.flat_number} is already linked to another owner`);
    }

    if (!isFamily) {
    const { error: upsertError } = await admin
      .from("flats")
      .update({
        user_id: request.user_id,
        owner_name: request.owner_name,
        email: request.email || null,
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
    }

    if (request.user_id) {
      await admin.auth.admin.updateUserById(request.user_id, {
        user_metadata: {
          phone: request.phone,
          flatNumber: request.flat_number,
          ownerName: request.owner_name,
          registrationStatus: "approved",
        },
      });
      const { error: profileError } = await admin.from("profiles").upsert({
        user_id: request.user_id,
        role: isFamily ? "co_owner" : "owner",
        flat_id: inventory.id,
        display_name: request.owner_name,
      });
      if (profileError) throw new Error(profileError.message);
    }

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

    if (request.user_id) {
      await notifyApprovedPerson({
        userId: request.user_id,
        flatNumber: request.flat_number,
        family: isFamily,
        email: request.email,
        phone: request.phone,
      });
    }

    revalidatePath("/");
    revalidatePath("/account");
    revalidatePath("/register");
    revalidatePath("/update");
    revalidatePath("/feed");
    revalidatePath("/members");
    revalidatePath("/community");
    revalidatePath("/notifications");
    const { writeAudit } = await import("@/lib/audit");
    await writeAudit({
      actorUserId: adminUser.id,
      actorName: adminUser.email,
      action: "Approved a member",
      subject: request.flat_number,
      detail: request.owner_name,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function approveFamilyAsOwner(requestId: number): Promise<ActionResult> {
  try {
    const auth = await getAuthState();
    if (!auth.user || auth.profile.role !== "owner" || !auth.profile.flatId) {
      throw new Error("Only the owner of this flat can approve family.");
    }
    const admin = createAdminClient();
    const { data: request, error: loadError } = await admin
      .from("registration_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (loadError || !request) throw new Error("Request not found");
    if (request.status !== "pending" || request.request_kind !== "family") {
      throw new Error("This is not a family request waiting for approval.");
    }
    if (!request.phone || !request.email) {
      throw new Error("This person needs a verified email and a phone.");
    }
    const { data: flat } = await admin
      .from("flats")
      .select("id")
      .eq("flat_number", request.flat_number)
      .maybeSingle();
    if (!flat || flat.id !== auth.profile.flatId) {
      throw new Error("You can approve family only for your own flat.");
    }
    if (!request.user_id) throw new Error("This request has no Google account.");

    const { error: profileError } = await admin.from("profiles").upsert({
      user_id: request.user_id,
      role: "co_owner",
      flat_id: flat.id,
      display_name: request.owner_name,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: updateError } = await admin.from("registration_requests").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    }).eq("id", requestId);
    if (updateError) throw new Error(updateError.message);
    await notifyApprovedPerson({
      userId: request.user_id,
      flatNumber: request.flat_number,
      family: true,
      email: request.email,
      phone: request.phone,
    });

    revalidatePath("/");
    revalidatePath("/account");
    revalidatePath("/feed");
    revalidatePath("/register");
    revalidatePath("/notifications");
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
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new Error("Type a short reason before rejecting.");
    }
    const admin = createAdminClient();

    const { error } = await admin
      .from("registration_requests")
      .update({
        status: "rejected",
        reject_reason: trimmed,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
      })
      .eq("id", requestId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
