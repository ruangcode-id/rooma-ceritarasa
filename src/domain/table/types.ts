export interface TableEntity {
  id: string;
  tableNumber: string;
  capacity: number;
  posX: number | null;
  posY: number | null;
  isActive: boolean;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  currentReservation?: {
    id: string;
    date: string;
    status: string;
    sessionId: string;
    partySize: number;
  } | null;
}
