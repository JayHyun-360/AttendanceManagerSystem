"use client";

import { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { AdminSettingsPage, type SystemSettings } from "../../shared-page";

import { supabase } from "@/lib/supabase";

import { deleteImages } from "@/lib/uploadImage";
import { invalidatePublicSystemSettingsCache } from "@/lib/systemSettings";

const defaultSettings: SystemSettings = {
  finesEnabled: false,

  showFees: true,

  allowExcuseRequests: true,

  requirePhotoId: true,

  academicYear: "2026-2027",

  semester: "1st Semester",

  institution: "Adesse University",

  heroImageUrls: [],

  carouselSlides: [],
};

const stripBlobUrls = (value?: string) =>
  typeof value === "string" && value.startsWith("blob:") ? "" : (value ?? "");

const normalizeSettings = (
  rawSettings?: Partial<SystemSettings> | null,
): SystemSettings => ({
  finesEnabled: rawSettings?.finesEnabled ?? defaultSettings.finesEnabled,

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

    ...(slide?.posterUrl !== undefined
      ? { posterUrl: stripBlobUrls(slide.posterUrl) }
      : {}),
  })),
});

export default function AdminSettingsRoutePage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const [settingsReady, setSettingsReady] = useState(false);

  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const settingsRef = useRef(defaultSettings);

  const persistedSettingsRef = useRef(defaultSettings);

  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

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

        settingsRef.current = cleanedSettings;

        persistedSettingsRef.current = cleanedSettings;

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

  const persistSettings = (nextSettings: SystemSettings) => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(async () => {
        try {
          const { error } = await supabase
            .from("system_settings")
            .update({
              settings: nextSettings,
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);

          if (error) {
            throw error;
          }

          invalidatePublicSystemSettingsCache();

          const previousSettings = persistedSettingsRef.current;
          persistedSettingsRef.current = nextSettings;

          const retainedUrls = new Set([
            ...nextSettings.heroImageUrls,
            ...nextSettings.carouselSlides.flatMap((slide) => [
              slide.imageUrl,
              slide.posterUrl ?? "",
            ]),
          ]);
          const cleanupUrls = [
            ...previousSettings.heroImageUrls,
            ...previousSettings.carouselSlides.flatMap((slide) => [
              slide.imageUrl,
              slide.posterUrl ?? "",
            ]),
          ].filter(
            (url) =>
              !!url && !url.startsWith("blob:") && !retainedUrls.has(url),
          );

          if (cleanupUrls.length > 0) {
            const cleanupResults = await deleteImages(cleanupUrls);
            const failedCleanup = cleanupResults.filter(
              (result) => !result.success,
            );

            failedCleanup.forEach((result) =>
              console.error("Failed to delete settings media", result.error),
            );

            if (failedCleanup.length > 0) {
              if (settingsRef.current === nextSettings) {
                setSaveState("saved");
                toast.warning(
                  `Settings saved, but ${failedCleanup.length} media file${failedCleanup.length === 1 ? "" : "s"} could not be cleaned up.`,
                );
              }
              return;
            }
          }

          if (settingsRef.current === nextSettings) {
            setSaveState("saved");
            toast.success("Settings saved.");
          }
        } catch (caughtError) {
          console.error("Failed to save settings", caughtError);

          if (settingsRef.current === nextSettings) {
            setSaveState("error");
            toast.error("Settings save failed.");
          }
        }
      });
  };

  const handleSave = (nextSettings: SystemSettings) => {
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

    settingsRef.current = sanitizedSettings;
    setSettings(sanitizedSettings);
    setSaveState("saving");

    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current);
    }

    pendingSaveRef.current = setTimeout(() => {
      pendingSaveRef.current = null;
      persistSettings(sanitizedSettings);
    }, 600);
  };

  useEffect(
    () => () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
        pendingSaveRef.current = null;
        persistSettings(settingsRef.current);
      }
    },
    [],
  );

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
                : "border-emerald-200 bg-emerald-50 text-emerald-600"
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
