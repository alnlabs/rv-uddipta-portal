import { ApprovalsList, type AdminRegistrationRequest } from "@/components/ApprovalsList";

export function AdminHome({
  waiting,
  flatsWithoutOwner,
  requests,
  loadError,
}: {
  readonly waiting: number
  readonly flatsWithoutOwner: number
  readonly requests: AdminRegistrationRequest[]
  readonly loadError?: string | null
}) {
  return (
    <section>
      <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-tight text-[#14241c]">
        New members
      </h1>
      <p className="mt-2 text-base text-[#3d5247]">People waiting for you to approve.</p>
      <p className="mt-4 text-base text-[#14241c]">
        {waiting} {waiting === 1 ? "person is" : "people are"} waiting.
      </p>
      <p className="mt-1 text-base text-[#14241c]">
        {flatsWithoutOwner}{" "}
        {flatsWithoutOwner === 1 ? "flat still has" : "flats still have"} no owner with email
        and phone.
      </p>
      <div className="mt-8">
        {loadError ? <p className="mb-4 text-[#8a2f2f]">{loadError}</p> : null}
        <ApprovalsList requests={requests} embedded />
      </div>
    </section>
  );
}
