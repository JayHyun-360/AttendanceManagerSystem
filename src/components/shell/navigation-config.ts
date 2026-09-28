import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Code2,
  FileText,
  Home,
  QrCode,
  ScanLine,
  Settings,
  User,
  Users,
} from "lucide-react"

export type ShellRole = "student" | "admin" | null
export type ShellPage = string

export type NavigationItem = {
  page: ShellPage
  label: string
  route: string
  icon: LucideIcon
}

const adminItems: NavigationItem[] = [
  { page: "admin-dashboard", label: "Overview", route: "/admin-dashboard", icon: Home },
  { page: "admin-events", label: "Events", route: "/admin-events", icon: CalendarDays },
  { page: "admin-scanner", label: "QR Scanner", route: "/admin-scanner", icon: ScanLine },
  { page: "admin-attendees", label: "Attendees", route: "/admin-attendees", icon: Users },
  { page: "admin-students", label: "Students", route: "/admin-students", icon: User },
  { page: "admin-announcements", label: "Announcements", route: "/admin-announcements", icon: Bell },
  { page: "dev-notes", label: "Dev Notes", route: "/dev-notes", icon: Code2 },
  { page: "admin-excuse-requests", label: "Excuse Requests", route: "/admin-excuse-requests", icon: FileText },
  { page: "admin-reports", label: "Reports", route: "/admin-reports", icon: BarChart3 },
  { page: "admin-settings", label: "Settings", route: "/admin-settings", icon: Settings },
]

const studentItems: NavigationItem[] = [
  { page: "dashboard", label: "Home", route: "/dashboard", icon: Home },
  { page: "events", label: "Events", route: "/events", icon: CalendarDays },
  { page: "my-qr", label: "My QR Code", route: "/my-qr", icon: QrCode },
  { page: "announcements", label: "Announcements", route: "/announcements", icon: Bell },
  { page: "dev-notes", label: "Dev Notes", route: "/dev-notes", icon: Code2 },
  { page: "attendance-history", label: "Attendance", route: "/attendance-history", icon: CheckCircle2 },
  { page: "my-fines", label: "My Fines", route: "/my-fines", icon: FileText },
  { page: "profile", label: "Profile", route: "/profile", icon: User },
]

export const navigationConfig = { admin: adminItems, student: studentItems } as const

export function navigationForRole(role: ShellRole): NavigationItem[] {
  return role === "admin" ? adminItems : studentItems
}

export function navigationItemForPage(page: ShellPage, role: ShellRole) {
  return navigationForRole(role).find((item) => item.page === page) ?? null
}

export function pageTitleFor(page: ShellPage, role: ShellRole) {
  return navigationItemForPage(page, role)?.label ?? "Dashboard"
}

const utilityRoutes: Record<string, string> = {
  landing: "/",
  login: "/login",
  onboarding: "/onboarding",
  "event-detail": "/events",
}

export function routeForPage(page: ShellPage) {
  return utilityRoutes[page] ?? [...adminItems, ...studentItems].find((item) => item.page === page)?.route ?? "/dashboard"
}

export function pageForRoute(pathname: string): ShellPage {
  if (pathname === "/") return "landing"
  if (pathname === "/login") return "login"
  if (pathname === "/onboarding") return "onboarding"
  if (pathname.startsWith("/events/")) return "event-detail"
  return [...adminItems, ...studentItems].find((item) => pathname === item.route)?.page ?? "dashboard"
}

export function isNavigationTitle(title: string) {
  return new Set([
    ...adminItems.map((item) => item.label),
    ...studentItems.map((item) => item.label),
    "My Attendance",
    "Management & Settings",
    "Admin Overview",
  ]).has(title)
}
