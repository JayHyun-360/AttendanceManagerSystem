"use client";

import { AdminExcuseRequestsPage } from "../../page";

export default function AdminExcuseRequestsRoutePage() {
  return (
    <AdminExcuseRequestsPage
      requests={[]}
      onAction={(id: string, action: "approved" | "denied") => undefined}
      onBack={() => undefined}
    />
  );
}
