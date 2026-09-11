"use client";

import {
  AdminEventsPage,
  INITIAL_EVENTS,
  type EventData,
  type Page,
} from "../../page";

export default function AdminEventsRoutePage() {
  return (
    <AdminEventsPage
      onNav={(page: Page) => undefined}
      events={INITIAL_EVENTS}
      setEvents={(value: React.SetStateAction<EventData[]>) => undefined}
    />
  );
}
