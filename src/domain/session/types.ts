export interface SessionEntity {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  maxCapacity: number;
  isActive: boolean;
  dayOfWeek: number[];
}
