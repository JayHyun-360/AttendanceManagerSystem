"use client"

import { useCallback, useEffect, useState } from "react"

import { toast } from "sonner"

import {
  getProgramCatalog,
  invalidateProgramCatalogCache,
  type Program,
} from "@/lib/programCatalog"

import { supabase } from "@/lib/supabase"

export function AdminProgramCatalog() {
  const [programs, setPrograms] = useState<Program[]>([])

  const [name, setName] = useState("")

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadPrograms = useCallback(async () => {
    try {
      const { data, error } = await getProgramCatalog()

      if (error) {
        console.error("Failed to load programs for administration", error)

        setErrorMessage(
          "Programs could not be loaded. Please refresh the page.",
        )

        setLoading(false)

        return
      }

      setPrograms(data ?? [])

      setErrorMessage(null)

      setLoading(false)
    } catch (error) {
      console.error("Failed to load programs for administration", error)

      setErrorMessage("Programs could not be loaded. Please refresh the page.")

      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPrograms()
  }, [loadPrograms])

  const addProgram = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = name.trim()

    if (
      normalizedName.length < 2 ||
      normalizedName.length > 100 ||
      normalizedName.includes("/")
    ) {
      setErrorMessage(
        "Enter a program name between 2 and 100 characters without a slash.",
      )

      return
    }

    setSaving(true)

    setErrorMessage(null)

    try {
      const { error } = await supabase.from("programs").insert({
        name: normalizedName,

        active: true,

        sort_order:
          Math.max(0, ...programs.map((program) => program.sort_order)) + 10,
      })

      if (error) {
        console.error("Failed to add program", error)

        setErrorMessage(
          error.code === "23505"
            ? "A program with that name already exists."
            : "The program could not be added. Please try again.",
        )

        return
      }

      setName("")

      invalidateProgramCatalogCache()

      toast.success("Program added.")

      await loadPrograms()
    } catch (error) {
      console.error("Failed to add program", error)

      setErrorMessage("The program could not be added. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const toggleProgram = async (program: Program) => {
    setPendingProgramId(program.id)

    setErrorMessage(null)

    try {
      const { error } = await supabase

        .from("programs")

        .update({ active: !program.active })

        .eq("id", program.id)

      if (error) {
        console.error("Failed to update program status", error)

        setErrorMessage("The program status could not be updated. Try again.")

        return
      }

      invalidateProgramCatalogCache()

      toast.success(
        program.active ? "Program deactivated." : "Program restored.",
      )

      await loadPrograms()
    } catch (error) {
      console.error("Failed to update program status", error)

      setErrorMessage("The program status could not be updated. Try again.")
    } finally {
      setPendingProgramId(null)
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-100 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Programs</h3>
        <p className="mt-1 text-xs text-slate-500">
          Active programs appear in student profiles and event targeting.
          Deactivate a program to hide it from new selections without changing
          existing records.
        </p>
      </div>

      <form onSubmit={addProgram} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="new-program-name">
          New program name
        </label>
        <input
          id="new-program-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="e.g. Bachelor of Science in Nursing"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={saving || loading}
          className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add program"}
        </button>
      </form>

      {errorMessage && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-xs text-slate-500">Loading programs...</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {programs.map((program) => (
            <li
              key={program.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {program.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {program.active ? "Active" : "Inactive"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleProgram(program)}
                disabled={pendingProgramId === program.id}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {pendingProgramId === program.id
                  ? "Saving..."
                  : program.active
                    ? "Deactivate"
                    : "Restore"}
              </button>
            </li>
          ))}
          {programs.length === 0 && (
            <li className="py-4 text-xs text-slate-500">
              No programs are configured.
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
