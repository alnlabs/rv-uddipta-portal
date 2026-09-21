import { redirect } from "next/navigation";

/** Site 3D now lives under Community as a view switch. */
export default function ModelPage() {
  redirect("/community?view=3d");
}
