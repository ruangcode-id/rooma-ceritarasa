export interface TableEntity {
  id: string;
  tableNumber: string;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
  isActive: boolean;
}
