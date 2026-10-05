import Link from "next/link";
import { redirect } from "next/navigation";
import { listEnquiries } from "@/lib/enquiryData";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function OpenFormsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/forms");
  const community = isCommunityRole(profile.role);
  const forms = (await listEnquiries()).filter((form) => {
    if (form.closedAt) return false;
    if (form.visibility === "private") return community;
    return true;
  });

  return (
    <div className="page-gutter max-w-xl py-6 md:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-[#14241c]">Forms</h1>
      <p className="mt-2 text-lg text-[#3d5247]">Open forms you can answer.</p>
      {forms.length ? (
        <ul className="mt-5 grid gap-2">
          {forms.map((form) => (
            <li key={form.id}>
              <Link
                href={`/f/${form.slug}`}
                className="block rounded-2xl bg-[#fffcf5] px-4 py-3 ring-1 ring-[rgba(27,58,47,0.1)]"
              >
                <span className="block font-semibold text-[#14241c]">{form.title}</span>
                {form.note ? (
                  <span className="mt-1 block text-sm text-[#3d5247]">{form.note}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-[#3d5247]">No open forms right now.</p>
      )}
    </div>
  );
}
