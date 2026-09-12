"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EventsPage, type EventData, type Page } from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function EventsRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (!cancelled) {
        setEvents(
          (data ?? []).map((row: any) => ({
            id: String(row.id),
            title: row.title,
            date: row.event_date,
            time:
              row.start_time && row.end_time
                ? `${row.start_time}–${row.end_time}`
                : "",
            location: row.location,
            description: row.description,
            program: row.program || "All Programs",
            fineAmount: row.absent_fine || 0,
            status: row.status || "upcoming",
            attendees: 0,
            highlightUrl:
              row.image_url && !row.image_url.startsWith("blob:")
                ? row.image_url
                : undefined,
            mediaUrls:
              row.image_url && !row.image_url.startsWith("blob:")
                ? [row.image_url]
                : [],
          })),
        );
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const onNav = (page: Page) => {
    if (page === "event-detail") {
      router.push("/events");
      return;
    }

    router.push(page === "dashboard" ? "/dashboard" : "/events");
  };

  const onSelectEvent = (id: string) => {
    router.push(`/events?eventId=${id}`);
  };

  return (
    <EventsPage
      onNav={onNav}
      onSelectEvent={onSelectEvent}
      user={user}
      showFees={true}
      events={events}
    />
  );
}
