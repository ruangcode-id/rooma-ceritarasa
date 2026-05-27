import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

type UploadToCloudinaryOptions = Omit<UploadApiOptions, "resource_type"> & {
  resourceType?: CloudinaryResourceType;
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

export function uploadToCloudinary(
  fileBuffer: Buffer,
  options: UploadToCloudinaryOptions = {},
) {
  configureCloudinary();

  const { resourceType = "image", ...uploadOptions } = options;

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        ...uploadOptions,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload returned no result."));
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
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
