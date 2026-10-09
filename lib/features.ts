import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export const FEATURE_CATALOG = [
  { key: "feed", group: "Community", label: "Community feed", summary: "Posts and discussion." },
  { key: "announcements", group: "Community", label: "Announcements", summary: "Official notices." },
  { key: "events", group: "Community", label: "Events", summary: "Gatherings and RSVPs." },
  { key: "polls", group: "Community", label: "Polls", summary: "Votes from residents." },
  { key: "forms", group: "Community", label: "Forms", summary: "One answer per home." },
  { key: "neighbours", group: "Home", label: "Neighbours", summary: "Who lives in each home." },
  { key: "requests", group: "Services", label: "Requests", summary: "Tracked help and feedback." },
  { key: "visitor_passes", group: "Visitors", label: "Visitor passes", summary: "A pass for someone coming to a home." },
  { key: "gate", group: "Visitors", label: "Security gate", summary: "Who is waiting, inside, and expected." },
  { key: "parking", group: "Parking", label: "Parking", summary: "Vehicles, bays, and visitor bays." },
  { key: "inbox", group: "Communication", label: "Inbox", summary: "Notifications and messages." },
  { key: "building", group: "Building", label: "Building", summary: "Floors, plans, and the 3D view." },
  { key: "amenities", group: "Services", label: "Amenities", summary: "Book a shared space." },
  { key: "maintenance", group: "Services", label: "Maintenance", summary: "Jobs for the team." },
  { key: "committee", group: "Community", label: "Committee", summary: "Decisions for the committee." },
  { key: "documents", group: "Home", label: "Home records", summary: "Possession letter, verification, and where each paper is kept." },
] as const;

export type FeatureKey = (typeof FEATURE_CATALOG)[number]["key"];

const ALL_KEYS = FEATURE_CATALOG.map((item) => item.key);

export async function loadEnabledFeatures(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("community_features").select("key, enabled");
    if (error || !data?.length) return [...ALL_KEYS];
    return data.filter((row) => row.enabled).map((row) => String(row.key));
  } catch {
    return [...ALL_KEYS];
  }
}

export async function isFeatureEnabled(key: string) {
  const enabled = await loadEnabledFeatures();
  return enabled.includes(key);
}

export async function loadCategoryLabels(): Promise<Record<string, string>> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("categories").select("value, label");
    if (error || !data) return {};
    const labels: Record<string, string> = {};
    for (const row of data) {
      const label = String(row.label || "").trim();
      if (label) labels[String(row.value)] = label;
    }
    return labels;
  } catch {
    return {};
  }
}

async function disabledInModule(module: "community" | "request"): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("categories")
      .select("value, enabled")
      .eq("module", module);
    if (error || !data) return [];
    return data.filter((row) => row.enabled === false).map((row) => String(row.value));
  } catch {
    return [];
  }
}

export function disabledCommunityKinds() {
  return disabledInModule("community");
}

export function disabledRequestKinds() {
  return disabledInModule("request");
}
