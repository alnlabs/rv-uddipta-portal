import { redirect } from "next/navigation";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
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
  if (!canManageAdmin(profile.role, user)) redirect("/");

  const [openRequests, visitorsInside, pendingBookings, openJobs] = await Promise.all([
    count("member_notes", "status", "new"),
    count("visitor_passes", "status", "inside"),
    count("amenity_bookings", "status", "pending"),
    count("work_orders", "status", "open"),
  ]);

  const cards = [
    ["Requests still new", openRequests],
    ["Visitors inside", visitorsInside],
    ["Bookings waiting", pendingBookings],
    ["Jobs still open", openJobs],
  ];

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Reports</h1>
      <p className="mt-2 text-[#475569]">A fixed picture of requests, visitors, bookings, and jobs.</p>
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
