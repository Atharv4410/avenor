import "server-only";

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Matches a WhatsApp `wa_id` (digits only, usually with country code, e.g.
 * "919876543210") against a stored customer phone number that may or may not
 * include the country code or any formatting. Compares the last 10 digits
 * (Indian mobile number length) rather than requiring an exact string match,
 * since owners type phone numbers inconsistently ("+91 98765 43210",
 * "9876543210", etc.).
 */
export function phoneNumbersMatch(waId: string, storedPhone: string): boolean {
  const a = normalizePhoneDigits(waId);
  const b = normalizePhoneDigits(storedPhone);
  if (a.length < 10 || b.length < 10) return false;
  return a.slice(-10) === b.slice(-10);
}
