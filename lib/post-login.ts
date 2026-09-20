import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin";

export async function postLoginPath(
  supabase: SupabaseClient,
  user: User | null,
) {
  if (!user) return "/login";
  if (isAdminUser(user)) return "/admin";

  const { data: flat } = await supabase
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();
  if (flat) return "/";

  return "/register";
}
