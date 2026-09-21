export function normalizeEmail(raw: string | null | undefined) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
