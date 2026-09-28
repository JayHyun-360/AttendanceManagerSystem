"use client"

import { useCallback, useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"

export type SidebarMode = "expanded" | "compact" | "hidden"

const STORAGE_KEY = "adesse-sidebar-mode"
const MODES: SidebarMode[] = ["expanded", "compact", "hidden"]

function isSidebarMode(value: string | null): value is SidebarMode {
  return value === "expanded" || value === "compact" || value === "hidden"
}

export function useSidebar() {
  const [mode, setModeState] = useState<SidebarMode>("expanded")
  const [mounted, setMounted] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isSidebarMode(saved)) setModeState(saved)
    setMounted(true)
  }, [])

  const setMode = useCallback((next: SidebarMode) => {
    setModeState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const cycleMode = useCallback(() => {
    const currentIndex = MODES.indexOf(mode)
    setMode(MODES[(currentIndex + 1) % MODES.length])
  }, [mode, setMode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== "[" || target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")) return
      event.preventDefault()
      cycleMode()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [cycleMode])

  return { mode, setMode, cycleMode, mounted, reducedMotion: reducedMotion ?? false }
}
