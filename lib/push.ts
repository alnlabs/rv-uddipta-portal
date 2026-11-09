import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export async function pushUsers(
  userIds: Array<string | null | undefined>,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return;
  try {
    const admin = createAdminClient();
    const { data: tokens, error } = await admin.from("device_tokens").select("token").in("user_id", ids);
    if (error || !tokens?.length) return;
    const messages = tokens.map((row) => ({
      to: row.token,
      title,
      body,
      sound: "default",
      data: data ?? {},
    }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // A missing token table must not block the visitor or the notice.
  }
}

export async function pushHome(input: {
  flatId?: number | null
  hostUserId?: string | null
  title: string
  body: string
  href?: string
  kind?: string
}) {
  const ids = new Set<string>();
  if (input.hostUserId) ids.add(input.hostUserId);
  const admin = createAdminClient();
  if (input.flatId) {
    const { data: people } = await admin.from("profiles").select("user_id").eq("flat_id", input.flatId);
    for (const row of people ?? []) ids.add(row.user_id);
    const { data: roles } = await admin.from("person_roles").select("user_id").eq("flat_id", input.flatId);
    for (const row of roles ?? []) if (row.user_id) ids.add(row.user_id);
  }
  const payload = input.href
    ? { href: input.href, kind: input.kind || "visitor", passId: input.href.match(/(\d+)$/)?.[1] }
    : undefined;
  if (input.href && ids.size) {
    await admin.from("notifications").insert(
      [...ids].map((userId) => ({
        user_id: userId,
        kind: input.kind || "visitor",
        title: input.title,
        body: input.body,
        href: input.href,
      })),
    ).then(() => undefined, () => undefined);
  }
  await pushUsers([...ids], input.title, input.body, payload);
}
