"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { supabase } from "@/lib/supabase";

type PrivateIdImageProps = Omit<
  ComponentProps<typeof OptimizedImage>,
  "src"
> & {
  path?: string | null;
};

export function PrivateIdImage({ path, ...imageProps }: PrivateIdImageProps) {
  const [signedImage, setSignedImage] = useState({ path: "", url: "" });

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout>;

    async function refreshSignedUrl() {
      if (!path) {
        setSignedImage({ path: "", url: "" });
        return;
      }

      const { data, error } = await supabase.storage
        .from("id-verification")
        .createSignedUrl(path, 300);

      if (cancelled) return;
      setSignedImage({ path, url: error ? "" : data.signedUrl });
      refreshTimer = setTimeout(() => void refreshSignedUrl(), 240_000);
    }

    void refreshSignedUrl();

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
    };
  }, [path]);

  const signedUrl = signedImage.path === path ? signedImage.url : "";

  if (!signedUrl) {
    return (
      <div
        className={imageProps.className}
        role="img"
        aria-label={imageProps.alt ?? "Private image unavailable"}
      />
    );
  }

  return <OptimizedImage {...imageProps} src={signedUrl} unoptimized />;
}
