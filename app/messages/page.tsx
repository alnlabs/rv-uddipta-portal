import { redirect } from "next/navigation";

export default function MessagesRedirect() {
  redirect("/inbox?view=messages");
}
