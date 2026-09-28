"use client"

import { useEffect, useState } from "react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { navigationForRole, type ShellPage, type ShellRole } from "./navigation-config"
import { Search } from "lucide-react"

export function GlobalSearch({ role, onNavigate }: { role: ShellRole; onNavigate: (page: ShellPage) => void }) {
  const [open, setOpen] = useState(false)
  const items = navigationForRole(role)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const select = (page: ShellPage) => {
    setOpen(false)
    onNavigate(page)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden h-10 max-w-[21.25rem] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-xs font-medium text-slate-400 outline-none transition hover:border-slate-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500 md:flex" aria-label="Search pages and actions">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search pages and actions</span>
        <kbd className="ml-auto shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">Ctrl K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} className="flex size-10 items-center justify-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden" aria-label="Search pages and actions">
        <Search className="size-5" aria-hidden="true" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and actions..." autoFocus />
        <CommandList>
          <CommandEmpty>No matching pages or actions.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {items.map((item) => {
              const Icon = item.icon
              return <CommandItem key={item.page} value={`${item.label} ${item.route}`} onSelect={() => select(item.page)}><Icon className="size-4 text-emerald-600" aria-hidden="true" /><span>{item.label}</span><span className="ml-auto text-xs text-slate-400">{item.route}</span></CommandItem>
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
