import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { approveRegistration, rejectRegistration } from "@/app/actions/admin";
import { canManageAdmin, ensureProfile } from "@/lib/roles";
import { maskPhone } from "@/lib/phone";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export default async function AdminApprovalsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(user, supabase);
  if (!canManageAdmin(profile.role, user)) redirect("/admin/builder");

  const admin = createAdminClient();
  const { data: requests, error } = await admin
    .from("registration_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const pending = (requests ?? []).filter((row) => row.status === "pending");
  const others = (requests ?? []).filter((row) => row.status !== "pending");

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#14241c]">Owner registrations</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        Approve a request to link that Google account to a brochure flat.
      </p>

      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}

      <h3 className="mt-8 text-lg font-semibold">Pending</h3>
      {pending.length === 0 ? (
        <p className="mt-3 text-[#3d5247]">No pending requests.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {pending.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-xl">Flat {row.flat_number}</strong>
                <span className="text-sm text-[#3d5247]">
                  Floor {row.floor} · {row.type}
                </span>
              </div>
              <p className="mt-1">{row.owner_name}</p>
              <p className="text-sm text-[#3d5247]">{row.email || maskPhone(row.phone)}</p>
              <p className="text-sm text-[#3d5247]">{maskPhone(row.phone)}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <form action={approveRegistration.bind(null, row.id)} className="sm:w-auto">
                  <button
                    type="submit"
                    className="min-h-12 w-full rounded-full bg-[#c9a45c] px-4 py-2 font-semibold text-[#14241c] sm:w-auto"
                  >
                    Approve
                  </button>
                </form>
                <form
                  action={async (formData) => {
                    "use server";
                    await rejectRegistration(
                      row.id,
                      String(formData.get("reason") || ""),
                    );
                  }}
                  className="flex flex-1 flex-col gap-2 sm:flex-row"
                >
                  <input
                    name="reason"
                    placeholder="Reason (optional)"
                    className="min-h-12 flex-1 rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffdf8] px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="min-h-12 rounded-full border border-[rgba(138,47,47,0.3)] px-4 py-2 font-semibold text-[#8a2f2f]"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 ? (
        <>
          <h3 className="mt-10 text-lg font-semibold">Reviewed</h3>
          <ul className="mt-4 divide-y divide-[rgba(27,58,47,0.14)]">
            {others.map((row) => (
              <li key={row.id} className="py-3">
                <strong>Flat {row.flat_number}</strong> · {row.owner_name} ·{" "}
                <span className="capitalize">{row.status}</span>
                {row.reject_reason ? ` — ${row.reject_reason}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
