import { supabase } from "@/lib/supabase";

export type UploadImageResult =
  | { url: string; path: string }
  | { error: string };

export type PrivateImageUploadResult = { path: string } | { error: string };

const MAX_PROMOTIONAL_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_PROMOTIONAL_IMAGE_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_PROFILE_IMAGE_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_USER_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_EXCUSE_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_EVENT_VIDEO_BYTES = 50 * 1024 * 1024;
const PROMOTIONAL_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function compressImage(
  file: File,
  options: {
    maxDimension: number;
    quality: number;
    maxOutputBytes: number;
  },
): Promise<File | string> {
  if (!PROMOTIONAL_IMAGE_TYPES.has(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }

  if (file.size > MAX_PROMOTIONAL_IMAGE_INPUT_BYTES) {
    return "Promotional images must be 20 MB or smaller.";
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      options.maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      return "This browser could not process the selected image.";
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", options.quality),
    );

    if (!blob) {
      return "This browser could not compress the selected image.";
    }

    if (blob.type !== "image/webp") {
      return "WebP image compression is not supported in this browser.";
    }

    if (blob.size > options.maxOutputBytes) {
      const maxOutputMb = Math.floor(options.maxOutputBytes / (1024 * 1024));
      return `The compressed image is still larger than ${maxOutputMb} MB. Choose a smaller image.`;
    }

    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "promotion";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return "This browser could not process the selected image.";
  }
}

export async function uploadPromotionalImage(
  file: File,
): Promise<UploadImageResult> {
  const compressed = await compressImage(file, {
    maxDimension: 1600,
    quality: 0.8,
    maxOutputBytes: MAX_PROMOTIONAL_IMAGE_OUTPUT_BYTES,
  });

  if (typeof compressed === "string") {
    return { error: compressed };
  }

  return uploadImage(compressed);
}

export async function uploadProfileImage(
  file: File,
): Promise<UploadImageResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "Choose an image file." };
  }

  if (file.size > MAX_USER_IMAGE_INPUT_BYTES) {
    return { error: "Profile and cover photos must be 20 MB or smaller." };
  }

  if (!PROMOTIONAL_IMAGE_TYPES.has(file.type)) {
    return uploadImage(file);
  }

  const compressed = await compressImage(file, {
    maxDimension: 1200,
    quality: 0.86,
    maxOutputBytes: MAX_PROFILE_IMAGE_OUTPUT_BYTES,
  });

  if (typeof compressed === "string") {
    return { error: compressed };
  }

  return uploadImage(compressed);
}

export async function uploadVerificationImage(
  file: File,
): Promise<PrivateImageUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "Choose an image file." };
  }

  if (file.size > MAX_USER_IMAGE_INPUT_BYTES) {
    return { error: "ID photos must be 20 MB or smaller." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Sign in before uploading an ID photo." };
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const { error } = await supabase.storage
    .from("id-verification")
    .upload(objectPath, file, {
      cacheControl: "300",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message || "ID photo upload failed." };
  }

  return { path: objectPath };
}

export async function deletePrivateIdImage(path: string) {
  if (!path) return { success: true };

  const { error } = await supabase.storage
    .from("id-verification")
    .remove([path]);

  return error ? { success: false, error: error.message } : { success: true };
}

export async function uploadExcuseAttachment(
  file: File,
  folderPrefix: string,
): Promise<UploadImageResult> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!file.type.startsWith("image/") && !isPdf) {
    return { error: "Supporting documents must be an image or PDF." };
  }

  if (file.size > MAX_EXCUSE_ATTACHMENT_BYTES) {
    return { error: "Supporting documents must be 20 MB or smaller." };
  }

  return uploadImage(file, "excuse-documents", folderPrefix, "300");
}

export async function uploadEventVideo(file: File): Promise<UploadImageResult> {
  if (file.type !== "video/mp4") {
    return { error: "Event videos must be MP4 files." };
  }

  if (file.size > MAX_EVENT_VIDEO_BYTES) {
    return { error: "Event videos must be 50 MB or smaller." };
  }

  return uploadImage(file);
}

function getOwnedObjectPath(value: string, bucketName: string) {
  if (!value || value.startsWith("blob:")) return null;

  if (!value.includes("://")) {
    return value.replace(/^\/+/, "") || null;
  }

  try {
    const url = new URL(value);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) {
      return null;
    }

    const prefix = `/storage/v1/object/public/${bucketName}/`;

    if (!url.pathname.startsWith(prefix)) return null;

    return decodeURIComponent(url.pathname.slice(prefix.length)) || null;
  } catch {
    return null;
  }
}

export async function deleteImage(
  value: string,

  bucketName = "public-images",
): Promise<{ success: boolean; error?: string }> {
  try {
    const objectPath = getOwnedObjectPath(value, bucketName);

    if (!objectPath) {
      return { success: true };
    }

    const { error } = await supabase.storage

      .from(bucketName)

      .remove([objectPath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (caughtError) {
    return {
      success: false,

      error:
        caughtError instanceof Error
          ? caughtError.message
          : "Image deletion failed.",
    };
  }
}

export async function deleteImages(
  values: string[],

  bucketName = "public-images",
) {
  const uniqueValues = [...new Set(values.filter(Boolean))];

  return Promise.all(
    uniqueValues.map((value) => deleteImage(value, bucketName)),
  );
}

export async function uploadImage(
  file: File,

  bucketName = "public-images",
  folderPrefix?: string,
  cacheControl = "31536000",
): Promise<UploadImageResult> {
  if (!file) {
    return { error: "No file was provided." };
  }

  const lastDot = file.name.lastIndexOf(".");

  const extension = lastDot >= 0 ? file.name.slice(lastDot) : "";

  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const objectPath = folderPrefix ? `${folderPrefix}/${fileName}` : fileName;

  const { error } = await supabase.storage

    .from(bucketName)

    .upload(objectPath, file, {
      cacheControl,
      contentType:
        file.type ||
        (file.name.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : undefined),

      upsert: false,
    });

  if (error) {
    return {
      error: error.message || "Image upload failed.",
    };
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    return {
      error: "Image upload succeeded, but a public URL could not be generated.",
    };
  }

  return {
    url: data.publicUrl,

    path: objectPath,
  };
}
