import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export type SocietyWork = {
  id: number
  key: string
  label: string
  summary: string
  system: boolean
  enabled: boolean
  duration: "regular" | "temporary"
  starts_at: string | null
  ends_at: string | null
  active: boolean
  role_keys: string[]
};

export type SocietyRoleRow = {
  id: number
  key: string
  label: string
  summary: string
  system: boolean
  enabled: boolean
  maps_to: string | null
  task_keys: string[]
  people_count: number
};

export type SocietyReminder = {
  id: number
  task_id: number
  task_key: string
  task_label: string
  user_id: string | null
  remind_at: string | null
  offset_minutes: number
  anchor: string
  repeat: string
  keep_informed: boolean
  enabled: boolean
  last_sent_at: string | null
};

export type SocietyPersonExtra = {
  user_id: string
  task_key: string
  task_label: string
  task_id: number
};

export type SocietyCatalog = {
  roles: SocietyRoleRow[]
  work: SocietyWork[]
  reminders: SocietyReminder[]
  people_extra: SocietyPersonExtra[]
  labels: Record<string, string>
};

export async function loadSocietyCatalog(): Promise<SocietyCatalog> {
  const empty: SocietyCatalog = {
    roles: [],
    work: [],
    reminders: [],
    people_extra: [],
    labels: {},
  };
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.rpc("list_society_catalog");
    if (error || !data || typeof data !== "object") return empty;
    const raw = data as Record<string, unknown>;
    return {
      roles: Array.isArray(raw.roles) ? (raw.roles as SocietyRoleRow[]) : [],
      work: Array.isArray(raw.work) ? (raw.work as SocietyWork[]) : [],
      reminders: Array.isArray(raw.reminders) ? (raw.reminders as SocietyReminder[]) : [],
      people_extra: Array.isArray(raw.people_extra)
        ? (raw.people_extra as SocietyPersonExtra[])
        : [],
      labels:
        raw.labels && typeof raw.labels === "object"
          ? (raw.labels as Record<string, string>)
          : {},
    };
  } catch {
    return empty;
  }
}
