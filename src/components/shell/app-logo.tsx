"use client"

import { cn } from "@/lib/utils"

export function Logo({ className, label = "Adesse" }: { className?: string; label?: string }) {
  return (
    <svg
      aria-label={label}
      role="img"
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8 shrink-0 text-emerald-600", className)}
    >
      <path
        d="M5 25 16 6l11 19"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)} aria-label="Adesse">
      <Logo className="size-8" />
      <span className="adesse-display text-xl leading-none text-slate-900">Adesse</span>
    </span>
  )
}
