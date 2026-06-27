
export interface EventEntity {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  eventDate: Date | null;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
