/**
 * Shared Cloudinary upload utility.
 * Digunakan oleh Dev A (PDF penawaran event) dan Dev B (galeri foto, CV lamaran).
 *
 * Env vars yang dibutuhkan:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from "cloudinary";

// Pastikan env vars tersedia
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryFolder = "events/offers" | "gallery" | "careers/cv";
export type CloudinaryResourceType = "image" | "raw";

export interface UploadToCloudinaryOptions {
  folder: CloudinaryFolder;
  resourceType: CloudinaryResourceType;
  /** Opsional: public_id kustom (tanpa ekstensi) */
  publicId?: string;
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
}

/**
 * Upload file ke Cloudinary.
 *
 * @param file - Buffer, base64 data URI, atau URL remote
 * @param options - folder tujuan dan resource type (image | raw untuk PDF)
 * @returns CloudinaryUploadResult berisi url dan publicId
 *
 * @example
 * // Upload PDF penawaran event
 * const result = await uploadToCloudinary(pdfBuffer, {
 *   folder: 'events/offers',
 *   resourceType: 'raw',
 * });
 *
 * @example
 * // Upload gambar galeri
 * const result = await uploadToCloudinary(imageBuffer, {
 *   folder: 'gallery',
 *   resourceType: 'image',
 * });
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: UploadToCloudinaryOptions,
): Promise<CloudinaryUploadResult> {
  // Cloudinary SDK hanya menerima string (path, URL, base64 data URI).
  // Konversi Buffer ke base64 data URI agar kompatibel.
  let uploadSource: string;
  if (file instanceof Buffer) {
    uploadSource = `data:application/octet-stream;base64,${file.toString("base64")}`;
  } else {
    // file is string in this branch (Buffer | string narrowed to string)
    uploadSource = file as string;
  }

  const result = await cloudinary.uploader.upload(uploadSource, {
    folder: options.folder,
    resource_type: options.resourceType,
    ...(options.publicId ? { public_id: options.publicId } : {}),
  });

  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}
