"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  TopBar,
  Sidebar,
  Toast,
  PageShell,
  type Page,
  type User,
} from "../page";
import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";

type ProtectedUserContextValue = {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  authUserId: string | null;
  setAuthUserId: Dispatch<SetStateAction<string | null>>;
  showFees: boolean;
};

const ProtectedUserContext = createContext<ProtectedUserContextValue | null>(
  null,
);

export function useProtectedUser() {
  const value = useContext(ProtectedUserContext);
  if (!value) {
    throw new Error("useProtectedUser must be used inside ProtectedLayout");
  }
  return value;
}

const pathToPage: Partial<Record<string, Page>> = {
  "/dashboard": "dashboard",
  "/admin-dashboard": "admin-dashboard",
  "/onboarding": "onboarding",
  "/events": "events",
  "/my-qr": "my-qr",
  "/announcements": "announcements",
  "/attendance-history": "attendance-history",
  "/my-fines": "my-fines",
  "/profile": "profile",
  "/admin-events": "admin-events",
  "/admin-scanner": "admin-scanner",
  "/admin-attendees": "admin-attendees",
  "/admin-students": "admin-students",
  "/admin-announcements": "admin-announcements",
  "/admin-excuse-requests": "admin-excuse-requests",
  "/admin-reports": "admin-reports",
  "/admin-settings": "admin-settings",
};

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("landing");
  const [open, setOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [showFees, setShowFees] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(sessionError);
        }

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const uid = session.user.id;
        if (!cancelled) {
          setAuthUserId(uid);
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error(profileError);
        }

        if (!profile) {
          router.push("/onboarding");
          return;
        }

        if (
          !profile.first_name ||
          !profile.student_id ||
          !profile.surname ||
          !profile.program ||
          !profile.year_level ||
          !profile.section
        ) {
          router.push("/onboarding");
          return;
        }

        const hydratedUser: User = {
          firstName: profile.first_name ?? "",
          middleInitial: profile.middle_initial ?? "",
          surname: profile.surname ?? "",
          studentId: profile.student_id ?? "",
          program: profile.program ?? "",
          yearLevel: profile.year_level ?? "",
          section: profile.section ?? "",
          phone: profile.phone ?? "",
          contactEmail: profile.contact_email ?? profile.email ?? "",
          role: profile.role ?? "student",
          photoUrl: profile.photo_url ?? undefined,
          idPhotoUrl: profile.photo_url ?? undefined,
        };

        if (!cancelled) {
          setUser(hydratedUser);
        }
      } catch (caught) {
        console.error(caught);
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    }

    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSettings() {
      const { data, error } = await supabase
        .from("system_settings")
        .select("settings")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load protected settings", error);
      }

      if (!cancelled) {
        const savedSettings = data?.settings as
          | { showFees?: boolean }
          | null
          | undefined;
        setShowFees(savedSettings?.showFees ?? false);
        setSettingsReady(true);
      }
    }

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const routePage = pathToPage[pathname] ?? "dashboard";
    setPage(routePage);

    window.scrollTo({ top: 0, behavior: "auto" });
    document.getElementById("protected-main-content")?.scrollTo({
      top: 0,
      behavior: "auto",
    });

    // Role-based redirect: prevent admins from accessing student pages and vice versa
    if (user) {
      const isAdminRoute =
        pathname.startsWith("/admin-") || pathname === "/admin-dashboard";
      const isStudentRoute =
        pathname === "/dashboard" ||
        pathname === "/my-qr" ||
        pathname === "/my-fines" ||
        pathname === "/attendance-history";

      if (isAdminRoute && user.role !== "admin") {
        router.push("/dashboard");
      } else if (isStudentRoute && user.role === "admin") {
        router.push("/admin-dashboard");
      }
    }
  }, [pathname, user, router]);

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (caughtError) {
      console.error(caughtError);
    }

    setUser(null);
    setAuthUserId(null);
    setPage("landing");
    setOpen(false);
    router.push("/login");
  };

  const onNav = (p: Page) => {
    const routeFromPage: Record<Page, string> = {
      landing: "/",
      login: "/login",
      onboarding: "/onboarding",
      dashboard: "/dashboard",
      "my-qr": "/my-qr",
      events: "/events",
      "event-detail": "/events",
      announcements: "/announcements",
      "attendance-history": "/attendance-history",
      "my-fines": "/my-fines",
      profile: "/profile",
      "admin-dashboard": "/admin-dashboard",
      "admin-events": "/admin-events",
      "admin-scanner": "/admin-scanner",
      "admin-attendees": "/admin-attendees",
      "admin-students": "/admin-students",
      "admin-announcements": "/admin-announcements",
      "admin-reports": "/admin-reports",
      "admin-excuse-requests": "/admin-excuse-requests",
      "admin-settings": "/admin-settings",
    };

    const target = routeFromPage[p] ?? "/dashboard";
    router.push(target);
    setOpen(false);
  };

  if (!sessionReady || !settingsReady) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          Loading TapIn...
        </div>
      </div>
    );
  }

  return (
    <ProtectedUserContext.Provider
      value={{ user, setUser, authUserId, setAuthUserId, showFees }}
    >
      <div className="h-screen overflow-hidden bg-[#f8faf9]">
        <TopBar user={user} onNav={onNav} onMenuOpen={() => setOpen(true)} />
        <div className="flex h-[calc(100vh-56px)] min-h-0">
          <Sidebar
            page={page}
            user={user}
            open={open}
            onNav={onNav}
            onClose={() => setOpen(false)}
            onLogout={onLogout}
          />
          <main
            id="protected-main-content"
            className="min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
          >
            <PageShell>{children}</PageShell>
          </main>
        </div>
        {toastMessage && <Toast message={toastMessage} variant="success" />}
      </div>
    </ProtectedUserContext.Provider>
  );
}
