export interface SessionEntity {
  id: string;
  label: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  isActive: boolean;
}
