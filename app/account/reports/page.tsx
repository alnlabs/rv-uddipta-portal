import { redirect } from "next/navigation";
import { canAccessAdminDesk, getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

async function count(table: string, column: string, value?: string) {
  const admin = createAdminClient();
  let query = admin.from(table).select("id", { count: "exact", head: true });
  if (value) query = query.eq(column, value);
  const { count: total } = await query;
  return total ?? 0;
}

export default async function ReportsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!(await canAccessAdminDesk())) redirect("/");

  const [
    openRequests,
    visitorsInside,
    pendingBookings,
    openJobs,
    openInvoices,
    openNocs,
    openOps,
    openIncidents,
  ] = await Promise.all([
    count("member_notes", "status", "new"),
    count("visitor_passes", "status", "inside"),
    count("amenity_bookings", "status", "pending"),
    count("work_orders", "status", "open"),
    count("invoices", "status", "open"),
    count("document_requests", "status", "submitted"),
    count("ops_logs", "status", "open"),
    count("security_incidents", "status", "open"),
  ]);

  const cards = [
    ["Requests still new", openRequests],
    ["Visitors inside", visitorsInside],
    ["Bookings waiting", pendingBookings],
    ["Jobs still open", openJobs],
    ["Open dues invoices", openInvoices],
    ["NOCs waiting", openNocs],
    ["Building ops open", openOps],
    ["Security incidents open", openIncidents],
  ];

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Reports</h1>
      <p className="mt-2 text-[#475569]">A fixed picture of requests, visitors, bookings, jobs, dues, and security.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map(([label, total]) => (
          <li key={String(label)} className="slab p-4">
            <p className="text-3xl font-semibold text-[#0f172a]">{total}</p>
            <p className="mt-1 text-sm text-[#475569]">{label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
