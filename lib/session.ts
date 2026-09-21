import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
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
  return { user, profile, supabase };
});

export async function requireAdminUser() {
  const auth = await getAuthState();
  if (!auth.user) throw new Error("Not allowed");
  if (!canManageAdmin(auth.profile.role, auth.user)) throw new Error("Not allowed");
  return auth.user;
}

export async function requireBuilderEditor() {
  const auth = await getAuthState();
  if (!auth.user) throw new Error("Not allowed");
  if (!canEditBuilder(auth.profile.role, auth.user)) throw new Error("Not allowed");
  return auth.user;
}
