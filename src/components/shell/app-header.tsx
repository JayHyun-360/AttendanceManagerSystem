"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Menu, MessageCircle, CircleHelp } from "lucide-react"
import { motion } from "motion/react"
import { GlobalSearch } from "./global-search"
import { Logo } from "./app-logo"
import { pageTitleFor, type ShellPage, type ShellRole } from "./navigation-config"
import type { ShellUser } from "./app-sidebar"

export function AppHeader({ page, role, user, sidebarHidden, onDesktopToggle, onMobileMenuOpen, onNavigate }: { page: ShellPage; role: ShellRole; user: ShellUser; sidebarHidden: boolean; onDesktopToggle: () => void; onMobileMenuOpen: () => void; onNavigate: (page: ShellPage) => void }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const title = pageTitleFor(page, role)
  const avatarText = `${user.firstName?.[0] ?? ""}${user.surname?.[0] ?? ""}`.toUpperCase() || "A"

  return <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm md:h-16" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
    <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-5">
      <button type="button" onClick={onMobileMenuOpen} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
      <button type="button" onClick={onDesktopToggle} className="hidden size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 lg:flex" aria-label="Cycle sidebar mode" title="Cycle sidebar mode ([)"><motion.span animate={{ opacity: sidebarHidden ? 1 : 0.96 }} transition={{ duration: 0.22, ease: "easeOut" }}><Logo className="size-7" /></motion.span></button>
      <motion.span className="flex shrink-0 items-center lg:hidden" initial={false} animate={{ opacity: 1 }}><Logo className="size-7" /></motion.span>
      <div className="min-w-0 shrink-0">
        <h1 className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 md:text-base">{title}</h1>
        <p className="hidden max-w-[min(42vw,28rem)] truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 md:block">Student Event Attendance &amp; Records System</p>
      </div>
      <GlobalSearch role={role} onNavigate={onNavigate} />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => router.push("/profile")} className="flex min-h-11 items-center gap-2 rounded-full px-1.5 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="View profile">
          {user.photoUrl ? <img src={user.photoUrl} alt="" className="size-9 rounded-full object-cover ring-1 ring-slate-200" /> : <span className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{avatarText}</span>}
          <span className="hidden max-w-[8rem] truncate text-xs font-semibold text-slate-600 sm:block">{user.firstName || "Profile"}</span>
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex size-11 items-center justify-center rounded-lg text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="More options" aria-expanded={menuOpen}><MoreVertical className="size-[18px]" /></button>
          {menuOpen && <><button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close menu" /><div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
            <div className="border-b border-slate-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Help &amp; Feedback</p></div>
            <button type="button" className="group flex min-h-14 w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50"><MessageCircle className="mt-0.5 size-4 text-emerald-500" /><span><span className="block text-sm font-semibold text-slate-800">Send helpful feedback</span><span className="mt-0.5 block text-[11px] text-slate-400">Help us improve Adesse for everyone</span></span></button>
            <button type="button" className="group flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"><CircleHelp className="mt-0.5 size-4 text-slate-500" /><span><span className="block text-sm font-semibold text-slate-800">Help &amp; Support</span><span className="mt-0.5 block text-[11px] text-slate-400">Browse guides and FAQs</span></span></button>
          </div></>}
        </div>
      </div>
    </div>
  </header>
}
