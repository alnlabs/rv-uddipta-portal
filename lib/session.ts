import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/admin";
import { loadHeldRoles } from "@/lib/heldRoles";
import { resolveLinkedHome } from "@/lib/linkedHome";
import { canEditBuilder, canManageAdmin, ensureProfile, type Profile } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

type ServerClient = ReturnType<typeof createClient>;

export type AuthState =
  | { user: User; profile: Profile; supabase: ServerClient }
  | { user: null; profile: null; supabase: ServerClient };

export const getAuthState = cache(async (): Promise<AuthState> => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };
  const profile = await ensureProfile(user, supabase);
  if (isSuperAdmin(user)) return { user, profile, supabase };

  const home = await resolveLinkedHome({
    userId: user.id,
    flatId: profile.flatId,
    healProfile: true,
  });
  if (home.flatId && home.flatId !== profile.flatId) {
    return { user, profile: { ...profile, flatId: home.flatId }, supabase };
  }
  return { user, profile, supabase };
});

/** True for env super admins and anyone who holds the society admin role. */
export const canAccessAdminDesk = cache(async () => {
  const auth = await getAuthState();
  if (!auth.user) return false;
  if (canManageAdmin(auth.profile.role, auth.user)) return true;
  if (isSuperAdmin(auth.user)) return true;
  const held = await loadHeldRoles(auth.user.id);
  return held.some((item) => item.role === "admin");
});

export async function requireAdminUser() {
  const auth = await getAuthState();
  if (!auth.user) throw new Error("Not allowed");
  if (!(await canAccessAdminDesk())) throw new Error("Not allowed");
  return auth.user;
}

export async function requireSuperAdmin() {
  const auth = await getAuthState();
  if (!auth.user || !isSuperAdmin(auth.user)) throw new Error("Not allowed");
  return auth.user;
}

export async function requireBuilderEditor() {
  const auth = await getAuthState();
  if (!auth.user) throw new Error("Not allowed");
  if (!canEditBuilder(auth.profile.role, auth.user)) throw new Error("Not allowed");
  return auth.user;
}
