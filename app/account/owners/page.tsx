import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSaveFlat } from "@/app/actions/admin-manage";
import { OwnerDangerZone } from "@/components/OwnerDangerZone";
import {
  Disclosure,
  FieldGrid,
  Form,
  SelectField,
  SwitchField,
  TextField,
  WorkspaceHeader,
} from "@/components/form-ui";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const LIST_COLUMNS = "id, flat_number, owner_name, email, phone, floor, unit, sale_status";
const LIST_COLUMNS_NO_EMAIL = "id, flat_number, owner_name, floor, unit, sale_status";
const DETAIL_COLUMNS =
  "id, flat_number, wing, floor, type, owner_name, email, phone, sale_status, occupancy, tenant_name, tenant_phone, open_for_rent, open_for_resale, user_id";
const DETAIL_COLUMNS_NO_EMAIL =
  "id, flat_number, wing, floor, type, owner_name, phone, sale_status, occupancy, tenant_name, tenant_phone, open_for_rent, open_for_resale, user_id";

type OwnerListRow = {
  id: number
  flat_number: string
  owner_name: string | null
  email?: string | null
  phone?: string | null
  sale_status?: string | null
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
  const editing = (secondPass[1].data ?? null) as OwnerDetailRow | null;
  const needsOwner = flats.filter(
    (flat) =>
      flat.sale_status === "sold" &&
      (!flat.owner_name || !flat.email || !flat.phone),
  );
  const rows = term ? flats : needsOwner;

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

  function renderFlatList() {
    return (
    <ul className="max-h-[min(28rem,50dvh)] overflow-auto rounded-2xl border border-[rgba(27,58,47,0.12)] bg-[#fffcf5] lg:max-h-[min(36rem,calc(100dvh-12rem))]">
          {rows.length === 0 ? (
            <li className="px-3 py-4 text-base text-[#3d5247]">
              {term ? "No flats match." : "Nothing to fix."}
            </li>
          ) : null}
          {rows.map((flat) => (
            <li key={flat.id}>
              <Link
                href={`/account/owners?flat=${flat.flat_number}${qParam}`}
                className={`block min-h-14 border-b border-[rgba(27,58,47,0.06)] px-4 py-3 text-base ${
                  editing?.flat_number === flat.flat_number
                    ? "bg-[#1b3a2f] text-[#e8d5a3]"
                    : "hover:bg-[rgba(27,58,47,0.04)]"
                }`}
              >
                <strong className="text-lg">{flat.flat_number}</strong>
                <span className="mt-0.5 block truncate text-base opacity-80">
                  {!flat.owner_name || !flat.email || !flat.phone
                    ? "Needs an owner with email and phone."
                    : flat.owner_name}
                </span>
                {flat.email ? (
                  <span className="mt-0.5 block truncate text-sm opacity-70">
                    {flat.email}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
    </ul>
    );
  }

  return (
    <section>
      <WorkspaceHeader
        title="Flats"
        lede={
          needsOwner.length === 0
            ? "Every sold flat has an owner with email and phone."
            : `${needsOwner.length} sold ${needsOwner.length === 1 ? "flat needs" : "flats need"} an owner with email and phone.`
        }
      />

      <form className="mt-4 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search flats</span>
          <input
            name="q"
            defaultValue={params.q || ""}
            placeholder="Flat, owner, or email"
            className="field-control"
          />
        </label>
        <button type="submit" className="btn btn-forest shrink-0">
          Search
        </button>
      </form>

      {editing ? (
        <Disclosure
          title={`Change flat · ${editing.flat_number}`}
          className="field-panel mt-3 lg:hidden"
          titleClassName="text-[#14241c]"
        >
          {renderFlatList()}
        </Disclosure>
      ) : (
        <div className="mt-4 lg:hidden">
          {renderFlatList()}
        </div>
      )}

      <div
        className={`mt-4 min-w-0 items-start gap-4 lg:grid lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] ${
          editing ? "grid" : "hidden"
        }`}
      >
        <div className="hidden lg:block">
          {renderFlatList()}
        </div>

        {editing ? (
          <div className="field-panel min-w-0">
          <Form
            key={editing.flat_number}
            action={adminSaveFlat}
            success="Flat saved."
            className="grid gap-3"
          >
            <input type="hidden" name="flatNumber" value={editing.flat_number} />
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(27,58,47,0.08)] pb-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{editing.flat_number}</h2>
                <p className="mt-1 text-sm text-[#3d5247]">
                  Wing {editing.wing} · Floor {editing.floor} · {editing.type}
                  {editing.user_id ? " · Linked Google account" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/members?flat=${editing.flat_number}&as=owner`}
                  className="btn btn-forest"
                >
                  Add owner
                </Link>
                <Link
                  href={`/members?flat=${editing.flat_number}&as=family`}
                  className="btn btn-ghost ring-1 ring-[rgba(27,58,47,0.16)]"
                >
                  Add family
                </Link>
              </div>
            </div>

            <FieldGrid>
              <TextField
                label="Owner name"
                name="ownerName"
                defaultValue={editing.owner_name || ""}
                className="sm:col-span-2"
              />
              <TextField label="Phone" name="phone" type="tel" inputMode="numeric" defaultValue={editing.phone || ""} />
              {useEmail ? (
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={editing.email || ""}
                />
              ) : null}
            </FieldGrid>
            <Disclosure
              title="More about this flat"
              className="rounded-2xl bg-white/70 p-3"
              titleClassName="text-[#14241c]"
            >
              <div className="grid gap-3">
                <FieldGrid>
                  <SelectField
                    label="Sold or not"
                    name="saleStatus"
                    defaultValue={editing.sale_status || "unsold"}
                    options={[
                      { value: "sold", label: "Sold" },
                      { value: "unsold", label: "Not sold" },
                    ]}
                  />
                  <SelectField
                    label="Who stays here"
                    name="occupancy"
                    defaultValue={editing.occupancy || "owner_stay"}
                    options={[
                      { value: "owner_stay", label: "The owner" },
                      { value: "rented", label: "A tenant" },
                    ]}
                  />
                  <TextField
                    label="Tenant name"
                    name="tenantName"
                    defaultValue={editing.tenant_name || ""}
                  />
                  <TextField
                    label="Tenant phone"
                    name="tenantPhone"
                    defaultValue={editing.tenant_phone || ""}
                  />
                </FieldGrid>
                <SwitchField
                  label="Open for rent"
                  name="openForRent"
                  defaultChecked={Boolean(editing.open_for_rent)}
                />
                <SwitchField
                  label="Open for resale"
                  name="openForResale"
                  defaultChecked={Boolean(editing.open_for_resale)}
                />
              </div>
            </Disclosure>
            <button type="submit" className="btn btn-gold w-full sm:w-fit">
              Save
            </button>
          </Form>
          <Disclosure title="Clear this flat" className="mt-4" titleClassName="text-[#8a2f2f]">
          <OwnerDangerZone
            flatNumber={editing.flat_number}
            hasLinkedUser={Boolean(editing.user_id)}
            isSold={editing.sale_status === "sold"}
            memberCount={memberCount}
            renterCount={renterCount}
          />
          </Disclosure>
          </div>
        ) : (
          <div className="field-panel hidden lg:block">
            <p className="text-lg font-semibold text-[#14241c]">Choose a flat</p>
            <p className="mt-1 text-base text-[#3d5247]">
              Pick one from the list. Search if you already know the number.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
