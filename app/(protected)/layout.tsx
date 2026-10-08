"use client"

// Role-based redirect: prevent admins from accessing student pages and vice versa

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

import { usePathname, useRouter } from "next/navigation"

import {
  TopBar,
  Sidebar,
  Toast,
  PageShell,
  type Page,
  type User,
  type EventData,
} from "../shared-page"

import { DevNotesProvider, useDevNotes } from "../DevNotesPage"

import { supabase } from "@/lib/supabase"

import { getPublicSystemSettings } from "@/lib/systemSettings"

import { FeedbackState } from "@/components/ui/feedback"

import { toast } from "sonner"

type ProtectedUserContextValue = {
  user: User | null

  setUser: Dispatch<SetStateAction<User | null>>

  authUserId: string | null

  setAuthUserId: Dispatch<SetStateAction<string | null>>

  showFees: boolean

  dashboardSnapshot: DashboardSnapshot | null

  setDashboardSnapshot: Dispatch<SetStateAction<DashboardSnapshot | null>>

  eventsSnapshot: EventsSnapshot | null

  setEventsSnapshot: Dispatch<SetStateAction<EventsSnapshot | null>>
}

type DashboardSnapshot = {
  authUserId: string

  announcements: any[]

  fines: any[]

  events: any[]

  attendanceStats: {
    present: number

    absent: number

    upcoming: number

    totalSessions: number
  }
}

type EventsSnapshot = {
  key: string

  events: EventData[]
}

const ProtectedUserContext = createContext<ProtectedUserContextValue | null>(
  null,
)

export function useProtectedUser() {
  const value = useContext(ProtectedUserContext)

  if (!value) {
    throw new Error("useProtectedUser must be used inside ProtectedLayout")
  }

  return value
}

type ProtectedSidebarProps = ComponentProps<typeof Sidebar>

function ProtectedSidebar(props: ProtectedSidebarProps) {
  const { unreadCount } = useDevNotes()

  return <Sidebar {...props} badges={{ "dev-notes": unreadCount }} />
}

const pathToPage: Partial<Record<string, Page>> = {
  "/dashboard": "dashboard",

  "/admin-dashboard": "admin-dashboard",

  "/onboarding": "onboarding",

  "/events": "events",

  "/my-qr": "my-qr",

  "/announcements": "announcements",

  "/dev-notes": "dev-notes",

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
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  const pathname = usePathname()

  const isPublicEventsRoute = pathname === "/events"

  const page = pathToPage[pathname] ?? "dashboard"

  const [user, setUser] = useState<User | null>(null)

  const [authUserId, setAuthUserId] = useState<string | null>(null)

  const [open, setOpen] = useState(false)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [sessionReady, setSessionReady] = useState(false)

  const [hasSession, setHasSession] = useState(false)

  const [settingsReady, setSettingsReady] = useState(false)

  const [showFees, setShowFees] = useState(false)

  const [dashboardSnapshot, setDashboardSnapshot] =
    useState<DashboardSnapshot | null>(null)

  const [eventsSnapshot, setEventsSnapshot] = useState<EventsSnapshot | null>(
    null,
  )

  const [sessionError, setSessionError] = useState<string | null>(null)

  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function hydrateSession() {
      if (!cancelled) setSessionError(null)

      try {
        const {
          data: { session },

          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error(sessionError)

          if (!cancelled) {
            if (isPublicEventsRoute) {
              setHasSession(false)
            } else {
              setSessionError(
                "We could not verify your session. Please try again.",
              )
            }
          }

          return
        }

        if (!session?.user) {
          if (!cancelled) {
            setHasSession(false)
          }

          return
        }

        if (!cancelled) {
          setHasSession(true)
        }

        const uid = session.user.id

        if (!cancelled) {
          setAuthUserId(uid)
        }

        const { data: profile, error: profileError } = await supabase

          .from("profiles")

          .select("*")

          .eq("id", uid)

          .maybeSingle()

        if (profileError && profileError.code !== "PGRST116") {
          console.error(profileError)
        }

        const googleAvatarUrl =
          session.user.user_metadata?.avatar_url as string | undefined ??
          session.user.user_metadata?.picture as string | undefined ??
          session.user.user_metadata?.image_url as string | undefined ??
          null

        if (!profile) {
          router.push("/onboarding")

          return
        }

        if (!profile.photo_url && googleAvatarUrl) {
          const { error: avatarUpdateError } = await supabase

            .from("profiles")

            .update({ photo_url: googleAvatarUrl })

            .eq("id", uid)

          if (avatarUpdateError) {
            console.error(
              "Failed to set Google avatar as default photo",

              avatarUpdateError,
            )
          }
        }

        const profileIsIncomplete =
          !profile.first_name ||
          !profile.surname ||
          (profile.role !== "admin" &&
            (!profile.student_id || !profile.program || !profile.year_level))

        if (profileIsIncomplete) {
          router.push("/onboarding")

          return
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
        }

        if (!cancelled) {
          setUser(hydratedUser)
        }
      } catch (caught) {
        console.error(caught)

        if (!cancelled)
          setSessionError(
            "We could not load your account. Check your connection and try again.",
          )
      } finally {
        if (!cancelled) {
          setSessionReady(true)
        }
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (sessionReady && !hasSession && !isPublicEventsRoute && !sessionError) {
      router.replace("/login")
    }
  }, [hasSession, isPublicEventsRoute, router, sessionError, sessionReady])

  useEffect(() => {
    let cancelled = false

    if (!sessionReady) {
      return () => {
        cancelled = true
      }
    }

    if (!hasSession) {
      setShowFees(false)

      setSettingsReady(true)

      return () => {
        cancelled = true
      }
    }

    setSettingsReady(false)

    async function hydrateSettings() {
      if (!cancelled) setSettingsError(null)

      try {
        const { data, error } = await getPublicSystemSettings()

        if (error) {
          console.error("Failed to load protected settings", error)

          if (!cancelled)
            setSettingsError("System settings are temporarily unavailable.")

          return
        }

        if (!cancelled) {
          const savedSettings = data?.settings as {
            finesEnabled?: boolean

            showFees?: boolean
          } | null | undefined

          setShowFees(
            savedSettings?.finesEnabled === true &&
              savedSettings.showFees === true,
          )

          setSettingsReady(true)
        }
      } catch (caught) {
        console.error(caught)

        if (!cancelled)
          setSettingsError("System settings are temporarily unavailable.")
      } finally {
        if (!cancelled) setSettingsReady(true)
      }
    }

    void hydrateSettings()

    return () => {
      cancelled = true
    }
  }, [hasSession, sessionReady])

  useEffect(() => {
    void router.prefetch("/")

    void router.prefetch(
      user?.role === "admin" ? "/admin-dashboard" : "/dashboard",
    )
  }, [router, user?.role])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })

    document.getElementById("protected-main-content")?.scrollTo({
      top: 0,

      behavior: "auto",
    })

    if (user) {
      const isAdminRoute =
        pathname.startsWith("/admin-") || pathname === "/admin-dashboard"

      const isStudentRoute =
        pathname === "/dashboard" ||
        pathname === "/onboarding" ||
        pathname === "/events" ||
        pathname === "/announcements" ||
        pathname === "/my-qr" ||
        pathname === "/my-fines" ||
        pathname === "/attendance-history"

      if (isAdminRoute && user.role !== "admin") {
        router.push("/dashboard")
      } else if (isStudentRoute && user.role === "admin") {
        router.push("/admin-dashboard")
      }
    }
  }, [pathname, user, router])

  const resetProtectedAuthState = () => {
    setUser(null)

    setAuthUserId(null)

    setHasSession(false)

    setSessionReady(false)

    setSettingsReady(false)

    setShowFees(false)

    setDashboardSnapshot(null)

    setEventsSnapshot(null)

    setOpen(false)
  }

  const onLogout = async () => {
    toast.loading("Signing you out...", { id: "adesse-logout" })

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      toast.success("You have been signed out.", { id: "adesse-logout" })

      resetProtectedAuthState()

      router.push("/login")
    } catch (caughtError) {
      console.error(caughtError)

      toast.error("We could not sign you out. Please try again.", {
        id: "adesse-logout",
      })
    }
  }

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

      "dev-notes": "/dev-notes",

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
    }

    const target = routeFromPage[p] ?? "/dashboard"

    router.push(target)

    setOpen(false)
  }

  const showGlobalLoading =
    !sessionReady ||
    !settingsReady ||
    (!user && !isPublicEventsRoute && pathname !== "/onboarding")

  if (!isPublicEventsRoute && (sessionError || settingsError)) {
    return (
      <div className="min-h-screen bg-[#f8faf9] px-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <FeedbackState
            title={
              sessionError
                ? "Account connection interrupted"
                : "System settings unavailable"
            }
            message={sessionError ?? settingsError ?? "Please try again."}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }

  if (showGlobalLoading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <span className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
          Loading Adesse...
        </div>
      </div>
    )
  }

  return (
    <ProtectedUserContext.Provider
      value={{
        user,

        setUser,

        authUserId,

        setAuthUserId,

        showFees,

        dashboardSnapshot,

        setDashboardSnapshot,

        eventsSnapshot,

        setEventsSnapshot,
      }}
    >
      <DevNotesProvider enabled={Boolean(user)}>
        <div className="w-full min-h-screen m-0 p-0 bg-white md:h-screen md:overflow-hidden md:bg-[#f8faf9] md:relative">
          {showGlobalLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f8faf9]/85 backdrop-blur-[1px]">
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                <span className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                Loading Adesse...
              </div>
            </div>
          )}
          <TopBar
            user={user}
            onNav={onNav}
            onMenuOpen={() => setOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={() => setSidebarCollapsed((value) => !value)}
            showFees={showFees}
          />
          <div className="w-full md:flex md:min-h-0 md:h-[calc(100vh-56px)]">
            <ProtectedSidebar
              page={page}
              user={user}
              open={open}
              onNav={onNav}
              onClose={() => setOpen(false)}
              onLogout={onLogout}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
              showFees={showFees}
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
  )
}
