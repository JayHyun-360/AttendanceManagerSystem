"use client"

import { useEffect, useState } from "react"

import { getProgramCatalog, type Program } from "@/lib/programCatalog"

type ProgramSelectProps = {
  label?: string

  required?: boolean

  value: string

  onChange: React.ChangeEventHandler<HTMLSelectElement>

  includeAllPrograms?: boolean
}

export function ProgramSelect({
  label = "Program",

  required,

  value,

  onChange,

  includeAllPrograms = false,
}: ProgramSelectProps) {
  const [programs, setPrograms] = useState<Program[]>([])

  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void getProgramCatalog().then(
      ({ data, error }) => {
        if (cancelled) return

        if (error) {
          console.error("Failed to load program options", error)

          setLoadError("Programs could not be loaded. Refresh and try again.")

          return
        }

        setPrograms(data ?? [])
      },

      (error: unknown) => {
        if (cancelled) return

        console.error("Failed to load program options", error)

        setLoadError("Programs could not be loaded. Refresh and try again.")
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  const activePrograms = programs.filter((program) => program.active)

  const selectedProgram = programs.find((program) => program.name === value)

  const selectedIsUnavailable =
    !!value && value !== "All Programs" && !selectedProgram

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
        {label}
        {required && <span className="ml-1 text-emerald-500">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={onChange}
        disabled={!!loadError}
        aria-invalid={!!loadError}
        className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <option value="">Select program</option>
        {includeAllPrograms && <option>All Programs</option>}
        {selectedIsUnavailable && <option value={value}>{value}</option>}
        {activePrograms.map((program) => (
          <option key={program.id} value={program.name}>
            {program.name}
          </option>
        ))}
        {selectedProgram && !selectedProgram.active && (
          <option value={selectedProgram.name}>
            {selectedProgram.name} (inactive)
          </option>
        )}
      </select>
      {loadError && <p className="text-[10px] text-red-500">{loadError}</p>}
    </div>
  )
}
