import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Normalize phone number to E.164 format (e.g., +628..., +44...). */
export function normalizePhoneNumber(input: string): string {
  if (!input) return "";
  
  // First, if it starts with 08, assume Indonesian and prepend +62.
  let raw = input.trim();
  if (raw.startsWith("08")) {
    raw = "+628" + raw.slice(2);
  } else if (!raw.startsWith("+")) {
    // If it doesn't start with '+', we might want to default to ID.
    // For safety, prepend '+' if it looks like a country code,
    // but the most robust way is forcing + in the UI.
    // If it's a raw number without +, let's assume + is missing.
    raw = "+" + raw;
  }

  const phoneNumber = parsePhoneNumberFromString(raw);
  if (phoneNumber) {
    return phoneNumber.format('E.164');
  }

  // Fallback: just return digits with + if it couldn't parse
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function isValidPhoneNumber(input: string): boolean {
  if (!input) return false;
  
  let raw = input.trim();
  // Assume Indonesian 08 if missing country code
  if (raw.startsWith("08")) {
    raw = "+628" + raw.slice(2);
  } else if (!raw.startsWith("+")) {
    raw = "+" + raw;
  }

  const phoneNumber = parsePhoneNumberFromString(raw);
  if (phoneNumber) {
    return phoneNumber.isValid();
  }
  
  return false;
}
