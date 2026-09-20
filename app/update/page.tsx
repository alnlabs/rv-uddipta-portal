import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UpdateForm from "@/components/UpdateForm";
import { mapOwnedFlat } from "@/lib/flats";
import { maskPhone } from "@/lib/phone";
import { createClient } from "@/utils/supabase/server";

export default async function UpdatePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: row, error } = await supabase
    .from("flats")
    .select()
    .eq("user_id", user.id)
    .single();

  const flat = mapOwnedFlat(row);
  if (!flat || error) {
    return (
      <div className="px-6 py-16 text-center text-[#3d5247]">
        No approved flat is linked to this account yet. If you just registered,
        wait for an admin to approve your request.
      </div>
    );
  }

  return (
    <UpdateForm
      ownerPhoneMasked={maskPhone(flat.phone)}
      initialFlat={flat}
    />
  );
}
