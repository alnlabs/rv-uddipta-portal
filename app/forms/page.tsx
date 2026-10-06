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
    <div className="page-gutter w-full py-8 md:py-14">
      <header>
        <p className="eyebrow">Community</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14241c] md:text-4xl">
          Forms
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#3d5247]">
          Open forms you can answer. Each one asks a few questions and keeps one answer per flat.
        </p>
      </header>
      {forms.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => (
            <li key={form.id}>
              <Link href={`/f/${form.slug}`} className="form-sheet block transition hover:-translate-y-0.5">
                <p className="text-xs font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
                  {form.visibility === "private" ? "Residents only" : "Open form"}
                </p>
                <span className="mt-2 block text-xl font-semibold text-[#14241c]">{form.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-[#3d5247]">
                  {form.note || "Tap to read the questions and send your answer."}
                </span>
                <span className="mt-4 inline-flex text-sm font-semibold text-[#1b3a2f]">
                  Fill this form
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="form-sheet mt-6 text-base leading-relaxed text-[#3d5247]">
          No open forms right now. When an admin shares one, it will show up here.
        </p>
      )}
    </div>
  );
}
