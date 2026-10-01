import type { User } from "@supabase/supabase-js";
import { canManageAdmin, ensureProfile, isCommunityRole } from "@/lib/roles";
import type { createClient } from "@/utils/supabase/server";

type ServerClient = ReturnType<typeof createClient>;

export async function postLoginPath(
  supabase: ServerClient,
  user: User | null,
) {
  if (!user) return "/login";

  const profile = await ensureProfile(user, supabase);
  if (canManageAdmin(profile.role, user)) return "/account";
  if (isCommunityRole(profile.role)) return "/feed";
  return "/register";
}
