/** Normalize Indonesian mobile numbers for storage / uniqueness (canonical `08…`). */
export function normalizeIndonesianPhone(input: string): string {
  let s = input.trim().replace(/[\s.-]/g, "");
  if (s.startsWith("+62")) {
    s = `0${s.slice(3)}`;
  } else if (s.startsWith("62") && !s.startsWith("622")) {
    s = `0${s.slice(2)}`;
  }
  return s;
}

/** Indonesian mobile: `08xx…` or `+62xx…` / `62xx…` after normalization equals `08…`. */
export const INDONESIAN_MOBILE_REGEX =
  /^(\+62|62|0)8[1-9]\d{6,11}$/;

export function isValidIndonesianMobile(input: string): boolean {
  const raw = input.trim().replace(/[\s.-]/g, "");
  return INDONESIAN_MOBILE_REGEX.test(raw);
}
