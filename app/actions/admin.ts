"use server";

import { revalidatePath } from "next/cache";
import {
  approveRegistrationAs,
  rejectRegistrationAs,
  type ReviewResult,
} from "@/lib/registrationReview";
import { getAuthState, requireAdminUser } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";
import { reachPerson } from "@/lib/reach";

export type ActionResult = ReviewResult;

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
    return approveRegistrationAs(
      { id: adminUser.id, email: adminUser.email },
      requestId,
    );
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
    return rejectRegistrationAs(
      { id: adminUser.id, email: adminUser.email },
      requestId,
      reason,
    );
  } catch (error) {
    return fail(error);
  }
}
