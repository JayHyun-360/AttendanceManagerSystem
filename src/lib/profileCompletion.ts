export type StudentIdExceptionStatus =
  | "pending"
  | "approved"
  | "temporarily_approved"
  | "rejected"
  | "resolved_by_photo"

export type StudentIdExceptionReason =
  | "awaiting_initial_id"
  | "transferee_awaiting_id"
  | "lost_id"
  | "damaged_id"
  | "replacement_processing"
  | "other"

export const STUDENT_ID_EXCEPTION_REASON_OPTIONS: {
  value: StudentIdExceptionReason
  label: string
}[] = [
  {
    value: "awaiting_initial_id",
    label: "Awaiting initial official student ID",
  },
  {
    value: "transferee_awaiting_id",
    label: "Transferee awaiting new institutional ID",
  },
  { value: "lost_id", label: "Lost my existing student ID" },
  {
    value: "damaged_id",
    label: "My student ID is damaged or unusable",
  },
  {
    value: "replacement_processing",
    label: "Replacement ID is being processed",
  },
  { value: "other", label: "Others — Please Specify" },
]

export type StudentIdException = {
  request_id?: string
  status: StudentIdExceptionStatus
  reason?: StudentIdExceptionReason | null
  explanation?: string | null
  requested_at?: string | null
  approved_by?: string | null
  approved_at?: string | null
  attendance_eligible_from?: string | null
  continued_at?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
}

export type StudentIdExceptionAccessState = {
  has_approved_exception: boolean
  has_unacknowledged_approval: boolean
}

export function parseStudentIdExceptionAccessState(
  value: unknown,
): StudentIdExceptionAccessState | null {
  const row = Array.isArray(value) ? value[0] : value

  if (
    !row ||
    typeof row !== "object" ||
    !("has_approved_exception" in row) ||
    !("has_unacknowledged_approval" in row) ||
    typeof row.has_approved_exception !== "boolean" ||
    typeof row.has_unacknowledged_approval !== "boolean"
  ) {
    return null
  }

  return {
    has_approved_exception: row.has_approved_exception,
    has_unacknowledged_approval: row.has_unacknowledged_approval,
  }
}

type ProfileCompletionFields = {
  first_name?: string | null

  surname?: string | null

  role?: string | null

  student_id?: string | null

  program?: string | null

  year_level?: string | null

  id_photo_url?: string | null

  student_id_exception_requests?: StudentIdException | StudentIdException[] | null
}

export function getStudentIdExceptionHistory(
  profile: ProfileCompletionFields | null | undefined,
): StudentIdException[] {
  const relation = profile?.student_id_exception_requests
  const requests = Array.isArray(relation) ? relation : relation ? [relation] : []

  return [...requests].sort((a, b) => {
    const aRequestedAt = a.requested_at ?? ""
    const bRequestedAt = b.requested_at ?? ""
    const aTime = Date.parse(aRequestedAt)
    const bTime = Date.parse(bRequestedAt)

    if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
      return (
        bTime - aTime ||
        (b.request_id ?? "").localeCompare(a.request_id ?? "")
      )
    }

    return (
      bRequestedAt.localeCompare(aRequestedAt) ||
      (b.request_id ?? "").localeCompare(a.request_id ?? "")
    )
  })
}

export function getStudentIdException(
  profile: ProfileCompletionFields | null | undefined,
): StudentIdException | null {
  return getStudentIdExceptionHistory(profile)[0] ?? null
}

export function isStudentIdExceptionReason(
  value: string | null | undefined,
): value is StudentIdExceptionReason {
  return STUDENT_ID_EXCEPTION_REASON_OPTIONS.some(
    (option) => option.value === value,
  )
}

export function hasIdPhoto(
  profile: ProfileCompletionFields | null | undefined,
) {
  return !!profile?.id_photo_url?.trim()
}

export function isApprovedStudentIdExceptionStatus(
  status: StudentIdExceptionStatus | null | undefined,
) {
  return status === "approved" || status === "temporarily_approved"
}

export function hasActiveTemporaryIdException(
  profile: ProfileCompletionFields | null | undefined,
) {
  return (
    !hasIdPhoto(profile) &&
    getStudentIdExceptionHistory(profile).some((request) =>
      isApprovedStudentIdExceptionStatus(request.status),
    )
  )
}

export function hasUnacknowledgedIdException(
  profile: ProfileCompletionFields | null | undefined,
  accessState?: StudentIdExceptionAccessState | null,
) {
  const requests = getStudentIdExceptionHistory(profile)

  return (
    !hasIdPhoto(profile) &&
    (accessState
      ? accessState.has_unacknowledged_approval
      : requests.some(
          (request) =>
            isApprovedStudentIdExceptionStatus(request.status) &&
            !request.continued_at,
        ))
  )
}

export function isProfileComplete(
  profile: ProfileCompletionFields | null | undefined,
  accessState?: StudentIdExceptionAccessState | null,
) {
  const requests = getStudentIdExceptionHistory(profile)
  const hasApprovedException = accessState
    ? accessState.has_approved_exception
    : requests.some((request) =>
        isApprovedStudentIdExceptionStatus(request.status),
      )

  return (
    !!profile?.first_name &&
    !!profile.surname &&
    (profile.role === "admin" ||
      (!!profile.student_id &&
        !!profile.program &&
        !!profile.year_level &&
        (hasIdPhoto(profile) || hasApprovedException)))
  )
}
