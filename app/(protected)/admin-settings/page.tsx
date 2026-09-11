"use client";

import { AdminSettingsPage, type SystemSettings } from "../../page";

const emptySettings: SystemSettings = {
  showFees: true,
  allowExcuseRequests: true,
  requirePhotoId: true,
  academicYear: "2026-2027",
  semester: "1st Semester",
  institution: "TapIn University",
  heroImageUrls: [],
  carouselSlides: [],
};

export default function AdminSettingsRoutePage() {
  return (
    <AdminSettingsPage
      settings={emptySettings}
      onSave={(settings: SystemSettings) => undefined}
    />
  );
}
