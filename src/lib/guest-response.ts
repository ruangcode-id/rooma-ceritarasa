import type { GuestListRow } from "@/infrastructure/repositories/admin-guest.repository";

export function guestListRowToJson(row: GuestListRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    birthdate: row.birthdate ? row.birthdate.toISOString().slice(0, 10) : null,
    isVip: row.isVip || row.tags.includes("VIP"),
    notes: row.notes,
    tags: row.tags,
    totalVisits: row.totalVisits,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function guestNoteToJson(note: {
  id: string;
  guestId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: note.id,
    guestId: note.guestId,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export function reservationVisitToJson(r: {
  id: string;
  date: Date;
  partySize: number;
  status: string;
  sessionId: string;
  createdAt: Date;
}) {
  return {
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    partySize: r.partySize,
    status: r.status,
    sessionId: r.sessionId,
    createdAt: r.createdAt.toISOString(),
  };
}
