import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

export type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

export type UploadToCloudinaryOptions = Omit<
  UploadApiOptions,
  "public_id" | "resource_type"
> & {
  resourceType?: CloudinaryResourceType;
  publicId?: string;
};

type CloudinaryUploadInput = Buffer | string;

export type CloudinaryUploadResult = UploadApiResponse & {
  secureUrl: string;
  publicId: string;
};

function assertCloudinaryConfig() {
  const missing = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary env: ${missing.join(", ")}`);
  }
}

function configureCloudinary() {
  assertCloudinaryConfig();
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function getBufferDataUriMimeType(resourceType: CloudinaryResourceType) {
  if (resourceType === "raw") return "application/octet-stream";
  if (resourceType === "video") return "video/mp4";
  return "image/png";
}

function normalizeUploadInput(
  file: CloudinaryUploadInput,
  resourceType: CloudinaryResourceType,
) {
  if (Buffer.isBuffer(file)) {
    return `data:${getBufferDataUriMimeType(resourceType)};base64,${file.toString(
      "base64",
    )}`;
  }

  return file;
}

export async function uploadToCloudinary(
  file: CloudinaryUploadInput,
  options: UploadToCloudinaryOptions = {},
): Promise<CloudinaryUploadResult> {
  configureCloudinary();

  const {
    resourceType = "image",
    publicId,
    ...uploadOptions
  } = options;
  const uploadInput = normalizeUploadInput(file, resourceType);
  const result = await cloudinary.uploader.upload(uploadInput, {
    resource_type: resourceType,
    ...(publicId ? { public_id: publicId } : {}),
    ...uploadOptions,
  });

  return {
    ...result,
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: CloudinaryResourceType = "image",
) {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
}
