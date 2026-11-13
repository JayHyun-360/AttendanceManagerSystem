const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",

  "tempmail.com",

  "10minutemail.com",

  "guerrillamail.com",
])

interface ValidEmailResult {
  isValid: true
  normalizedEmail: string
}

interface InvalidEmailResult {
  isValid: false
  error: string
}

type EmailValidationResult = ValidEmailResult | InvalidEmailResult

export function validateEmail(email: string): EmailValidationResult {
  const normalizedEmail = email.trim().toLowerCase()

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(normalizedEmail)) {
    return { isValid: false, error: "Please enter a valid email address." }
  }

  const domain = normalizedEmail.split("@")[1]

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,

      error: "Please use a non-disposable email address.",
    }
  }

  return { isValid: true, normalizedEmail }
}
