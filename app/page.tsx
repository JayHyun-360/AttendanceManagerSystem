import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import LandingExperienceClient, {
  type SystemSettings,
} from "./LandingExperienceClient";

export * from "./shared-page";
export { default as LandingExperienceClient } from "./LandingExperienceClient";

const DEFAULT_SETTINGS: SystemSettings = {
  showFees: false,
  allowExcuseRequests: true,
  requirePhotoId: false,
  academicYear: "2026-2027",
  semester: "1st Semester",
  institution: "Adesse",
  heroImageUrls: [],
  carouselSlides: [],
};

const sanitizeSettings = (
  value: Partial<SystemSettings> | null | undefined,
): SystemSettings => {
  const next = value ?? DEFAULT_SETTINGS;

  return {
    ...DEFAULT_SETTINGS,
    ...next,
    heroImageUrls: (
      next.heroImageUrls ?? DEFAULT_SETTINGS.heroImageUrls
    ).filter((url) => !!url && !url.startsWith("blob:")),
    carouselSlides: (
      next.carouselSlides ?? DEFAULT_SETTINGS.carouselSlides
    ).map((slide) => ({
      ...slide,
      imageUrl:
        slide.imageUrl && !slide.imageUrl.startsWith("blob:")
          ? slide.imageUrl
          : "",
      posterUrl:
        slide.posterUrl && !slide.posterUrl.startsWith("blob:")
          ? slide.posterUrl
          : "",
    })),
  } satisfies SystemSettings;
};

const getLandingSettings = unstable_cache(
  async (): Promise<SystemSettings> => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data, error } = await supabase
      .from("system_settings")
      .select("settings")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load landing settings on server", error);
      return DEFAULT_SETTINGS;
    }

    return sanitizeSettings(data?.settings as Partial<SystemSettings> | null);
  },
  ["landing-settings"],
  { revalidate: 60, tags: ["landing-settings"] },
);

export default async function Page() {
  const settings = await getLandingSettings();
  return <LandingExperienceClient settings={settings} />;
}
