import { redirect } from "next/navigation";

export default function PollsPage() {
  redirect("/feed?view=polls");
}
