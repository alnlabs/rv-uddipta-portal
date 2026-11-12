const DEFAULT_SITE = "https://uddipta.vercel.app";

export function siteBaseUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, "");
}

export function passShareCode(code: string) {
  return String(code).trim().toUpperCase();
}

/** Public guest page URL — opens QR for security to scan. */
export function passShareUrl(code: string) {
  return `${siteBaseUrl()}/pass/${passShareCode(code)}`;
}

export function passShareMessage(input: {
  code: string
  visitorName: string
  home: string
  date?: string
}) {
  const code = passShareCode(input.code);
  const link = passShareUrl(code);
  const when = input.date ? ` on ${input.date}` : "";
  return `Visitor pass for ${input.visitorName} at RV Uddiipta ${input.home}${when}.\nOpen this link and show the QR at the gate:\n${link}\nOr show code ${code}.`;
}

export function whatsappShareUrl(message: string, phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");
  const target = digits
    ? `https://wa.me/91${digits.slice(-10)}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  return target;
}
