export interface GuestEntity {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  birthdate: Date | null;
  isVip: boolean;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GuestListItem extends GuestEntity {
  totalVisits: number;
}
