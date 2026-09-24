"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageShell } from "./shared-page";

export type DevNoteType = "info" | "warning" | "feature";

export type DevNote = {
  id: string;
  title: string;
  message: string;
  type: DevNoteType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type DevNotesContextValue = {
  notes: DevNote[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  markAllRead: () => void;
};

const DevNotesContext = createContext<DevNotesContextValue | null>(null);
const READ_NOTES_STORAGE_KEY = "adesse:dev-notes:read";

function normalizeNote(row: Record<string, unknown>): DevNote | null {
  const type = row.type;
  if (type !== "info" && type !== "warning" && type !== "feature") {
    return null;
  }

  const id = String(row.id ?? "");
  if (!id || typeof row.title !== "string" || typeof row.message !== "string") {
    return null;
  }

  return {
    id,
    title: row.title,
    message: row.message,
    type,
    isActive: row.is_active === true,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function sortNotes(notes: DevNote[]) {
  return [...notes].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

function readIdsFromStorage() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const value = JSON.parse(
      window.localStorage.getItem(READ_NOTES_STORAGE_KEY) ?? "[]",
    );
    return new Set(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeReadIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(
      READ_NOTES_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function DevNotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<DevNote[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => readIdsFromStorage());
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("dev_notes")
      .select("id, title, message, type, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load Dev Notes", error);
      return;
    }

    setNotes(
      sortNotes(
        (data ?? [])
          .map((row) => normalizeNote(row as Record<string, unknown>))
          .filter((note): note is DevNote => note !== null),
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (!cancelled) setIsLoading(true);
      await loadNotes();
      if (!cancelled) setIsLoading(false);
    };

    void refresh();

    const channel = supabase
      .channel("dev-notes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dev_notes" },
        () => {
          void loadNotes();
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") void loadNotes();
      });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadNotes();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [loadNotes]);

  const markAllRead = useCallback(() => {
    setReadIds((current) => {
      const next = new Set(current);
      notes.forEach((note) => next.add(note.id));
      writeReadIds(next);
      return next;
    });
  }, [notes]);

  const unreadCount = useMemo(
    () => notes.reduce((count, note) => count + (readIds.has(note.id) ? 0 : 1), 0),
    [notes, readIds],
  );

  const value = useMemo(
    () => ({
      notes,
      unreadCount,
      isLoading,
      isConnected,
      markAllRead,
    }),
    [isConnected, isLoading, markAllRead, notes, unreadCount],
  );

  return <DevNotesContext.Provider value={value}>{children}</DevNotesContext.Provider>;
}

export function useDevNotes() {
  const value = useContext(DevNotesContext);
  if (!value) {
    throw new Error("useDevNotes must be used inside DevNotesProvider");
  }
  return value;
}

const typeStyles: Record<DevNoteType, { label: string; className: string }> = {
  info: { label: "Info", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  warning: {
    label: "Warning",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  feature: {
    label: "Feature",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DevNotesPage() {
  const { notes, isLoading, isConnected, markAllRead } = useDevNotes();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <PageShell>
      <PageHeader
        title="Dev Notes"
        subtitle="Developer notifications and system updates"
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              isConnected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {isConnected ? "Live" : "Reconnecting"}
          </span>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white px-5 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">No active Dev Notes</p>
          <p className="mt-1 text-xs text-slate-400">
            New developer notifications will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const style = typeStyles[note.type];
            return (
              <article
                key={note.id}
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">{note.title}</h2>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      {formatDate(note.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${style.className}`}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {note.message}
                </p>
              </article>
            );
          })}
        </div>
      )}

    </PageShell>
  );
}

export { READ_NOTES_STORAGE_KEY };
