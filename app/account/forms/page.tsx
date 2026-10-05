import { redirect } from "next/navigation";
import { CreateEnquiryForm } from "@/components/CreateEnquiryForm";
import { WorkspaceHeader } from "@/components/form-ui";
import { listEnquiries } from "@/lib/enquiryData";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import Link from "next/link";

export default async function FormsAdminPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/account/forms");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");
  const forms = await listEnquiries();

  return (
    <section>
      <WorkspaceHeader
        title="Forms"
        lede="Create a form, share the link, and read the answers."
      />
      <ul className="mt-5 grid gap-2">
        {forms.map((form) => (
          <li key={form.id}>
            <Link
              href={`/account/forms/${form.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[#fffcf5] px-4 py-3 ring-1 ring-[rgba(27,58,47,0.1)]"
            >
              <span>
                <span className="block font-semibold text-[#14241c]">{form.title}</span>
                <span className="text-sm text-[#3d5247]">
                  {form.visibility === "private" ? "Private" : "Public"}
                  {form.closedAt ? " · Closed" : " · Open"}
                </span>
              </span>
              <span className="text-sm font-semibold text-[#1b3a2f]">Open</span>
            </Link>
          </li>
        ))}
      </ul>
      <CreateEnquiryForm />
    </section>
  );
}
