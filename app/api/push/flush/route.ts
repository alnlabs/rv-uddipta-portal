import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

async function callerOk(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const cron = process.env.PUSH_FLUSH_SECRET || process.env.CRON_SECRET || "";
  if (cron && token === cron) return true;
  if (!token) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.auth.getUser();
  return Boolean(data.user);
}

export async function POST(request: Request) {
  if (!(await callerOk(request))) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  // Due society duty reminders → notifications (trigger fills push_outbox).
  await admin.rpc("flush_due_society_reminders").then(
    () => undefined,
    () => undefined,
  );

  const { data: rows, error } = await admin
    .from("push_outbox")
    .select("id, user_id, title, body, data")
    .is("sent_at", null)
    .order("id", { ascending: true })
    .limit(100);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (!rows?.length) return Response.json({ ok: true, sent: 0 });

  const userIds = [...new Set(rows.map((row) => String(row.user_id)))];
  const { data: tokens } = await admin
    .from("device_tokens")
    .select("user_id, token")
    .in("user_id", userIds);

  const byUser = new Map<string, string[]>();
  for (const row of tokens ?? []) {
    const list = byUser.get(String(row.user_id)) ?? [];
    list.push(String(row.token));
    byUser.set(String(row.user_id), list);
  }

  const messages: {
    to: string
    title: string
    body: string
    sound: string
    data: Record<string, unknown>
  }[] = [];
  const sentIds: number[] = [];

  for (const row of rows) {
    const devices = byUser.get(String(row.user_id)) ?? [];
    if (!devices.length) {
      sentIds.push(Number(row.id));
      continue;
    }
    for (const to of devices) {
      messages.push({
        to,
        title: String(row.title || "RV Uddiipta"),
        body: String(row.body || ""),
        sound: "default",
        data: (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>,
      });
    }
    sentIds.push(Number(row.id));
  }

  if (messages.length) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    }).catch(() => undefined);
  }

  if (sentIds.length) {
    await admin
      .from("push_outbox")
      .update({ sent_at: new Date().toISOString() })
      .in("id", sentIds);
  }

  return Response.json({ ok: true, sent: messages.length, cleared: sentIds.length });
}
