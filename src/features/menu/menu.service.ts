import { prisma } from "@/infrastructure/database/prisma";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "@/lib/cloudinary";
import type {
  AdminMenuListQuery,
  CreateMenuPhotoInput,
  UpdateMenuPhotoInput,
} from "@/features/menu/menu.validation";

const MENU_FOLDER = "rooma/menu";

type MenuPhotoRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string;
  publicId: string;
  price: number | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isActive: boolean;
  isAvailable: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

type MenuPhotoFile = {
  buffer: Buffer;
};

function getOrderBy(sort: "latest" | "oldest" | "sort_order") {
  if (sort === "sort_order") {
    return [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];
  }
  return { createdAt: sort === "oldest" ? ("asc" as const) : ("desc" as const) };
}

function serializeAdminMenuPhoto(photo: MenuPhotoRecord) {
  return {
    id: photo.id,
    title: photo.title,
    description: photo.description,
    category: photo.category,
    imageUrl: photo.imageUrl,
    publicId: photo.publicId,
    price: photo.price,
    width: photo.width,
    height: photo.height,
    sortOrder: photo.sortOrder,
    isActive: photo.isActive,
    isAvailable: photo.isAvailable,
    tags: photo.tags ?? [],
    createdAt: photo.createdAt.toISOString(),
    updatedAt: photo.updatedAt.toISOString(),
  };
}

function serializePublicMenuPhoto(photo: MenuPhotoRecord) {
  return {
    id: photo.id,
    title: photo.title,
    description: photo.description,
    category: photo.category,
    imageUrl: photo.imageUrl,
    price: photo.price,
    width: photo.width,
    height: photo.height,
    sortOrder: photo.sortOrder,
    isAvailable: photo.isAvailable,
    tags: photo.tags ?? [],
    createdAt: photo.createdAt.toISOString(),
  };
}

async function uploadMenuPhoto(file: MenuPhotoFile) {
  const result = await uploadToCloudinary(file.buffer, {
    folder: MENU_FOLDER,
    resourceType: "image",
  });

  return {
    imageUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

export async function createMenuPhoto(
  input: CreateMenuPhotoInput,
  file: MenuPhotoFile,
) {
  const uploaded = await uploadMenuPhoto(file);

  try {
    const photo = await prisma.menuPhoto.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        price: input.price ?? null,
        imageUrl: uploaded.imageUrl,
        publicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        isAvailable: input.isAvailable ?? true,
        tags: input.tags ?? [],
      },
    });

    return serializeAdminMenuPhoto(photo);
  } catch (error) {
    await deleteFromCloudinary(uploaded.publicId).catch((deleteError) => {
      console.error("Failed to cleanup uploaded menu photo:", deleteError);
    });
    throw error;
  }
}

export async function listAdminMenuPhotos(query: AdminMenuListQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };
  const skip = (query.page - 1) * query.limit;

  const [photos, total] = await Promise.all([
    prisma.menuPhoto.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: getOrderBy(query.sort),
    }),
    prisma.menuPhoto.count({ where }),
  ]);

  return {
    data: photos.map(serializeAdminMenuPhoto),
    total,
  };
}

export async function listPublicMenuPhotos() {
  const photos = await prisma.menuPhoto.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return photos.map(serializePublicMenuPhoto);
}

export async function getPublicMenuCategories(): Promise<string[]> {
  const photos = await prisma.menuPhoto.findMany({
    where: { isActive: true },
    select: { category: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const categories: string[] = [];
  for (const item of photos) {
    if (!categories.includes(item.category)) {
      categories.push(item.category);
    }
  }
  return categories;
}

export async function updateMenuPhoto(
  id: string,
  input: UpdateMenuPhotoInput,
  file?: MenuPhotoFile,
) {
  const existing = await prisma.menuPhoto.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("MENU_PHOTO_NOT_FOUND");
  }

  const uploaded = file ? await uploadMenuPhoto(file) : null;

  try {
    const photo = await prisma.menuPhoto.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
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
        console.error("Failed to delete old menu photo:", deleteError);
      });
    }

    return serializeAdminMenuPhoto(photo);
  } catch (error) {
    if (uploaded) {
      await deleteFromCloudinary(uploaded.publicId).catch((deleteError) => {
        console.error("Failed to cleanup replacement menu photo:", deleteError);
      });
    }
    throw error;
  }
}

export async function deleteMenuPhoto(id: string) {
  const existing = await prisma.menuPhoto.findUnique({
    where: { id },
    select: { id: true, publicId: true },
  });

  if (!existing) {
    throw new Error("MENU_PHOTO_NOT_FOUND");
  }

  await prisma.menuPhoto.delete({ where: { id } });

  await deleteFromCloudinary(existing.publicId).catch((deleteError) => {
    console.error("Failed to delete menu photo from Cloudinary:", deleteError);
  });

  return { id };
}

export async function toggleMenuPhotoStatus(id: string) {
  const existing = await prisma.menuPhoto.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });

  if (!existing) {
    throw new Error("MENU_PHOTO_NOT_FOUND");
  }

  const photo = await prisma.menuPhoto.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return serializeAdminMenuPhoto(photo);
}

export async function toggleMenuPhotoAvailability(id: string, isAvailable?: boolean) {
  const existing = await prisma.menuPhoto.findUnique({
    where: { id },
    select: { id: true, isAvailable: true },
  });

  if (!existing) {
    throw new Error("MENU_PHOTO_NOT_FOUND");
  }

  const nextState = isAvailable !== undefined ? isAvailable : !existing.isAvailable;

  const photo = await prisma.menuPhoto.update({
    where: { id },
    data: { isAvailable: nextState },
  });

  return serializeAdminMenuPhoto(photo);
}
