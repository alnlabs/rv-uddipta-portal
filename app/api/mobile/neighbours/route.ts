import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "neighbours");
  if (access === "none") return mobileJson({ message: "Neighbours is turned off." }, 403);

  const q = new URL(request.url).searchParams.get("q")?.trim().toUpperCase() || "";
  const admin = createAdminClient();
  let query = admin
    .from("flats_public")
    .select("flat_number, wing, floor, type, owner_name, phone_masked, tenant_name, tenant_phone_masked, sale_status")
    .eq("sale_status", "sold")
    .not("owner_name", "is", null)
    .order("flat_number")
    .limit(80);

  if (q) {
    query = query.or(`flat_number.ilike.%${q}%,owner_name.ilike.%${q}%,tenant_name.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return mobileJson({ message: error.message }, 500);

  return mobileJson({
    homes: (data ?? [])
      .filter((row) => row.owner_name)
      .map((row) => ({
        home: String(row.flat_number),
        wing: String(row.wing || ""),
        floor: Number(row.floor || 0),
        type: String(row.type || ""),
        owner: String(row.owner_name || ""),
        phone: String(row.phone_masked || ""),
        tenant: String(row.tenant_name || ""),
        tenantPhone: String(row.tenant_phone_masked || ""),
      })),
  });
}
