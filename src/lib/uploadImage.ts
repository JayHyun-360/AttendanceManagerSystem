import { supabase } from "@/lib/supabase"

export type UploadImageResult = { url: string; path: string } | { error: string }

function getOwnedObjectPath(value: string, bucketName: string) {
  if (!value || value.startsWith("blob:")) return null

  if (!value.includes("://")) {
    return value.replace(/^\/+/, "") || null
  }

  try {
    const url = new URL(value)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) {
      return null
    }

    const prefix = `/storage/v1/object/public/${bucketName}/`

    if (!url.pathname.startsWith(prefix)) return null

    return decodeURIComponent(url.pathname.slice(prefix.length)) || null
  } catch {
    return null
  }
}

export async function deleteImage(
  value: string,

  bucketName = "public-images",
): Promise<{ success: boolean; error?: string }> {
  try {
    const objectPath = getOwnedObjectPath(value, bucketName)

    if (!objectPath) {
      return { success: true }
    }

    const { error } = await supabase.storage

      .from(bucketName)

      .remove([objectPath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (caughtError) {
    return {
      success: false,

      error:
        caughtError instanceof Error
          ? caughtError.message
          : "Image deletion failed.",
    }
  }
}

export async function deleteImages(
  values: string[],

  bucketName = "public-images",
) {
  const uniqueValues = [...new Set(values.filter(Boolean))]

  return Promise.all(
    uniqueValues.map((value) => deleteImage(value, bucketName)),
  )
}

export async function uploadImage(
  file: File,

  bucketName = "public-images",
): Promise<UploadImageResult> {
  if (!file) {
    return { error: "No file was provided." }
  }

  const lastDot = file.name.lastIndexOf(".")

  const extension = lastDot >= 0 ? file.name.slice(lastDot) : ""

  const fileName = `${Date.now()}-${Math.random()

    .toString(36)

    .slice(2)}${extension}`

  const { error } = await supabase.storage

    .from(bucketName)

    .upload(fileName, file, {
      cacheControl: "3600",

      upsert: false,
    })

  if (error) {
    return {
      error: error.message || "Image upload failed.",
    }
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)

  if (!data?.publicUrl) {
    return {
      error: "Image upload succeeded, but a public URL could not be generated.",
    }
  }

  return {
    url: data.publicUrl,

    path: fileName,
  }
}
