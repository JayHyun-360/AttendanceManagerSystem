"use client"

import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { AdminExcuseRequestsPage, type ExcuseRequest } from "../../shared-page"

import { supabase } from "@/lib/supabase"

import { subscribeToTableChanges } from "@/lib/realtime"

import { useProtectedUser } from "../layout"

import { toast } from "sonner"

export default function AdminExcuseRequestsRoutePage() {
  const router = useRouter()

  const { user } = useProtectedUser()

  const [requests, setRequests] = useState<ExcuseRequest[]>([])

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadRequests() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard")

          return
        }

        const { data, error } = await supabase

          .from("excuse_requests")

          .select(
            "*, events(title, event_date), student_profile:profiles!excuse_requests_student_id_fkey(first_name, surname, student_id, photo_url), reviewer:profiles!excuse_requests_reviewed_by_fkey(first_name, surname)",
          )

          .order("created_at", { ascending: false })

        if (error) {
          console.error(error)

          return
        }

        if (!cancelled) {
          setRequests(
            (data ?? []).map((row: any) => ({
              id: String(row.id),

              studentName:
                `${row.student_profile?.first_name ?? ""} ${row.student_profile?.surname ?? ""}`.trim() ||
                "Student",

              studentId: row.student_profile?.student_id || "",

              photoUrl: row.student_profile?.photo_url || undefined,

              event: row.events?.title ?? "Attendance exception",

              eventId: row.event_id ?? undefined,

              sessionLabel: row.session_label ?? undefined,

              date: row.events?.event_date
                ? new Date(
                    `${row.events.event_date}T00:00:00Z`,
                  ).toLocaleDateString("en-US", {
                    month: "short",

                    day: "numeric",

                    year: "numeric",

                    timeZone: "UTC",
                  })
                : "Event date unavailable",

              reason: row.reason,

              proofName: row.document_url ? "Supporting document" : null,

              attachmentPath: row.document_url ?? undefined,

              status: row.status,

              reviewedBy:
                `${row.reviewer?.first_name ?? ""} ${row.reviewer?.surname ?? ""}`.trim() ||
                undefined,

              reviewedAt: row.reviewed_at ?? undefined,

              submittedDate: new Date(row.created_at).toLocaleDateString(
                "en-US",

                {
                  month: "short",

                  day: "numeric",

                  year: "numeric",
                },
              ),
            })),
          )
        }
      } catch (caughtError) {
        console.error(caughtError)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadRequests()

    const requestsChannel = subscribeToTableChanges("excuse_requests", () => {
      if (!cancelled) {
        void loadRequests()
      }
    })

    return () => {
      cancelled = true

      void requestsChannel.unsubscribe()
    }
  }, [router, user])

  const handleViewAttachment = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage

        .from("excuse-documents")

        .createSignedUrl(path, 300)

      if (error || !data?.signedUrl) {
        console.error(error)

        toast.error(
          "The attachment could not be opened. It may have been submitted before file uploads were available.",
        )

        return null
      }

      return data.signedUrl
    } catch (caughtError) {
      console.error(caughtError)

      toast.error(
        "The attachment could not be opened. Check your connection and try again.",
      )

      return null
    }
  }

  const handleAction = async (id: string, action: "approved" | "denied") => {
    if (
      !window.confirm(
        action === "approved"
          ? "Approve this excuse? It will clear the event sanction and waive any linked unpaid fine."
          : "Deny this excuse request?",
      )
    )
      return

    const { error } = await supabase.rpc("review_excuse_request", {
      p_request_id: id,

      p_decision: action,
    })

    if (error) {
      console.error(error)

      toast.error("The request could not be updated. Please try again.")

      return
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status: action } : request,
      ),
    )

    toast.success(
      action === "approved"
        ? "Excuse approved. The event sanction was cleared and any linked unpaid fine was waived."
        : "Excuse request denied.",
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <AdminExcuseRequestsPage
      requests={requests}
      onAction={handleAction}
      onViewAttachment={handleViewAttachment}
      onBack={() => router.push("/admin-dashboard")}
    />
  )
}
