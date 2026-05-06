import type { GuestListRow } from "@/infrastructure/repositories/admin-guest.repository";
import type { GuestTag } from "@/validations/guest.validation";

export function guestListRowToJson(row: GuestListRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    birthdate: row.birthdate ? row.birthdate.toISOString().slice(0, 10) : null,
    isVip: row.isVip,
    tags: row.tags,
    totalVisits: row.totalVisits,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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

export function guestNoteToJson(r: {
  id: string;
  content: string;
  tags: GuestTag[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    content: r.content,
    tags: r.tags,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}