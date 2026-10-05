import { redirect } from "next/navigation";

export default async function AdminRolesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ flat?: string; as?: string; person?: string; q?: string }>
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.flat) query.set("flat", params.flat);
  if (params.as) query.set("as", params.as);
  if (params.person) query.set("person", params.person);
  if (params.q) query.set("q", params.q);
  redirect(query.size ? `/members?${query}` : "/members");
}
