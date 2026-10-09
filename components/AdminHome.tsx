import { ApprovalsList, type AdminRegistrationRequest } from "@/components/ApprovalsList";
import { WorkspaceHeader } from "@/components/form-ui";

export function AdminHome({
  requests,
  loadError,
}: {
  readonly requests: AdminRegistrationRequest[]
  readonly loadError?: string | null
}) {
  const waiting = requests.filter((row) => row.status === "pending").length;
  const approved = requests.filter((row) => row.status === "approved").length;
  const rejected = requests.filter((row) => row.status === "rejected").length;

  return (
    <section>
      <WorkspaceHeader
        title="New members"
        lede="People waiting for you to approve."
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          [waiting, "Waiting", "bg-[#0f172a] text-[#f8fafc]"],
          [approved, "Approved", "bg-[#ffffff] text-[#0f172a]"],
          [rejected, "Declined", "bg-[#ffffff] text-[#0f172a]"],
        ].map(([count, label, tone]) => (
          <div
            key={String(label)}
            className={`rounded-2xl px-3 py-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] ${tone}`}
          >
            <p className="text-3xl font-semibold leading-none">{count}</p>
            <p className="mt-1 text-xs font-semibold tracking-wide uppercase opacity-80">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        {loadError ? <p className="mb-4 text-[#8a2f2f]">{loadError}</p> : null}
        <ApprovalsList requests={requests} />
      </div>
    </section>
  );
}
