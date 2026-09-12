"use client";

import { useEffect, useState } from "react";
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
  heroImageUrls: rawSettings?.heroImageUrls ?? defaultSettings.heroImageUrls,
  carouselSlides: rawSettings?.carouselSlides ?? defaultSettings.carouselSlides,
});

export default function AdminSettingsRoutePage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

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
    setSettings(nextSettings);

    const { error } = await supabase
      .from("system_settings")
      .update({
        settings: nextSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error("Failed to save settings", error);
    }
  };

  return <AdminSettingsPage settings={settings} onSave={handleSave} />;
}
