import { supabase } from "@/lib/supabase"

import type { User } from "@supabase/supabase-js"

export type UploadImageResult = {
  url: string
  path: string
} | { error: string }

export type PrivateUploadResult = { path: string } | { error: string }

type DeleteImageResult = {
  success: boolean
  error?: string
}

type StorageBucket = "public-images" | "student-private-media" | "excuse-documents"

async function getAuthenticatedUser(): Promise<{ user: User } | {
  error: string
}> {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) return { error: error.message }

    if (!data.user) return { error: "Sign in before uploading a file." }

    return { user: data.user }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not verify the session.",
    }
  }
}

const MAX_PROMOTIONAL_IMAGE_INPUT_BYTES = 20 * 1024 * 1024

const MAX_PROMOTIONAL_IMAGE_OUTPUT_BYTES = 5 * 1024 * 1024

const MAX_PROFILE_IMAGE_OUTPUT_BYTES = 4 * 1024 * 1024

const MAX_VERIFICATION_IMAGE_OUTPUT_BYTES = 8 * 1024 * 1024

const MAX_USER_IMAGE_INPUT_BYTES = 20 * 1024 * 1024

const MAX_EXCUSE_ATTACHMENT_BYTES = 20 * 1024 * 1024

const MAX_EVENT_VIDEO_BYTES = 50 * 1024 * 1024

const PROMOTIONAL_IMAGE_TYPES = new Set([
  "image/jpeg",

  "image/png",

  "image/webp",
])

async function compressImage(
  file: File,

  options: {
    maxDimension: number

    quality: number

    maxOutputBytes: number
  },
): Promise<File | string> {
  if (!PROMOTIONAL_IMAGE_TYPES.has(file.type)) {
    return "Choose a JPEG, PNG, or WebP image."
  }

  if (file.size > MAX_PROMOTIONAL_IMAGE_INPUT_BYTES) {
    return "Promotional images must be 20 MB or smaller."
  }

  try {
    const bitmap = await createImageBitmap(file)

    const scale = Math.min(
      1,

      options.maxDimension / Math.max(bitmap.width, bitmap.height),
    )

    const canvas = document.createElement("canvas")

    canvas.width = Math.max(1, Math.round(bitmap.width * scale))

    canvas.height = Math.max(1, Math.round(bitmap.height * scale))

    const context = canvas.getContext("2d")

    if (!context) {
      bitmap.close()

      return "This browser could not process the selected image."
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", options.quality),
    )

    if (!blob) {
      return "This browser could not compress the selected image."
    }

    if (blob.type !== "image/webp") {
      return "WebP image compression is not supported in this browser."
    }

    if (blob.size > options.maxOutputBytes) {
      const maxOutputMb = Math.floor(options.maxOutputBytes / (1024 * 1024))

      return `The compressed image is still larger than ${maxOutputMb} MB. Choose a smaller image.`
    }

    if (blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, "") || "promotion"

    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",

      lastModified: Date.now(),
    })
  } catch {
    return "This browser could not process the selected image."
  }
}

export async function uploadPromotionalImage(
  file: File,
): Promise<UploadImageResult> {
  const compressed = await compressImage(file, {
    maxDimension: 1600,

    quality: 0.8,

    maxOutputBytes: MAX_PROMOTIONAL_IMAGE_OUTPUT_BYTES,
  })

  if (typeof compressed === "string") {
    return { error: compressed }
  }

  return uploadImage(compressed)
}

export async function uploadProfileImage(
  file: File,

  category: "profile" | "cover" = "profile",
): Promise<PrivateUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "Choose an image file." }
  }

  if (!PROMOTIONAL_IMAGE_TYPES.has(file.type)) {
    return { error: "Profile and cover photos must be JPEG, PNG, or WebP." }
  }

  if (file.size > MAX_USER_IMAGE_INPUT_BYTES) {
    return { error: "Profile and cover photos must be 20 MB or smaller." }
  }

  const compressed = await compressImage(file, {
    maxDimension: 1200,

    quality: 0.86,

    maxOutputBytes: MAX_PROFILE_IMAGE_OUTPUT_BYTES,
  })

  if (typeof compressed === "string") {
    return { error: compressed }
  }

  return uploadPrivateImage(compressed, category)
}

export async function uploadVerificationImage(
  file: File,
): Promise<PrivateUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "Choose an image file." }
  }

  if (!PROMOTIONAL_IMAGE_TYPES.has(file.type)) {
    return { error: "ID photos must be JPEG, PNG, or WebP." }
  }

  if (file.size > MAX_USER_IMAGE_INPUT_BYTES) {
    return { error: "ID photos must be 20 MB or smaller." }
  }

  const compressed = await compressImage(file, {
    maxDimension: 1800,

    quality: 0.9,

    maxOutputBytes: MAX_VERIFICATION_IMAGE_OUTPUT_BYTES,
  })

  if (typeof compressed === "string") {
    return { error: compressed }
  }

  return uploadPrivateImage(compressed, "id")
}

export async function uploadExcuseAttachment(
  file: File,

  folderPrefix: string,
): Promise<PrivateUploadResult> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

  if (
    (!PROMOTIONAL_IMAGE_TYPES.has(file.type) && !isPdf) ||
    (isPdf && file.type !== "application/pdf")
  ) {
    return { error: "Supporting documents must be an image or PDF." }
  }

  if (file.size > MAX_EXCUSE_ATTACHMENT_BYTES) {
    return { error: "Supporting documents must be 20 MB or smaller." }
  }

  const auth = await getAuthenticatedUser()

  if ("error" in auth) return { error: auth.error }

  if (folderPrefix !== auth.user.id) {
    return {
      error: "Supporting documents must use the signed-in student's ID.",
    }
  }

  const result = await uploadObject(
    file,

    "excuse-documents",

    auth.user.id,

    "300",
  )

  return "error" in result ? result : { path: result.path }
}

export async function uploadEventVideo(file: File): Promise<UploadImageResult> {
  if (file.type !== "video/mp4") {
    return { error: "Event videos must be MP4 files." }
  }

  if (file.size > MAX_EVENT_VIDEO_BYTES) {
    return { error: "Event videos must be 50 MB or smaller." }
  }

  return uploadImage(file)
}

async function uploadPrivateImage(
  file: File,

  category: "profile" | "cover" | "id",
): Promise<PrivateUploadResult> {
  const auth = await getAuthenticatedUser()

  if ("error" in auth) return { error: auth.error }

  const result = await uploadObject(
    file,

    "student-private-media",

    `${auth.user.id}/${category}`,

    "3600",
  )

  return "error" in result ? result : { path: result.path }
}

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
): Promise<DeleteImageResult> {
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

export async function extendStorageUploadLease(
  bucketName: StorageBucket,

  objectPath: string,
) {
  const { error } = await supabase.rpc("extend_storage_upload_intent", {
    p_bucket_id: bucketName,

    p_object_path: objectPath,
  })

  if (error) {
    throw new Error(
      `Could not extend the Storage upload grace period: ${error.message}`,
    )
  }
}

export async function uploadImage(
  file: File,

  cacheControl = "31536000",
): Promise<UploadImageResult> {
  if (!file) {
    return { error: "No file was provided." }
  }

  const auth = await getAuthenticatedUser()

  if ("error" in auth) return { error: auth.error }

  const bucketName = "public-images"

  const result = await uploadObject(
    file,

    bucketName,

    `admin/${auth.user.id}/public-media`,

    cacheControl,
  )

  if ("error" in result) return result

  const { data: publicUrl } = supabase.storage

    .from(bucketName)

    .getPublicUrl(result.path)

  if (!publicUrl?.publicUrl) {
    return {
      error: "Upload succeeded, but a public URL could not be generated.",
    }
  }

  return { url: publicUrl.publicUrl, path: result.path }
}

async function uploadObject(
  file: File,

  bucketName: StorageBucket,

  objectPrefix: string,

  cacheControl: string,
): Promise<{ path: string } | { error: string }> {
  if (!file) return { error: "No file was provided." }

  const extension = file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ""

  const objectPath = `${objectPrefix}/${crypto.randomUUID()}${extension}`

  try {
    const { error: registrationError } = await supabase.rpc(
      "register_storage_upload",

      {
        p_bucket_id: bucketName,

        p_object_path: objectPath,
      },
    )

    if (registrationError) {
      return {
        error: `Upload could not be registered for safe cleanup: ${registrationError.message}`,
      }
    }

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
      })

    if (error) return { error: error.message || "File upload failed." }

    return { path: objectPath }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "File upload or cleanup registration failed.",
    }
  }
}
