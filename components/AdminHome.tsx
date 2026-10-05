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
          [waiting, "Waiting", "bg-[#14241c] text-[#e8d5a3]"],
          [approved, "Approved", "bg-[#fffcf5] text-[#14241c]"],
          [rejected, "Declined", "bg-[#fffcf5] text-[#14241c]"],
        ].map(([count, label, tone]) => (
          <div
            key={String(label)}
            className={`rounded-2xl px-3 py-3 shadow-[inset_0_0_0_1px_rgba(27,58,47,0.08)] ${tone}`}
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
