/** Batas keterlambatan check-in setelah jam mulai sesi (MVP: hardcode). */
export const CHECK_IN_GRACE_MINUTES = 15;

export const CHECK_IN_GRACE_EXPIRED_MESSAGE =
  "Batas check-in telah lewat (lebih dari 15 menit setelah jam sesi). Reservasi ini tidak dapat di-check-in.";

/**
 * Gabungkan tanggal reservasi (@db.Date, komponen UTC = kalender restoran)
 * + jam sesi (@db.Time disimpan sebagai wall-clock via UTC, lihat parseTime)
 * sebagai momen absolut di Asia/Jakarta (UTC+7, tanpa DST).
 */
export function buildSessionStartAt(
  reservationDate: Date,
  sessionStartTime: Date,
): Date {
  const y = reservationDate.getUTCFullYear();
  const month = reservationDate.getUTCMonth() + 1;
  const day = reservationDate.getUTCDate();
  const hours = sessionStartTime.getUTCHours();
  const minutes = sessionStartTime.getUTCMinutes();
  const seconds = sessionStartTime.getUTCSeconds();

  const iso = `${String(y).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}+07:00`;
  return new Date(iso);
}

export function buildCheckInDeadline(
  reservationDate: Date,
  sessionStartTime: Date,
  graceMinutes: number = CHECK_IN_GRACE_MINUTES,
): Date {
  const startAt = buildSessionStartAt(reservationDate, sessionStartTime);
  return new Date(startAt.getTime() + graceMinutes * 60_000);
}

export function isPastCheckInGrace(params: {
  reservationDate: Date;
  sessionStartTime: Date;
  now?: Date;
  graceMinutes?: number;
}): boolean {
  const deadline = buildCheckInDeadline(
    params.reservationDate,
    params.sessionStartTime,
    params.graceMinutes ?? CHECK_IN_GRACE_MINUTES,
  );
  const now = params.now ?? new Date();
  return now.getTime() > deadline.getTime();
}

/** YYYY-MM-DD untuk kalender Asia/Jakarta. */
export function formatJakartaDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function jakartaDateKeyToUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}
