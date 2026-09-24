import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSaveFlat } from "@/app/actions/admin-manage";
import { OwnerDangerZone } from "@/components/OwnerDangerZone";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const LIST_COLUMNS = "id, flat_number, owner_name, email, floor, unit";
const LIST_COLUMNS_NO_EMAIL = "id, flat_number, owner_name, floor, unit";
const DETAIL_COLUMNS =
  "id, flat_number, wing, floor, type, owner_name, email, phone, sale_status, occupancy, tenant_name, tenant_phone, open_for_rent, open_for_resale, user_id";
const DETAIL_COLUMNS_NO_EMAIL =
  "id, flat_number, wing, floor, type, owner_name, phone, sale_status, occupancy, tenant_name, tenant_phone, open_for_rent, open_for_resale, user_id";

type OwnerListRow = {
  id: number
  flat_number: string
  owner_name: string | null
  email?: string | null
  floor: number
  unit: number
};

type OwnerDetailRow = {
  id: number
  flat_number: string
  wing: string | null
  floor: number
  type: string
  owner_name: string | null
  email?: string | null
  phone: string | null
  sale_status: string | null
  occupancy: string | null
  tenant_name: string | null
  tenant_phone: string | null
  open_for_rent: boolean | null
  open_for_resale: boolean | null
  user_id: string | null
};

function searchTerm(raw: string) {
  return raw.replace(/["\\]/g, "").replace(/[^a-zA-Z0-9@. +\-_]/g, "").trim().slice(0, 64);
}

function missingEmailColumn(message: string | undefined) {
  return Boolean(message && /column flats\.email does not exist/i.test(message));
}

function ownerFilter(term: string, includeEmail: boolean) {
  const fields = includeEmail
    ? `flat_number.ilike."%${term}%",owner_name.ilike."%${term}%",email.ilike."%${term}%"`
    : `flat_number.ilike."%${term}%",owner_name.ilike."%${term}%"`;
  return /^\d{10}$/.test(term) ? `${fields},phone.eq.${term}` : fields;
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
  const filter = term ? ownerFilter(term, true) : null;
  const listQuery = admin
    .from("flats")
    .select(LIST_COLUMNS)
    .order("floor")
    .order("unit");

  const firstPass = await Promise.all([
    filter ? listQuery.or(filter) : listQuery,
    selected
      ? admin
          .from("flats")
          .select(DETAIL_COLUMNS)
          .eq("flat_number", selected)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const useEmail =
    !missingEmailColumn(firstPass[0].error?.message) &&
    !missingEmailColumn(firstPass[1].error?.message);

  const fallbackFilter = term ? ownerFilter(term, false) : null;
  const fallbackList = admin
    .from("flats")
    .select(LIST_COLUMNS_NO_EMAIL)
    .order("floor")
    .order("unit");
  const secondPass = useEmail
    ? firstPass
    : await Promise.all([
        fallbackFilter ? fallbackList.or(fallbackFilter) : fallbackList,
        selected
          ? admin
              .from("flats")
              .select(DETAIL_COLUMNS_NO_EMAIL)
              .eq("flat_number", selected)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

  const listError = secondPass[0].error;
  const selectedError = secondPass[1].error;
  if (listError) {
    throw new Error(`Could not load owners: ${listError.message}`);
  }
  if (selectedError) {
    throw new Error(`Could not load flat: ${selectedError.message}`);
  }
  const flats = (secondPass[0].data ?? []) as OwnerListRow[];

  let editing = (secondPass[1].data ?? null) as OwnerDetailRow | null;
  if (!editing && flats[0]) {
    const columns = useEmail ? DETAIL_COLUMNS : DETAIL_COLUMNS_NO_EMAIL;
    const { data, error } = await admin
      .from("flats")
      .select(columns)
      .eq("flat_number", flats[0].flat_number)
      .maybeSingle();
    if (error) {
      throw new Error(`Could not load flat: ${error.message}`);
    }
    editing = data as OwnerDetailRow | null;
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
      <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
        Administration
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-[#14241c]">Owners</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        {flats.length} flat{flats.length === 1 ? "" : "s"}
        {term ? " matching this search" : " in the brochure"}. Update owner,
        occupancy, tenant, and listing flags. Clearing a unit uses
        type-to-confirm and never deletes inventory.
      </p>
      <Link
        href="/account"
        className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#2f5a48]"
      >
        ← Admin home
      </Link>

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
            {useEmail ? (
            <label className="block text-sm font-semibold">
              Email
              <input
                name="email"
                type="email"
                defaultValue={editing.email || ""}
                className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 font-normal"
              />
            </label>
            ) : null}
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
