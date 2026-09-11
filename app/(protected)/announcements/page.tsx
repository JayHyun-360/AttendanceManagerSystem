"use client";

import { AnnouncementsPage, INITIAL_ANNOUNCEMENTS } from "../../page";

export default function AnnouncementsRoutePage() {
  return (
    <AnnouncementsPage
      onBack={() => undefined}
      announcements={INITIAL_ANNOUNCEMENTS}
    />
  );
}
