import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSaveFlat } from "@/app/actions/admin-manage";
import { canManageAdmin, ensureProfile } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; flat?: string }>
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) redirect("/admin/builder");

  const params = await searchParams;
  const q = (params.q || "").trim().toUpperCase();
  const selected = (params.flat || "").trim().toUpperCase();

  const admin = createAdminClient();
  let query = admin
    .from("flats")
    .select(
      "id, flat_number, wing, floor, type, owner_name, phone, sale_status, occupancy, tenant_name, tenant_phone, open_for_rent, open_for_resale, user_id",
    )
    .order("floor")
    .order("unit");

  const { data: rows } = await query;
  let flats = rows ?? [];
  if (q) {
    flats = flats.filter(
      (f) =>
        f.flat_number.includes(q) ||
        (f.owner_name || "").toUpperCase().includes(q),
    );
  }

  const editing =
    flats.find((f) => f.flat_number === selected) ||
    flats.find((f) => f.owner_name) ||
    flats[0] ||
    null;

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#14241c]">Owners</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        Create or update owner, occupancy, tenant, and listing flags for any flat.
      </p>

      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Search flat or owner"
          className="min-h-11 flex-1 rounded-xl border border-[rgba(27,58,47,0.14)] px-3"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
        >
          Search
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <ul className="max-h-[28rem] overflow-auto rounded-2xl border border-[rgba(27,58,47,0.12)] bg-[#fffcf5]">
          {flats.slice(0, 120).map((flat) => (
            <li key={flat.id}>
              <Link
                href={`/admin/owners?flat=${flat.flat_number}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`block border-b border-[rgba(27,58,47,0.06)] px-3 py-2 text-sm ${
                  editing?.flat_number === flat.flat_number
                    ? "bg-[#1b3a2f] text-[#e8d5a3]"
                    : "hover:bg-[rgba(27,58,47,0.04)]"
                }`}
              >
                <strong>{flat.flat_number}</strong>
                <span className="mt-0.5 block truncate text-xs opacity-80">
                  {flat.owner_name || "Unsold"}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {editing ? (
          <form
            action={adminSaveFlat}
            className="space-y-3 rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]"
          >
            <input type="hidden" name="flatNumber" value={editing.flat_number} />
            <h3 className="text-xl font-semibold">{editing.flat_number}</h3>
            <p className="text-sm text-[#3d5247]">
              Wing {editing.wing} · Floor {editing.floor} · {editing.type}
              {editing.user_id ? " · Linked Google account" : ""}
            </p>

            <label className="block text-sm font-semibold">
              Owner name
              <input
                name="ownerName"
                defaultValue={editing.owner_name || ""}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Phone
              <input
                name="phone"
                defaultValue={editing.phone || ""}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Sale
              <select
                name="saleStatus"
                defaultValue={editing.sale_status || "unsold"}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              >
                <option value="sold">Sold</option>
                <option value="unsold">Unsold</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Occupancy
              <select
                name="occupancy"
                defaultValue={editing.occupancy || "owner_stay"}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              >
                <option value="owner_stay">Owner stay</option>
                <option value="rented">Rented</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Tenant name
              <input
                name="tenantName"
                defaultValue={editing.tenant_name || ""}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Tenant phone
              <input
                name="tenantPhone"
                defaultValue={editing.tenant_phone || ""}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                name="openForRent"
                defaultChecked={Boolean(editing.open_for_rent)}
              />
              Open for rent
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                name="openForResale"
                defaultChecked={Boolean(editing.open_for_resale)}
              />
              Open for resale
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#8a2f2f]">
              <input type="checkbox" name="unlinkUser" value="1" />
              Unlink Google account
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="min-h-11 rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c]"
              >
                Save flat
              </button>
              <button
                type="submit"
                name="clearOwner"
                value="1"
                className="min-h-11 rounded-full border border-[rgba(138,47,47,0.3)] px-5 text-sm font-semibold text-[#8a2f2f]"
              >
                Clear to unsold
              </button>
            </div>
          </form>
        ) : (
          <p className="text-[#3d5247]">No flats match.</p>
        )}
      </div>
    </section>
  );
}
