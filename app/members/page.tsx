import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, PageTitle } from "@/components/chrome";
import { MembersDirectory } from "@/components/MembersDirectory";
import { RoleAssignForm } from "@/components/RoleAssignForm";
import { RolePersonEditor } from "@/components/RolePersonEditor";
import { loadBoardPayload } from "@/lib/boardData";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import { accessSummary } from "@/lib/roleLabels";
import { canManageAdmin, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { loadSignInPeople } from "@/lib/signInPeople";

export default async function MembersPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string; flat?: string; as?: string; person?: string }>
}) {
  const { user, profile, supabase } = await getAuthState();
  if (!user) redirect("/login");
  const community = isCommunityRole(profile.role);
  const manage = canManageAdmin(profile.role, user);
  const board = await loadBoardPayload(user, supabase, profile.role);
  const params = await searchParams;
  const q = (params.q || "").trim().toLowerCase();

  if (!community) redirect("/");

  const { data: linkedRows } = await supabase
    .from("flats")
    .select("flat_number")
    .not("user_id", "is", null);
  const registeredFlats = new Set(
    (linkedRows ?? []).map((row) => String(row.flat_number)),
  );

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
      ownerEmail: flat.ownerEmail,
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
      ownerRegistered: registeredFlats.has(flat.flatNumber),
    }))
    .filter((flat) => {
      if (!q) return true;
      const hay = [
        flat.flatNumber,
        flat.ownerName,
        flat.ownerEmail,
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

  const accounts = manage ? await loadSignInPeople() : [];
  const openPerson = accounts.find((person) => person.userId === params.person) ?? null;
  const unlinked = accounts.filter((person) => !person.flatNumber);

  return (
    <PageShell>
      <PageTitle
        title="Neighbours"
        lede="Who lives in each flat. Signed up means they can sign in."
        action={<p className="text-sm text-[#3d5247]">{sold.length} homes</p>}
      />
      {manage ? (
        <div className="mt-6 grid gap-4">
          {openPerson && !openPerson.locked ? <RolePersonEditor person={openPerson} /> : null}
          {params.flat || params.as ? (
            <RoleAssignForm
              defaultFlat={params.flat || ""}
              defaultRole={params.as === "family" ? "family" : "owner"}
              candidates={accounts
                .filter((person) => !person.locked)
                .map((person) => ({
                  userId: person.userId,
                  label: person.displayName || person.email || "Signed-in person",
                  flatNumber: person.flatNumber,
                }))}
            />
          ) : (
            <Link href="/members?as=owner" className="text-sm font-semibold text-[#1b3a2f]">
              Add owner or family
            </Link>
          )}
        </div>
      ) : null}
      <MembersDirectory
        flats={sold}
        initialQuery={params.q || ""}
        accounts={accounts}
        canManage={manage}
        openUserId={openPerson?.userId ?? null}
      />
      {manage && unlinked.length ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-[#14241c]">Signed in, no flat</h2>
          <ul className="mt-3 divide-y divide-[rgba(27,58,47,0.08)]">
            {unlinked.map((person) => (
              <li key={person.userId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#14241c]">
                    {person.displayName || person.email || "Signed-in person"}
                  </p>
                  <p className="text-sm text-[#3d5247]">
                    {person.locked ? "Cannot be removed. No flat." : accessSummary(person)}
                  </p>
                </div>
                {person.locked ? (
                  <span className="rounded-full bg-[#c9a45c] px-2 py-1 text-[10px] font-bold tracking-wide text-[#14241c] uppercase">
                    Super admin
                  </span>
                ) : (
                  <Link
                    href={openPerson?.userId === person.userId ? "/members" : `/members?person=${person.userId}`}
                    className="text-sm font-semibold text-[#1b3a2f]"
                  >
                    {openPerson?.userId === person.userId ? "Close" : "Change"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageShell>
  );
}
