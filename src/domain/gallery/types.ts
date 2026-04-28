import type { GalleryCategory } from "@/generated/prisma/client";

export interface GalleryPhotoEntity {
  id: string;
  url: string;
  caption: string | null;
  category: GalleryCategory | null;
  sortOrder: number;
  uploadedBy: string | null;
  createdAt: Date;
}
