export interface BlockedDateEntity {
  id: string;
  date: Date;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
}
