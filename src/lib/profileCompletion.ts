type ProfileCompletionFields = {
  first_name?: string | null

  surname?: string | null

  role?: string | null

  student_id?: string | null

  program?: string | null

  year_level?: string | null
}

export function isProfileComplete(
  profile: ProfileCompletionFields | null | undefined,
) {
  return (
    !!profile?.first_name &&
    !!profile.surname &&
    (profile.role === "admin" ||
      (!!profile.student_id && !!profile.program && !!profile.year_level))
  )
}
