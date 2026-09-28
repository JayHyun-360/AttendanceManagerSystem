import Image, { type ImageProps } from "next/image"

type OptimizedImageProps = Omit<ImageProps, "width" | "height"> & {
  width?: ImageProps["width"]
  height?: ImageProps["height"]
}

function isLocalPreview(src: ImageProps["src"]) {
  return (
    typeof src === "string" &&
    (src.startsWith("blob:") || src.startsWith("data:"))
  )
}

function isOptimizableSource(src: ImageProps["src"]) {
  if (typeof src !== "string") return false
  if (src.startsWith("/")) return true
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  try {
    return new URL(src).origin === new URL(supabaseUrl).origin
  } catch {
    return false
  }
}

export function OptimizedImage({
  src,
  width = 1200,
  height = 800,
  sizes = "(max-width: 768px) 100vw, 768px",
  unoptimized,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      {...props}
      src={src}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized={
        unoptimized ?? (isLocalPreview(src) || !isOptimizableSource(src))
      }
    />
  )
}
