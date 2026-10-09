import { redirect } from "next/navigation";

export default function AnnouncementsPage() {
  redirect("/feed?view=notices");
}
