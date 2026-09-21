import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSaveFlat } from "@/app/actions/admin-manage";
import { OwnerDangerZone } from "@/components/OwnerDangerZone";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const LIST_COLUMNS = "id, flat_number, owner_name, email, floor, unit";
const DETAIL_COLUMNS =
  "id, flat_number, wing, floor, type, owner_name, email, phone, sale_status, occupancy, tenant_name, tenant_phone, open_for_rent, open_for_resale, user_id";

function searchTerm(raw: string) {
  return raw.replace(/["\\]/g, "").replace(/[^a-zA-Z0-9@. +\-_]/g, "").trim().slice(0, 64);
}

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; flat?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");

  const params = await searchParams;
  const q = (params.q || "").trim();
  const selected = (params.flat || "").trim().toUpperCase();
  const term = searchTerm(q);

  const admin = createAdminClient();
  const listQuery = admin
    .from("flats")
    .select(LIST_COLUMNS)
    .order("floor")
    .order("unit");

  const filter = term
    ? /^\d{10}$/.test(term)
      ? `flat_number.ilike."%${term}%",owner_name.ilike."%${term}%",email.ilike."%${term}%",phone.eq.${term}`
      : `flat_number.ilike."%${term}%",owner_name.ilike."%${term}%",email.ilike."%${term}%"`
    : null;

  const [{ data: listRows }, selectedRow] = await Promise.all([
    filter ? listQuery.or(filter) : listQuery,
    selected
      ? admin
          .from("flats")
          .select(DETAIL_COLUMNS)
          .eq("flat_number", selected)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const flats = listRows ?? [];

  let editing = selectedRow.data;
  if (!editing && flats[0]) {
    const { data } = await admin
      .from("flats")
      .select(DETAIL_COLUMNS)
      .eq("flat_number", flats[0].flat_number)
      .maybeSingle();
    editing = data;
  }

  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";

  let memberCount = 0;
  let renterCount = 0;
  if (editing) {
    const [members, renters] = await Promise.all([
      admin
        .from("flat_members")
        .select("*", { count: "exact", head: true })
        .eq("flat_id", editing.id),
      admin
        .from("flat_renters")
        .select("*", { count: "exact", head: true })
        .eq("flat_id", editing.id),
    ]);
    memberCount = members.count ?? 0;
    renterCount = renters.count ?? 0;
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#14241c]">Owners</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        Create or update owner, occupancy, tenant, and listing flags for any
        flat. Clearing a unit uses type-to-confirm and never deletes brochure
        inventory.
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

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <ul className="max-h-[min(28rem,calc(100dvh-12rem))] overflow-auto rounded-2xl border border-[rgba(27,58,47,0.12)] bg-[#fffcf5]">
          {flats.map((flat) => (
            <li key={flat.id}>
              <Link
                href={`/account/owners?flat=${flat.flat_number}${qParam}`}
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
                {flat.email ? (
                  <span className="mt-0.5 block truncate text-xs opacity-70">
                    {flat.email}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        {editing ? (
          <div className="min-w-0 rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]">
          <form
            action={adminSaveFlat}
            className="space-y-3"
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
              Email
              <input
                name="email"
                type="email"
                defaultValue={editing.email || ""}
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
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="min-h-11 rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c]"
              >
                Save flat
              </button>
            </div>
          </form>
          <OwnerDangerZone
            flatNumber={editing.flat_number}
            hasLinkedUser={Boolean(editing.user_id)}
            isSold={editing.sale_status === "sold"}
            memberCount={memberCount}
            renterCount={renterCount}
          />
          </div>
        ) : (
          <p className="text-[#3d5247]">No flats match.</p>
        )}
      </div>
    </section>
  );
}
