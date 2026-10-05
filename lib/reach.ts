import "server-only";

import { normalizePhone } from "@/lib/phone";
import { createAdminClient } from "@/utils/supabase/admin";

const COMMUNITY = ["admin", "builder", "owner", "co_owner", "tenant"];

export function outboundChannels() {
  return {
    email: Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM),
    whatsapp: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  };
}

export async function reachPerson(input: {
  title: string
  body: string
  email?: string | null
  phone?: string | null
}) {
  const email = input.email?.trim();
  const phone = whatsappNumber(input.phone);
  await reachOut({
    title: input.title,
    body: input.body,
    emails: email ? [email] : [],
    phones: phone ? [phone] : [],
  });
}

export async function reachCommunity(input: {
  title: string
  body: string
  exceptUserId?: string | null
}) {
  const contacts = await communityContacts(input.exceptUserId);
  await reachOut({
    title: input.title,
    body: input.body,
    emails: contacts.emails,
    phones: contacts.phones,
  });
}

async function communityContacts(exceptUserId?: string | null) {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id")
    .in("role", COMMUNITY);
  const ids = new Set(
    (profiles ?? []).map((row) => row.user_id).filter((id) => id && id !== exceptUserId),
  );

  const emails = new Set<string>();
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    for (const user of data.users) {
      if (!ids.has(user.id) || !user.email) continue;
      emails.add(user.email.toLowerCase());
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  const phones = new Set<string>();
  const [{ data: flats }, { data: requests }] = await Promise.all([
    admin.from("flats").select("user_id, phone").not("user_id", "is", null),
    admin.from("registration_requests").select("user_id, phone").eq("status", "approved"),
  ]);
  for (const row of [...(flats ?? []), ...(requests ?? [])]) {
    if (!row.user_id || !ids.has(row.user_id)) continue;
    const phone = whatsappNumber(row.phone);
    if (phone) phones.add(phone);
  }

  return { emails: [...emails], phones: [...phones] };
}

function whatsappNumber(raw: string | null | undefined) {
  const phone = normalizePhone(raw);
  return phone ? `91${phone}` : null;
}

async function reachOut(input: {
  title: string
  body: string
  emails: string[]
  phones: string[]
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://uddipta.vercel.app";
  const text = `${input.body}\n\n${site}/feed`;
  await Promise.all([
    sendEmail(input.emails, input.title, text),
    sendWhatsApp(input.phones, `${input.title}\n\n${text}`),
  ]);
}

async function sendEmail(emails: string[], subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from || emails.length === 0) return;

  for (let index = 0; index < emails.length; index += 100) {
    const batch = emails.slice(index, index + 100).map((to) => ({
      from,
      to: [to],
      subject,
      text,
    }));
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      console.warn("email notices failed", response.status);
    }
  }
}

async function sendWhatsApp(phones: string[], body: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || phones.length === 0) return;

  for (const to of phones) {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    if (!response.ok) {
      console.warn("whatsapp notice failed", response.status);
    }
  }
}
