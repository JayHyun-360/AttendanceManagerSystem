"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, LogOut, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet"
import { Logo, LogoLockup } from "./app-logo"
import { navigationForRole, type ShellPage, type ShellRole } from "./navigation-config"
import type { SidebarMode } from "./use-sidebar"

export type ShellUser = { firstName: string; surname: string; role: ShellRole; photoUrl?: string }

type SidebarProps = {
  page: ShellPage
  role: ShellRole
  mode: SidebarMode
  reducedMotion: boolean
  onNavigate: (page: ShellPage) => void
  onClose: () => void
  onLogout: () => void
  badges?: Partial<Record<ShellPage, number>>
  showHeader?: boolean
}

function NavLink({ item, active, compact, onClose, reducedMotion }: { item: ReturnType<typeof navigationForRole>[number]; active: boolean; compact: boolean; onClose: () => void; reducedMotion: boolean }) {
  const Icon = item.icon
  const link = <Link href={item.route} onClick={onClose} aria-current={active ? "page" : undefined} className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${compact ? "justify-center" : ""} ${active ? "font-semibold text-emerald-800" : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
    {active && <motion.span layoutId="adesse-active-pill" className="absolute inset-0 -z-0 rounded-lg bg-emerald-50" transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }} />}
    <Icon className={`relative z-10 size-[18px] shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} aria-hidden="true" />
    <AnimatePresence initial={false} mode="popLayout">
      {!compact && <motion.span initial={{ opacity: 0, x: reducedMotion ? 0 : -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -6 }} transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }} className="relative z-10 min-w-0 truncate whitespace-nowrap">{item.label}</motion.span>}
    </AnimatePresence>
  </Link>
  return compact ? <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip> : link
}

function SidebarBody({ page, role, mode, reducedMotion, onNavigate, onClose, onLogout, badges, showHeader = true }: SidebarProps) {
  const compact = mode === "compact"
  return <div className="flex h-full min-h-0 flex-col bg-white">
    {showHeader && <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 px-4 ${compact ? "justify-center" : ""}`}>
      <AnimatePresence initial={false} mode="wait">
        {compact ? <motion.span key="mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.22 }}><Logo className="size-8" /></motion.span> : <motion.span key="lockup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.22 }}><LogoLockup /></motion.span>}
      </AnimatePresence>
    </div>}
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Primary navigation">
      {navigationForRole(role).map((item) => <div key={item.page} className="relative"><NavLink item={item} active={page === item.page} compact={compact} onClose={onClose} reducedMotion={reducedMotion} />{!compact && badges?.[item.page] ? <span className="pointer-events-none absolute right-3 top-1/2 z-20 flex min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{badges[item.page]! > 9 ? "9+" : badges[item.page]}</span> : null}</div>)}
    </nav>
    <div className="shrink-0 border-t border-slate-100 p-2">
      <button type="button" onClick={() => onNavigate("landing")} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-500 outline-none transition hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 ${compact ? "justify-center" : ""}`} aria-label="Back to Home"><ArrowLeft className="size-[18px] shrink-0" aria-hidden="true" />{!compact && <span className="truncate whitespace-nowrap">Back to Home</span>}</button>
      <button type="button" onClick={onLogout} className={`mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-500 outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 ${compact ? "justify-center" : ""}`} aria-label="Sign out"><LogOut className="size-[18px] shrink-0" aria-hidden="true" />{!compact && <span className="truncate whitespace-nowrap">Sign out</span>}</button>
    </div>
  </div>
}

export function AppSidebar({ page, user, mode, reducedMotion, mobileOpen, onMobileOpenChange, onNavigate, onLogout, badges }: { page: ShellPage; user: ShellUser; mode: SidebarMode; reducedMotion: boolean; mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void; onNavigate: (page: ShellPage) => void; onLogout: () => void; badges?: Partial<Record<ShellPage, number>> }) {
  return <>
    <motion.aside initial={false} animate={{ width: mode === "hidden" ? 0 : mode === "compact" ? 68 : 240 }} transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }} className="hidden h-[calc(100vh-4rem)] shrink-0 overflow-hidden border-r border-slate-100 bg-white lg:block" aria-label="Primary navigation">
      <SidebarBody page={page} role={user.role} mode={mode} reducedMotion={reducedMotion} onNavigate={onNavigate} onClose={() => undefined} onLogout={onLogout} badges={badges} />
    </motion.aside>
    <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side="left" showClose={false} className="w-[min(18rem,calc(100vw-1rem))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-0 lg:hidden">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4" style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}>
          <LogoLockup />
          <SheetClose className="flex size-11 items-center justify-center rounded-lg text-slate-400 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Close navigation"><X className="size-5" /></SheetClose>
        </div>
        <div className="min-h-0 flex-1"><SidebarBody page={page} role={user.role} mode="expanded" reducedMotion={reducedMotion} showHeader={false} onNavigate={(next) => { onNavigate(next); onMobileOpenChange(false) }} onClose={() => onMobileOpenChange(false)} onLogout={onLogout} badges={badges} /></div>
      </SheetContent>
    </Sheet>
  </>
}
