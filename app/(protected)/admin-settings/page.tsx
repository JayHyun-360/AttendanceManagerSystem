"use client";

import { useState } from "react";
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
  const [settings, setSettings] = useState<SystemSettings>(emptySettings);

  return <AdminSettingsPage settings={settings} onSave={setSettings} />;
}
