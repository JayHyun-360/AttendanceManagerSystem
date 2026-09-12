import { supabase } from "@/lib/supabase";

export type UploadImageResult =
  | { url: string; path: string }
  | { error: string };

export async function deleteImage(
  value: string,
  bucketName = "public-images",
): Promise<{ success: boolean; error?: string }> {
  if (!value || value.startsWith("blob:")) {
    return { success: true };
  }

  try {
    let objectPath = value;

    if (value.startsWith("http://") || value.startsWith("https://")) {
      const pathname = new URL(value).pathname;
      const segments = pathname.split("/").filter(Boolean);
      const bucketIndex = segments.findIndex(
        (segment) => segment === bucketName,
      );

      if (bucketIndex >= 0 && bucketIndex < segments.length - 1) {
        objectPath = segments.slice(bucketIndex + 1).join("/");
      } else {
        objectPath = segments.at(-1) ?? "";
      }
    }

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
  } catch {
    return { success: true };
  }
}

export async function uploadImage(
  file: File,
  bucketName = "public-images",
): Promise<UploadImageResult> {
  if (!file) {
    return { error: "No file was provided." };
  }

  const lastDot = file.name.lastIndexOf(".");
  const extension = lastDot >= 0 ? file.name.slice(lastDot) : "";
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}${extension}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return {
      error: error.message || "Image upload failed.",
    };
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);

  if (!data?.publicUrl) {
    return {
      error: "Image upload succeeded, but a public URL could not be generated.",
    };
  }

  return {
    url: data.publicUrl,
    path: fileName,
  };
}
