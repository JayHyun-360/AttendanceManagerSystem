"use client";

import { AdminAnnouncementsPage, INITIAL_ANNOUNCEMENTS } from "../../page";

export default function AdminAnnouncementsRoutePage() {
  return (
    <AdminAnnouncementsPage
      posts={[]}
      setPosts={(value: React.SetStateAction<any[]>) => undefined}
    />
  );
}
