"use client"

import Image, { type ImageProps } from "next/image"
import { useEffect, useRef, useState } from "react"

import { supabase } from "@/lib/supabase"

const PRIVATE_MEDIA_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="

const PRIVATE_MEDIA_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:profile|cover|id)\/[^/]+$/i

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

function isStudentPrivateMediaPath(src: ImageProps["src"]): src is string {
  return typeof src === "string" && PRIVATE_MEDIA_PATH.test(src)
}

function isOptimizableSource(src: ImageProps["src"]) {
  if (typeof src !== "string") return false
  if (src.startsWith("/")) return true
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  try {
    const imageUrl = new URL(src)
    return (
      imageUrl.origin === new URL(supabaseUrl).origin &&
      !imageUrl.pathname.includes("/storage/v1/object/sign/")
    )
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
  const isPrivateMedia = isStudentPrivateMediaPath(src)
  const imageRef = useRef<HTMLImageElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [resolvedSrc, setResolvedSrc] = useState<ImageProps["src"]>(
    isPrivateMedia ? PRIVATE_MEDIA_PLACEHOLDER : src,
  )

  useEffect(() => {
    let active = true

    if (!isStudentPrivateMediaPath(src)) {
      setResolvedSrc(src)
      return () => {
        active = false
      }
    }

    setResolvedSrc(PRIVATE_MEDIA_PLACEHOLDER)

    const downloadPrivateImage = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("student-private-media")
          .download(src)
        if (!active) return
        if (error || !data) {
          console.error("Could not retrieve private student media", error)
          return
        }
        const objectUrl = URL.createObjectURL(data)
        if (!active) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        objectUrlRef.current = objectUrl
        setResolvedSrc(objectUrl)
      } catch (error) {
        if (active) {
          console.error("Could not retrieve private student media", error)
        }
      }
    }

    if (props.loading === "eager" || !imageRef.current) {
      void downloadPrivateImage()
    } else if (typeof IntersectionObserver === "undefined") {
      void downloadPrivateImage()
    } else {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            observer.disconnect()
            void downloadPrivateImage()
          }
        },
        { rootMargin: "100px" },
      )
      observer.observe(imageRef.current)
      return () => {
        active = false
        observer.disconnect()
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
        }
      }
    }

    return () => {
      active = false
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [src])

  return (
    <Image
      {...props}
      ref={imageRef}
      src={resolvedSrc}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized={
        unoptimized ??
        (isPrivateMedia ||
          isLocalPreview(resolvedSrc) ||
          !isOptimizableSource(resolvedSrc))
      }
    />
  )
}
