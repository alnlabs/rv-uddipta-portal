import { ApprovalsList, type AdminRegistrationRequest } from "@/components/ApprovalsList";

export function AdminHome({
  requests,
  loadError,
}: {
  readonly requests: AdminRegistrationRequest[]
  readonly loadError?: string | null
}) {
  return (
    <section className="max-w-2xl">
      <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-tight text-[#14241c]">
        New members
      </h1>
      <p className="mt-2 text-lg text-[#3d5247]">People waiting for you to approve.</p>
      <div className="mt-6">
        {loadError ? <p className="mb-4 text-[#8a2f2f]">{loadError}</p> : null}
        <ApprovalsList requests={requests} />
      </div>
    </section>
  );
}
