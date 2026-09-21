"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { publishActivity } from "@/lib/activity";
import { createClient } from "@/utils/supabase/server";

export async function recordFlatActivity(input: {
  flatNumber: string
  kind: string
  title: string
  body?: string
  visibility?: "public" | "community"
  href?: string
  notify?: "all_profiles" | "community" | "flat_and_admins" | "none"
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: flat } = await supabase
    .from("flats")
    .select("id")
    .eq("flat_number", input.flatNumber)
    .maybeSingle();

  await publishActivity({
    actorUserId: user.id,
    flatId: flat?.id ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    visibility: input.visibility ?? "community",
    href: input.href ?? "/feed",
    notify: input.notify,
  });

  revalidatePath("/feed");
  revalidatePath("/notifications");
  revalidatePath("/");
}
