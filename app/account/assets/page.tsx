import { redirect } from "next/navigation";
import { saveAmcContract, saveAsset } from "@/app/actions/business-pack";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canAccessAdminDesk, getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function OfficeAssetsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!(await canAccessAdminDesk())) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "assets");
  if (access === "none") return <FeatureOff label="Assets and AMC" />;

  const admin = createAdminClient();
  const [{ data: assets, error }, { data: contracts, error: contractError }] = await Promise.all([
    admin.from("assets").select("id, name, kind, location, active").order("name"),
    admin.from("amc_contracts").select("id, asset_id, vendor_name, starts_on, ends_on, note").order("ends_on", { ascending: true }),
  ]);
  if (error || contractError) return <DeskError message={(error || contractError)?.message || "Could not load assets."} />;

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Assets and AMC</h1>
      <p className="mt-2 text-[#475569]">Lifts, pumps, fire systems, and vendor maintenance contracts.</p>

      {access === "manage" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <form action={saveAsset} className="slab grid gap-3 p-4">
            <h2 className="font-semibold text-[#0f172a]">Add asset</h2>
            <input name="name" placeholder="Name" className="field-control" required />
            <input name="kind" placeholder="Kind (lift, pump, fire…)" className="field-control" />
            <input name="location" placeholder="Location" className="field-control" />
            <button type="submit" className="btn-slate w-fit">Save asset</button>
          </form>
          <form action={saveAmcContract} className="slab grid gap-3 p-4">
            <h2 className="font-semibold text-[#0f172a]">Add AMC</h2>
            <select name="assetId" className="field-control" required defaultValue="">
              <option value="" disabled>Choose asset</option>
              {(assets ?? []).map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name}</option>
              ))}
            </select>
            <input name="vendorName" placeholder="Vendor" className="field-control" required />
            <input name="startsOn" type="date" className="field-control" />
            <input name="endsOn" type="date" className="field-control" />
            <input name="note" placeholder="Note" className="field-control" />
            <button type="submit" className="btn-slate w-fit">Save contract</button>
          </form>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Assets</h2>
        <ul className="mt-3 grid gap-2">
          {(assets ?? []).map((asset) => (
            <li key={asset.id} className="text-sm text-[#0f172a]">
              {asset.name} · {asset.kind}{asset.location ? ` · ${asset.location}` : ""}
            </li>
          ))}
          {!assets?.length ? <li className="text-sm text-[#475569]">No assets yet.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Contracts</h2>
        <ul className="mt-3 grid gap-2">
          {(contracts ?? []).map((row) => {
            const asset = (assets ?? []).find((item) => item.id === row.asset_id);
            return (
              <li key={row.id} className="text-sm text-[#0f172a]">
                {asset?.name || "Asset"} · {row.vendor_name}
                {row.ends_on ? ` · ends ${row.ends_on}` : ""}
              </li>
            );
          })}
          {!contracts?.length ? <li className="text-sm text-[#475569]">No AMC contracts yet.</li> : null}
        </ul>
      </section>
    </section>
  );
}
