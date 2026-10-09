import { redirect } from "next/navigation";
import { saveCommitteeItem } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canSitCommittee } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function CommitteePage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/committee");
  if (!canSitCommittee(profile.role, user)) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "committee");
  if (access === "none") return <FeatureOff label="Committee" />;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("committee_items")
    .select("id, title, body, kind, status, decision")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return <DeskError message={error.message} />;

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Committee</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Decisions</h1>
      <p className="mt-2 text-[#475569]">Policies, budgets, and votes. Resident polls stay on their own page.</p>
      {access === "manage" ? (
      <form action={saveCommitteeItem} className="slab mt-6 grid gap-3 p-4">
        <input name="title" required placeholder="What needs a decision" className="field-control" />
        <textarea name="body" placeholder="The note" className="field-control" />
        <select name="kind" className="field-control">
          <option value="policy">Policy</option>
          <option value="budget">Budget</option>
          <option value="vote">Vote</option>
        </select>
        <button type="submit" className="btn-slate w-fit">Add item</button>
      </form>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {(data ?? []).map((item) => (
          <li key={item.id} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">{item.kind} · {item.status}</p>
            <h2 className="mt-1 text-lg font-semibold text-[#0f172a]">{item.title}</h2>
            {item.body ? <p className="mt-1 text-sm text-[#475569]">{item.body}</p> : null}
            {item.decision ? <p className="mt-2 text-sm text-[#0f172a]">Decision: {item.decision}</p> : null}
            {access === "manage" ? (
            <form action={saveCommitteeItem} className="mt-3 grid gap-2">
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="title" value={item.title} />
              <input type="hidden" name="body" value={item.body || ""} />
              <input type="hidden" name="kind" value={item.kind} />
              <input name="decision" placeholder="Record the decision" className="field-control" />
              <button type="submit" className="btn-line w-fit">Save decision</button>
            </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
