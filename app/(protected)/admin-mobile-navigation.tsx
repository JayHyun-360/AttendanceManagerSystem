"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { usePathname } from "next/navigation"

import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileText,
  Home,
  MoreHorizontal,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion"

import type { Page } from "../shared-page"

type AdminNavigationPage =
  | "admin-dashboard"
  | "admin-events"
  | "admin-attendees"
  | "admin-students"
  | "admin-announcements"
  | "dev-notes"
  | "admin-excuse-requests"
  | "admin-reports"
  | "admin-settings"

type NavigationItem = {
  label: string
  page: AdminNavigationPage
  href: string
  Icon: LucideIcon
}

type HandlePointerState = {
  pointerId: number
  startY: number
  lastY: number
  lastTime: number
  lastVelocity: number
}

const mobileOrTabletMediaQuery =
  "(max-width: 767px), (min-width: 768px) and (max-width: 1439px) and (any-pointer: coarse)"

const primaryItems: NavigationItem[] = [
  {
    label: "Home",
    page: "admin-dashboard",
    href: "/admin-dashboard",
    Icon: Home,
  },
  {
    label: "Events",
    page: "admin-events",
    href: "/admin-events",
    Icon: CalendarDays,
  },
  {
    label: "Attendance",
    page: "admin-attendees",
    href: "/admin-attendees",
    Icon: CheckCircle2,
  },
  {
    label: "Students",
    page: "admin-students",
    href: "/admin-students",
    Icon: Users,
  },
]

const moreItems: NavigationItem[] = [
  {
    label: "Announcements",
    page: "admin-announcements",
    href: "/admin-announcements",
    Icon: Bell,
  },
  {
    label: "Dev Notes",
    page: "dev-notes",
    href: "/dev-notes",
    Icon: Code2,
  },
  {
    label: "Excuse Requests",
    page: "admin-excuse-requests",
    href: "/admin-excuse-requests",
    Icon: ClipboardList,
  },
  {
    label: "Reports",
    page: "admin-reports",
    href: "/admin-reports",
    Icon: BarChart3,
  },
  {
    label: "Settings",
    page: "admin-settings",
    href: "/admin-settings",
    Icon: Settings,
  },
]

export default function AdminMobileNavigation({
  onNavigate,
}: {
  onNavigate: (page: Page) => void
}) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const [moreOpen, setMoreOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const handlePointerRef = useRef<HandlePointerState | null>(null)
  const sheetDragY = useMotionValue(0)

  const isMoreDestination = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return

    const responsiveNavigation = window.matchMedia(mobileOrTabletMediaQuery)
    const closeOnDesktop = () => {
      if (!responsiveNavigation.matches) setMoreOpen(false)
    }

    closeOnDesktop()
    if (!responsiveNavigation.matches) return

    responsiveNavigation.addEventListener("change", closeOnDesktop)

    return () => {
      responsiveNavigation.removeEventListener("change", closeOnDesktop)
    }
  }, [moreOpen])

  useEffect(() => {
    if (!moreOpen) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : moreButtonRef.current

    const main = document.getElementById("protected-main-content")
    const previousBodyOverflow = document.body.style.overflow
    const previousMainOverflow = main?.style.overflow

    document.body.style.overflow = "hidden"
    if (main) main.style.overflow = "hidden"

    panelRef.current?.querySelector<HTMLElement>("nav button")?.focus()
    const focusableItems = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    const firstItem = focusableItems?.[0]
    const lastItem = focusableItems?.[focusableItems.length - 1]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setMoreOpen(false)
        return
      }

      if (event.key !== "Tab" || !firstItem || !lastItem) return

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem?.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      if (main && previousMainOverflow !== undefined) {
        main.style.overflow = previousMainOverflow
      }
      window.removeEventListener("keydown", handleKeyDown)

      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus()
      }
    }
  }, [moreOpen])

  if (pathname === "/admin-scanner") return null

  const navigate = (page: AdminNavigationPage) => {
    setMoreOpen(false)
    onNavigate(page)
  }

  const closeMore = () => setMoreOpen(false)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      handlePointerRef.current ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    const now = performance.now()
    handlePointerRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: now,
      lastVelocity: 0,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = handlePointerRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const now = performance.now()
    const elapsed = Math.max(1, now - drag.lastTime)
    sheetDragY.set(Math.max(0, event.clientY - drag.startY))
    drag.lastVelocity = (event.clientY - drag.lastY) / elapsed
    drag.lastY = event.clientY
    drag.lastTime = now
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = handlePointerRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    handlePointerRef.current = null

    const dragDistance = Math.max(0, event.clientY - drag.startY)
    const timeSinceLastMove = performance.now() - drag.lastTime
    const releaseVelocity =
      (event.clientY - drag.lastY) / Math.max(1, timeSinceLastMove)
    const downwardVelocity =
      timeSinceLastMove <= 120
        ? Math.max(drag.lastVelocity, releaseVelocity)
        : 0
    const panelHeight =
      panelRef.current?.getBoundingClientRect().height ?? window.innerHeight

    sheetDragY.set(dragDistance)

    if (
      dragDistance >= panelHeight * 0.25 ||
      (dragDistance > 20 && downwardVelocity >= 0.65)
    ) {
      closeMore()
    } else if (prefersReducedMotion) {
      sheetDragY.set(0)
    } else {
      animate(sheetDragY, 0, {
        type: "spring",
        stiffness: 500,
        damping: 40,
      })
    }
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (handlePointerRef.current?.pointerId !== event.pointerId) return

    handlePointerRef.current = null
    if (prefersReducedMotion) {
      sheetDragY.set(0)
    } else {
      animate(sheetDragY, 0, {
        type: "spring",
        stiffness: 500,
        damping: 40,
      })
    }
  }

  return (
    <div className="admin-mobile-navigation-root">
      <nav
        aria-label="Admin quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
        style={{
          height: "var(--admin-bottom-nav-height)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex min-h-16 items-stretch">
          {primaryItems.map(({ label, page, href, Icon }) => {
            const active =
              pathname === href ||
              (page === "admin-students" &&
                pathname.startsWith("/admin-students/"))

            return (
              <button
                key={page}
                type="button"
                onClick={() => navigate(page)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                  active ? "text-emerald-600" : "text-slate-500"
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-controls="admin-more-sheet"
            aria-pressed={moreOpen}
            aria-current={isMoreDestination ? "page" : undefined}
            className={`flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
              moreOpen || isMoreDestination
                ? "text-emerald-600"
                : "text-slate-500"
            }`}
          >
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="admin-more-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            onClick={closeMore}
            className="fixed inset-0 z-[60] touch-none bg-slate-950/35"
          />
        )}
        {moreOpen && (
          <motion.section
            key="admin-more-sheet"
            id="admin-more-sheet"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-more-title"
            tabIndex={-1}
            initial={prefersReducedMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={prefersReducedMotion ? { y: 0 } : { y: "100%" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[min(85dvh,640px)] w-full max-w-xl flex-col overflow-y-auto overscroll-contain rounded-t-3xl border border-slate-100 bg-white shadow-xl"
            style={{
              y: sheetDragY,
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <div
              className="flex h-11 shrink-0 touch-none items-center justify-center"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-10 rounded-full bg-slate-300"
              />
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-4">
              <h2
                id="admin-more-title"
                className="text-base font-bold text-slate-900"
              >
                More
              </h2>
            </div>
            <nav
              aria-label="More admin modules"
              className="space-y-1 px-3 py-3"
            >
              {moreItems.map(({ label, page, href, Icon }) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => navigate(page)}
                  aria-current={pathname === href ? "page" : undefined}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Icon
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-emerald-600"
                  />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
