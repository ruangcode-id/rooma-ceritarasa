import { prisma } from "@/infrastructure/database/prisma";
import { buildPaginationMeta } from "@/lib/pagination";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "@/lib/cloudinary";
import type {
  AdminGalleryListQuery,
  CreateGalleryInput,
  PublicGalleryListQuery,
  UpdateGalleryInput,
} from "@/features/gallery/gallery.validation";

const GALLERY_FOLDER = "rooma/gallery";

type GalleryImageRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string;
  publicId: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type GalleryImageFile = {
  buffer: Buffer;
};

function getOrderBy(sort: "latest" | "oldest" | "sort_order") {
  if (sort === "sort_order") {
    return [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];
  }

  return { createdAt: sort === "oldest" ? ("asc" as const) : ("desc" as const) };
}

function serializeAdminGalleryImage(image: GalleryImageRecord) {
  return {
    id: image.id,
    title: image.title,
    description: image.description,
    category: image.category,
    imageUrl: image.imageUrl,
    publicId: image.publicId,
    width: image.width,
    height: image.height,
    sortOrder: image.sortOrder,
    isActive: image.isActive,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

function serializePublicGalleryImage(image: GalleryImageRecord) {
  return {
    id: image.id,
    title: image.title,
    description: image.description,
    category: image.category,
    imageUrl: image.imageUrl,
    width: image.width,
    height: image.height,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

async function uploadGalleryImage(file: GalleryImageFile) {
  const result = await uploadToCloudinary(file.buffer, {
    folder: GALLERY_FOLDER,
    resourceType: "image",
  });

  return {
    imageUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

export async function createGalleryImage(
  input: CreateGalleryInput,
  file: GalleryImageFile,
) {
  const uploaded = await uploadGalleryImage(file);

  try {
    const image = await prisma.galleryImage.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        imageUrl: uploaded.imageUrl,
        publicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });

    return serializeAdminGalleryImage(image);
  } catch (error) {
    await deleteFromCloudinary(uploaded.publicId).catch((deleteError) => {
      console.error("Failed to cleanup uploaded gallery image:", deleteError);
    });
    throw error;
  }
}

export async function listAdminGalleryImages(query: AdminGalleryListQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
  };
  const skip = (query.page - 1) * query.limit;

  const [images, total] = await Promise.all([
    prisma.galleryImage.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: getOrderBy(query.sort),
    }),
    prisma.galleryImage.count({ where }),
  ]);

  return {
    data: images.map(serializeAdminGalleryImage),
    meta: buildPaginationMeta(total, query.page, query.limit),
  };
}

export async function listPublicGalleryImages(query: PublicGalleryListQuery) {
  const images = await prisma.galleryImage.findMany({
    where: {
      isActive: true,
      ...(query.category ? { category: query.category } : {}),
    },
    orderBy: getOrderBy(query.sort),
  });

  return images.map(serializePublicGalleryImage);
}

export async function updateGalleryImage(
  id: string,
  input: UpdateGalleryInput,
  file?: GalleryImageFile,
) {
  const existing = await prisma.galleryImage.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("GALLERY_IMAGE_NOT_FOUND");
  }

  const uploaded = file ? await uploadGalleryImage(file) : null;

  try {
    const image = await prisma.galleryImage.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(uploaded
          ? {
              imageUrl: uploaded.imageUrl,
              publicId: uploaded.publicId,
              width: uploaded.width,
              height: uploaded.height,
            }
          : {}),
      },
    });

    if (uploaded) {
      await deleteFromCloudinary(existing.publicId).catch((deleteError) => {
        console.error("Failed to delete old gallery image:", deleteError);
      });
    }

    return serializeAdminGalleryImage(image);
  } catch (error) {
    if (uploaded) {
      await deleteFromCloudinary(uploaded.publicId).catch((deleteError) => {
        console.error("Failed to cleanup replacement gallery image:", deleteError);
      });
    }
    throw error;
  }
}

export async function softDeleteGalleryImage(id: string) {
  const existing = await prisma.galleryImage.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("GALLERY_IMAGE_NOT_FOUND");
  }

  const image = await prisma.galleryImage.update({
    where: { id },
    data: { isActive: false },
  });

  return serializeAdminGalleryImage(image);
}
