import "server-only";

import { BUILDING } from "@/lib/building";
import { createAdminClient } from "@/utils/supabase/admin";
import type { createClient } from "@/utils/supabase/server";

export type ProjectInfo = {
  name: string
  developer: string
  tagline: string
  location: string
  address: string
  acres: number
  units: number
  floors: number
  rera: string
  igbc: string
  clubhouseSqft: number
  greeneryFacingPercent: number
  nearby: { label: string; distance: string }[]
  amenities: string[]
};

const FALLBACK: ProjectInfo = {
  name: BUILDING.name,
  developer: BUILDING.developer,
  tagline: BUILDING.tagline,
  location: BUILDING.location,
  address: BUILDING.address,
  acres: BUILDING.acres,
  units: BUILDING.units,
  floors: BUILDING.floors,
  rera: BUILDING.rera,
  igbc: BUILDING.igbc,
  clubhouseSqft: BUILDING.clubhouseSqft,
  greeneryFacingPercent: BUILDING.greeneryFacingPercent,
  nearby: [...BUILDING.nearby],
  amenities: [...BUILDING.amenities],
};

type AnyClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;

export async function getProjectInfo(client?: AnyClient): Promise<ProjectInfo> {
  const db = client ?? createAdminClient();
  const { data } = await db.from("project_info").select("*").eq("id", 1).maybeSingle();
  if (!data) return FALLBACK;
  return {
    name: data.name || FALLBACK.name,
    developer: data.developer || FALLBACK.developer,
    tagline: data.tagline || FALLBACK.tagline,
    location: data.location || FALLBACK.location,
    address: data.address || FALLBACK.address,
    acres: Number(data.acres ?? FALLBACK.acres),
    units: Number(data.units ?? FALLBACK.units),
    floors: Number(data.floors ?? FALLBACK.floors),
    rera: data.rera || FALLBACK.rera,
    igbc: data.igbc || FALLBACK.igbc,
    clubhouseSqft: Number(data.clubhouse_sqft ?? FALLBACK.clubhouseSqft),
    greeneryFacingPercent: Number(
      data.greenery_facing_percent ?? FALLBACK.greeneryFacingPercent,
    ),
    nearby: Array.isArray(data.nearby) ? data.nearby : FALLBACK.nearby,
    amenities: Array.isArray(data.amenities) ? data.amenities : FALLBACK.amenities,
  };
}
