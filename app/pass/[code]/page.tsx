import QRCode from "qrcode";
import { Mark } from "@/components/Mark";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function PassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const admin = createAdminClient();
  const { data: pass } = await admin
    .from("visitor_passes")
    .select("visitor_name, visitor_phone, flat_number, purpose, visit_on, status, code")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!pass) {
    return (
      <section className="page-gutter max-w-md py-16">
        <Mark size={56} alt="RV Uddiipta" />
        <h1 className="mt-4 text-3xl font-semibold text-[#0f172a]">Pass not found</h1>
      </section>
    );
  }

  const flat = pass.flat_number || "";
  const wing = flat.slice(0, 1);
  const floor = flat.length > 3 ? flat.slice(1, -2) : flat.slice(1, 2);
  const status = String(pass.status);
  const showQr = !["refused", "cancelled", "left"].includes(status);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://uddipta.vercel.app").replace(/\/$/, "");
  const passUrl = `${site}/pass/${String(pass.code).toUpperCase()}`;
  const qrDataUrl = showQr
    ? await QRCode.toDataURL(passUrl, {
        margin: 1,
        width: 280,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
    : null;

  return (
    <section className="page-gutter max-w-md py-10">
      <Mark size={56} alt="RV Uddiipta" />
      <p className="eyebrow mt-4">RV Uddiipta</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Visitor pass</h1>
      <div className="slab mt-6 p-5">
        {qrDataUrl ? (
          <>
            <p className="text-sm font-semibold text-[#0f172a]">Show this QR at the gate</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR for pass ${pass.code}`}
              width={280}
              height={280}
              className="mx-auto mt-4 rounded-2xl bg-white p-3"
            />
          </>
        ) : (
          <p className="text-sm font-semibold text-[#0f172a]">This pass is no longer valid at the gate.</p>
        )}
        <p className="mt-4 text-center text-2xl font-semibold tracking-[0.2em] text-[#0f172a]">{pass.code}</p>
        <h2 className="mt-4 text-xl font-semibold text-[#0f172a]">{pass.visitor_name}</h2>
        <p className="mt-1 text-[#475569]">{pass.purpose || "Visitor"}</p>
        {pass.visitor_phone ? <p className="mt-1 text-sm text-[#475569]">{pass.visitor_phone}</p> : null}
        <p className="mt-4 text-sm font-semibold text-[#0f172a]">Path to {flat}</p>
        <p className="mt-1 text-sm text-[#475569]">
          Wing {wing || "—"}, floor {floor || "—"}, home {flat}. Security scans the QR.
        </p>
        <p className="badge-notice mt-4">{String(pass.status).replaceAll("_", " ")}</p>
        <p className="mt-3 text-sm text-[#475569]">{pass.visit_on}</p>
      </div>
    </section>
  );
}
