export interface JobListingEntity {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  isOpen: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
