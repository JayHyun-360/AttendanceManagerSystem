"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminSettingsPage, type SystemSettings } from "../../page";
import { supabase } from "@/lib/supabase";
import { deleteImage } from "@/lib/uploadImage";

const defaultSettings: SystemSettings = {
  showFees: true,
  allowExcuseRequests: true,
  requirePhotoId: true,
  academicYear: "2026-2027",
  semester: "1st Semester",
  institution: "TapIn University",
  heroImageUrls: [],
  carouselSlides: [],
};

const stripBlobUrls = (value?: string) =>
  typeof value === "string" && value.startsWith("blob:") ? "" : (value ?? "");

const normalizeSettings = (
  rawSettings?: Partial<SystemSettings> | null,
): SystemSettings => ({
  showFees: rawSettings?.showFees ?? defaultSettings.showFees,
  allowExcuseRequests:
    rawSettings?.allowExcuseRequests ?? defaultSettings.allowExcuseRequests,
  requirePhotoId: rawSettings?.requirePhotoId ?? defaultSettings.requirePhotoId,
  academicYear: rawSettings?.academicYear ?? defaultSettings.academicYear,
  semester: rawSettings?.semester ?? defaultSettings.semester,
  institution: rawSettings?.institution ?? defaultSettings.institution,
  heroImageUrls: (
    rawSettings?.heroImageUrls ?? defaultSettings.heroImageUrls
  ).filter((url) => !!stripBlobUrls(url)),
  carouselSlides: (
    rawSettings?.carouselSlides ?? defaultSettings.carouselSlides
  ).map((slide) => ({
    ...slide,
    imageUrl: stripBlobUrls(slide?.imageUrl),
  })),
});

export default function AdminSettingsRoutePage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const { data, error } = await supabase
        .from("system_settings")
        .select("settings")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load settings", error);
        if (!cancelled) {
          setSettingsReady(true);
        }
        return;
      }

      if (!cancelled) {
        const cleanedSettings = normalizeSettings(
          data?.settings as Partial<SystemSettings>,
        );

        setSettings(cleanedSettings);

        if (
          data?.settings &&
          JSON.stringify(data.settings) !== JSON.stringify(cleanedSettings)
        ) {
          await supabase
            .from("system_settings")
            .update({
              settings: cleanedSettings,
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);
        }

        setSettingsReady(true);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (nextSettings: SystemSettings) => {
    const sanitizedSettings: SystemSettings = {
      ...nextSettings,
      heroImageUrls: nextSettings.heroImageUrls.filter(
        (url) => !!stripBlobUrls(url),
      ),
      carouselSlides: nextSettings.carouselSlides.map((slide) => ({
        ...slide,
        imageUrl: stripBlobUrls(slide.imageUrl),
      })),
    };

    const removedHeroUrls = settings.heroImageUrls.filter(
      (url) => !sanitizedSettings.heroImageUrls.includes(url),
    );

    const removedCarouselUrls = settings.carouselSlides
      .map((slide) => slide.imageUrl)
      .filter(
        (url) =>
          !!url &&
          !url.startsWith("blob:") &&
          !sanitizedSettings.carouselSlides.some(
            (slide) => slide.imageUrl === url,
          ),
      );

    setSettings(sanitizedSettings);
    setSaveState("saving");

    const { error } = await supabase
      .from("system_settings")
      .update({
        settings: sanitizedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("Failed to save settings", error);
      setSaveState("error");
      toast.error("Settings save failed.");
      return;
    }

    const cleanupUrls = [...removedHeroUrls, ...removedCarouselUrls];

    if (cleanupUrls.length > 0) {
      await Promise.all(
        cleanupUrls.map(async (url) => {
          const { error: deleteError } = await deleteImage(url);

          if (deleteError) {
            console.error("Failed to delete image", deleteError, url);
          }
        }),
      );
    }

    setSaveState("saved");
    toast.success("Settings saved.");
  };

  if (!settingsReady) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex justify-end">
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-24 rounded-xl bg-slate-200" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-slate-200" />
          <div className="h-32 rounded-xl bg-slate-200" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-36 rounded bg-slate-200" />
          <div className="h-40 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            saveState === "saving"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : saveState === "error"
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {saveState === "saving"
            ? "Saving..."
            : saveState === "error"
              ? "Save failed"
              : saveState === "saved"
                ? "Saved"
                : "Ready"}
        </div>
      </div>

      <AdminSettingsPage settings={settings} onSave={handleSave} />
    </div>
  );
}
