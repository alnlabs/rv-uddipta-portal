import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateEnquiryForm } from "@/components/CreateEnquiryForm";
import { WorkspaceHeader } from "@/components/form-ui";
import { listEnquiries } from "@/lib/enquiryData";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function FormsAdminPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/account/forms");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");
  const forms = await listEnquiries();

  return (
    <section className="mx-auto w-full max-w-3xl">
      <WorkspaceHeader
        title="Forms"
        lede="Create a form, share the link, and read what people send back."
      />
      <div className="mt-6 grid gap-8">
        {forms.length ? (
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#14241c]">Your forms</h2>
            <ul className="mt-4 grid gap-4">
              {forms.map((form) => (
                <li key={form.id}>
                  <Link
                    href={`/account/forms/${form.id}`}
                    className="form-sheet flex flex-col gap-3 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap gap-2">
                        <span
                          className={
                            form.closedAt
                              ? "rounded-full bg-[#ebe6dc] px-2.5 py-1 text-xs font-semibold text-[#3d5247]"
                              : "rounded-full bg-[#d8ebe1] px-2.5 py-1 text-xs font-semibold text-[#103126]"
                          }
                        >
                          {form.closedAt ? "Closed" : "Open"}
                        </span>
                        <span className="rounded-full bg-[#f0e6d0] px-2.5 py-1 text-xs font-semibold text-[#7a5c22]">
                          {form.visibility === "private" ? "Residents only" : "Anyone with the link"}
                        </span>
                      </span>
                      <span className="mt-3 block text-xl font-semibold text-[#14241c]">{form.title}</span>
                      {form.note ? (
                        <span className="mt-1 block text-sm leading-relaxed text-[#3d5247]">{form.note}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#1b3a2f]">Edit form</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <CreateEnquiryForm />
      </div>
    </section>
  );
}
