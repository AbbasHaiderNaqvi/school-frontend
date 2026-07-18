// Shared field-validation helpers. Every form in the app is plain useState + inline
// <Alert>/inline field errors (no schema library) — these return a ready-to-render
// error string (or undefined when valid) so pages can do:
//   const errors: Record<string, string> = {}
//   const emailErr = emailError(form.email)
//   if (emailErr) errors.email = emailErr

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Loose international phone check: optional leading +, 7-15 digits, spaces/dashes allowed.
export const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,14}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value.trim())
}

// Number inputs can still hold '', '-', or 'e' as intermediate typing states even with
// type="number" — this guards submit-time against anything that isn't a real finite number.
export function isValidNumber(value: string): boolean {
  if (value.trim() === '') return false
  return Number.isFinite(Number(value))
}

export function emailError(value: string, required = true): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return required ? 'Email is required.' : undefined
  return isValidEmail(trimmed) ? undefined : 'Enter a valid email address.'
}

export function phoneError(value: string, required = true): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return required ? 'Phone number is required.' : undefined
  return isValidPhone(trimmed) ? undefined : 'Enter a valid phone number.'
}

export function numberError(
  value: string,
  opts: { required?: boolean; min?: number; max?: number; label?: string } = {},
): string | undefined {
  const { required = false, min, max, label = 'Value' } = opts
  const trimmed = value.trim()
  if (!trimmed) return required ? `${label} is required.` : undefined
  if (!isValidNumber(trimmed)) return `${label} must be a number.`
  const num = Number(trimmed)
  if (min !== undefined && num < min) return `${label} must be at least ${min}.`
  if (max !== undefined && num > max) return `${label} must be at most ${max}.`
  return undefined
}

export function requiredError(value: string, label = 'This field'): string | undefined {
  return value.trim() ? undefined : `${label} is required.`
}

/** True only when every value in the errors map is undefined. */
export function hasNoErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).every(v => !v)
}
