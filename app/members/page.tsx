import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MembersDirectory } from "@/components/MembersDirectory";
import { loadBoardPayload } from "@/lib/boardData";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import { ensureProfile, isCommunityRole } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(user, supabase);
  const community = isCommunityRole(profile.role);
  const board = await loadBoardPayload(user, supabase, profile.role);
  const params = await searchParams;
  const q = (params.q || "").trim().toLowerCase();

  if (!community) {
    return (
      <section className="page-gutter max-w-xl py-10 md:py-16">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Members
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          Community directory
        </h1>
        <p className="mt-3 text-[#3d5247]">
          Owner and household names are visible after your flat is linked and
          approved. You can still browse the public dashboard and Community 3D.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center rounded-full bg-[#1b3a2f] px-5 text-sm font-semibold text-[#e8d5a3]"
          >
            Link your flat
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full border border-[rgba(27,58,47,0.14)] px-5 text-sm font-semibold text-[#1b3a2f]"
          >
            Dashboard
          </Link>
        </div>
      </section>
    );
  }

  const sold = board.flats
    .filter((flat) => flat.saleStatus === "sold" && flat.ownerName)
    .map((flat) => ({
      flatNumber: flat.flatNumber,
      wing: flat.wing,
      floor: flat.floor,
      type: flat.type,
      facing: flat.facing,
      areaSqft: flat.areaSqft,
      ownerName: flat.ownerName,
      ownerPhotoUrl: flat.ownerPhotoUrl,
      phoneMasked: flat.phoneMasked,
      tenantName: flat.tenantName,
      tenantPhoneMasked: flat.tenantPhoneMasked,
      members: board.membersByFlatId[flat.id] ?? [],
      renters: board.rentersByFlatId[flat.id] ?? [],
      registrationDate: flat.registrationDate,
      interiorStartDate: flat.interiorStartDate,
      interiorDate: flat.interiorDate,
      ceremonyDate: flat.ceremonyDate,
      movingDate: flat.movingDate,
      occupancyLabel: saleOccupancyLabel(flat),
      statusLabel: possessionLabel(flat),
      openForRent: flat.openForRent,
      openForResale: flat.openForResale,
    }))
    .filter((flat) => {
      if (!q) return true;
      const hay = [
        flat.flatNumber,
        flat.ownerName,
        flat.tenantName,
        ...flat.members.map((member) => member.name),
        ...flat.renters.map((renter) => renter.name),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      const wing = (a.wing || "A").localeCompare(b.wing || "A");
      if (wing) return wing;
      return a.floor - b.floor || a.flatNumber.localeCompare(b.flatNumber);
    });

  return (
    <section className="page-gutter max-w-5xl py-6 md:py-10">
      <header className="flex flex-col gap-4 border-b border-[rgba(27,58,47,0.1)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
            Directory
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
            Members
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#3d5247]">
            Tap a card for full owner, household, and unit details. Phones are
            masked.
          </p>
        </div>
        <p className="text-sm font-semibold text-[#3d5247]">
          {sold.length} flat{sold.length === 1 ? "" : "s"}
        </p>
      </header>

      <MembersDirectory flats={sold} initialQuery={params.q || ""} />
    </section>
  );
}
