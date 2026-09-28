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
  Toast,
  PageShell,
  type Page,
  type User,
} from "../shared-page";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { useSidebar } from "@/components/shell/use-sidebar";
import { pageForRoute, routeForPage } from "@/components/shell/navigation-config";
import { DevNotesProvider } from "../DevNotesPage";
import { supabase } from "@/lib/supabase";
import { FeedbackState } from "@/components/ui/feedback";
import { toast } from "sonner";

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

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("landing");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, cycleMode, reducedMotion } = useSidebar();
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
	  const [settingsReady, setSettingsReady] = useState(false);
	  const [showFees, setShowFees] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

	  useEffect(() => {
	    let cancelled = false;

	    async function hydrateSession() {
	      if (!cancelled) setSessionError(null);
	      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(sessionError);
	          if (!cancelled) setSessionError("We could not verify your session. Please try again.");
	          return;
        }

        if (!session?.user) {
          if (!cancelled) {
            setHasSession(false);
          }

	          router.replace("/login");

          return;
        }

        if (!cancelled) {
          setHasSession(true);
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

        const googleAvatarUrl =
          (session.user.user_metadata?.avatar_url as string | undefined) ??
          (session.user.user_metadata?.picture as string | undefined) ??
          (session.user.user_metadata?.image_url as string | undefined) ??
          null;

	        if (!profile) {
	          router.push("/onboarding");

	          return;
        }

        if (!profile.photo_url && googleAvatarUrl) {
          const { error: avatarUpdateError } = await supabase
            .from("profiles")
            .update({ photo_url: googleAvatarUrl })
            .eq("id", uid);

          if (avatarUpdateError) {
            console.error(
              "Failed to set Google avatar as default photo",
              avatarUpdateError,
            );
          }
        }

        const profileIsIncomplete =
          !profile.first_name ||
          !profile.surname ||
          (profile.role !== "admin" &&
            (!profile.student_id ||
              !profile.program ||
              !profile.year_level));

	        if (profileIsIncomplete) {
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
          photoUrl: profile.photo_url ?? googleAvatarUrl ?? undefined,
          coverPhotoUrl: profile.cover_photo_url ?? undefined,
          idPhotoUrl: profile.id_photo_url ?? undefined,
          qrVersion: Number(profile.qr_version ?? 1),
        };

	        if (!cancelled) {
	          setUser(hydratedUser);
	        }
      } catch (caught) {
        console.error(caught);
			if (!cancelled) setSessionError("We could not load your account. Check your connection and try again.");
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
	      if (!cancelled) setSettingsError(null);
	      try {
	      const { data, error } = await supabase
        .from("system_settings")
        .select("settings")
        .eq("id", 1)
        .maybeSingle();

	      if (error) {
	        console.error("Failed to load protected settings", error);
			if (!cancelled) setSettingsError("System settings are temporarily unavailable.");
			return;
      }

      if (!cancelled) {
        const savedSettings = data?.settings as
          | { finesEnabled?: boolean; showFees?: boolean }
          | null
          | undefined;
        setShowFees(
          savedSettings?.finesEnabled === true && savedSettings.showFees === true,
        );
	        setSettingsReady(true);
	      }
	      } catch (caught) {
	        console.error(caught);
			if (!cancelled) setSettingsError("System settings are temporarily unavailable.");
	      } finally {
			if (!cancelled) setSettingsReady(true);
	      }
    }

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void router.prefetch("/");
    void router.prefetch(
      user?.role === "admin" ? "/admin-dashboard" : "/dashboard",
    );
  }, [router, user?.role]);

  useEffect(() => {
    const routePage = pageForRoute(pathname);
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
        pathname === "/onboarding" ||
        pathname === "/events" ||
        pathname === "/announcements" ||
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

  const resetProtectedAuthState = () => {
    setUser(null);
    setAuthUserId(null);
    setHasSession(false);
	    setSessionReady(false);
    setSettingsReady(false);
    setShowFees(false);
    setPage("landing");
    setMobileOpen(false);
  };

  const onLogout = async () => {
    toast.loading("Signing you out...", { id: "adesse-logout" });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("You have been signed out.", { id: "adesse-logout" });
      resetProtectedAuthState();
		  router.push("/login");
    } catch (caughtError) {
      console.error(caughtError);
		  toast.error("We could not sign you out. Please try again.", { id: "adesse-logout" });
    }
  };

  const onNav = (p: Page) => {
    const target = routeForPage(p);
    router.push(target);
    setMobileOpen(false);
  };

	  const showGlobalLoading = !sessionReady || !settingsReady || !user;

	  if (sessionError || settingsError) {
	    return (
	      <div className="min-h-screen bg-[#f8faf9] px-4 flex items-center justify-center">
	        <div className="w-full max-w-md">
	          <FeedbackState
	            title={sessionError ? "Account connection interrupted" : "System settings unavailable"}
	            message={sessionError ?? settingsError ?? "Please try again."}
	            onRetry={() => window.location.reload()}
	          />
	        </div>
	      </div>
	    );
	  }

  if (showGlobalLoading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <span className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
          Loading Adesse...
        </div>
      </div>
    );
  }

  return (
	    <ProtectedUserContext.Provider
	      value={{ user, setUser, authUserId, setAuthUserId, showFees }}
	    >
	      <DevNotesProvider>
	      <div data-shell="true" className="app-shell w-full min-h-screen m-0 p-0 bg-white md:h-screen md:overflow-hidden md:bg-[#f8faf9] md:relative">
        {showGlobalLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f8faf9]/85 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              <span className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
              Loading Adesse...
            </div>
          </div>
        )}
        <AppHeader
          page={page}
          role={user.role}
          user={user}
          sidebarHidden={mode === "hidden"}
          onDesktopToggle={cycleMode}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onNavigate={onNav}
        />
        <div className="w-full md:flex md:min-h-0 md:h-[calc(100vh-64px)]">
	          <AppSidebar
            page={page}
            user={user}
            mode={mode}
            reducedMotion={reducedMotion}
            mobileOpen={mobileOpen}
            onMobileOpenChange={setMobileOpen}
            onNavigate={onNav}
            onLogout={onLogout}
          />
          <main
            id="protected-main-content"
            className="w-full min-w-0 md:min-h-0 md:flex-1 md:overflow-x-hidden md:overflow-y-auto md:overscroll-contain md:[scrollbar-gutter:stable]"
          >
            <PageShell>{children}</PageShell>
          </main>
        </div>
	      </div>
	      </DevNotesProvider>
	    </ProtectedUserContext.Provider>
  );
}
