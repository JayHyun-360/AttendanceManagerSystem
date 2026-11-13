export type StudentIdExceptionStatus =
  | "pending"
  | "temporarily_approved"
  | "resolved_by_photo"

export type StudentIdException = {
  status: StudentIdExceptionStatus

  requested_at?: string | null

  approved_by?: string | null

  approved_at?: string | null

  attendance_eligible_from?: string | null

  continued_at?: string | null
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

export function getStudentIdException(
  profile: ProfileCompletionFields | null | undefined,
): StudentIdException | null {
  const relation = profile?.student_id_exception_requests
  const request = Array.isArray(relation) ? relation[0] : relation

  if (
    !request ||
    !["pending", "temporarily_approved", "resolved_by_photo"].includes(
      request.status,
    )
  ) {
    return null
  }

  return request
}

export function hasUnacknowledgedIdException(
  profile: ProfileCompletionFields | null | undefined,
) {
  const request = getStudentIdException(profile)

  return (
    request?.status === "temporarily_approved" && !request.continued_at
  )
}

export function isProfileComplete(
  profile: ProfileCompletionFields | null | undefined,
) {
  const exception = getStudentIdException(profile)

  return (
    !!profile?.first_name &&
    !!profile.surname &&
    (profile.role === "admin" ||
      (!!profile.student_id &&
        !!profile.program &&
        !!profile.year_level &&
        (!!profile.id_photo_url ||
          exception?.status === "temporarily_approved")))
  )
}
