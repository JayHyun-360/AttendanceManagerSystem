import { supabase } from "@/lib/supabase";

export type UploadImageResult =
  | { url: string; path: string }
  | { error: string };

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
