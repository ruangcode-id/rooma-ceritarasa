export interface GuestEntity {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  isVip: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
