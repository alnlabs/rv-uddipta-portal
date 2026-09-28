import { ApprovalsList, type AdminRegistrationRequest } from "@/components/ApprovalsList";
import { PageTitle } from "@/components/chrome";

export type AdminHomeStats = {
  pending: number
  sold: number
  unsold: number
  named: number
  linked: number
  profiles: number
};

export function AdminHome({
  stats,
  requests,
  loadError,
}: {
  readonly stats: AdminHomeStats
  readonly requests: AdminRegistrationRequest[]
  readonly loadError?: string | null
}) {
  return (
    <section>
      <PageTitle
        kicker="Operations"
        title="Approvals"
        lede="Link Google accounts to brochure flats. Owners, people, and builder stay in the admin sidebar."
      />

      <dl className="mt-6 grid grid-cols-3 gap-x-4 gap-y-3 border-b border-[rgba(27,58,47,0.1)] pb-6 text-sm md:grid-cols-6">
        {(
          [
            [stats.pending, "Waiting"],
            [stats.sold, "Sold"],
            [stats.unsold, "Unsold"],
            [stats.named, "Named"],
            [stats.linked, "Linked"],
            [stats.profiles, "Accounts"],
          ] as const
        ).map(([value, label]) => (
          <div key={label}>
            <dt className="text-[#3d5247]">{label}</dt>
            <dd className="mt-0.5 text-xl font-semibold text-[#14241c]">{value}</dd>
          </div>
        ))}
      </dl>

      <div id="approvals" className="mt-8 scroll-mt-24">
        {loadError ? <p className="mb-4 text-[#8a2f2f]">{loadError}</p> : null}
        <ApprovalsList requests={requests} embedded />
      </div>
    </section>
  );
}
