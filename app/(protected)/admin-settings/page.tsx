"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminSettingsPage, type SystemSettings } from "../../page";
import { supabase } from "@/lib/supabase";

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
        return;
      }

      if (!cancelled) {
        setSettings(
          normalizeSettings(data?.settings as Partial<SystemSettings>),
        );
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

    setSaveState("saved");
    toast.success("Settings saved.");
  };

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
