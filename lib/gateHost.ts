import type { SupabaseClient } from "@supabase/supabase-js";

export async function hostApprovalRequired(admin: SupabaseClient) {
  const { data } = await admin.from("project_info").select("host_approval").eq("id", 1).maybeSingle();
  return data?.host_approval !== false;
}

export async function hostForFlat(admin: SupabaseClient, flatId: number) {
  const { data } = await admin.from("profiles").select("user_id, role").eq("flat_id", flatId);
  const people = data ?? [];
  const preferred = people.find((person) =>
    person.role === "owner" || person.role === "co_owner" || person.role === "tenant",
  );
  return (preferred ?? people[0])?.user_id ?? null;
}

export function entryAllowed(input: {
  status: string
  hostAnswer: string | null
  approvalRequired: boolean
}) {
  if (input.status === "expected" || input.status === "inside") return true;
  if (input.status !== "waiting") return false;
  if (!input.approvalRequired) return true;
  return input.hostAnswer === "allowed";
}
