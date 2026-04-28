export interface CheckInEntity {
  id: string;
  reservationId: string;
  checkedInAt: Date;
  checkedInBy: string | null;
}
