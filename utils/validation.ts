/**
 * Client-side validation helpers.
 *
 * IMPORTANT: These mirror the backend rules for fast UX feedback only.
 * The backend (rekados-backend) is ALWAYS the source of truth and re-validates
 * every field server-side.
 */

// Password policy — must match backend: min 12 chars + complexity.
export const PASSWORD_MIN_LENGTH = 12

export interface PasswordRule {
  id: string
  label: string
  test: (value: string) => boolean
}

export const passwordRules: PasswordRule[] = [
  { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (v) => v.length >= PASSWORD_MIN_LENGTH },
  { id: 'lower', label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'upper', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'A symbol (!@#$…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export interface PasswordStrength {
  score: number // 0..4
  label: 'Very weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  passed: number
  total: number
  satisfiedRuleIds: string[]
  isValid: boolean
}

export const evaluatePassword = (value: string): PasswordStrength => {
  const satisfied = passwordRules.filter((r) => r.test(value))
  const passed = satisfied.length
  const total = passwordRules.length
  // Map rule count to a 0..4 score.
  const score = Math.min(4, Math.max(0, passed - 1))
  const labels: PasswordStrength['label'][] = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
  return {
    score,
    label: labels[score] ?? 'Very weak',
    passed,
    total,
    satisfiedRuleIds: satisfied.map((r) => r.id),
    isValid: passed === total,
  }
}

// RFC-5322-lite email check — good enough for UX; backend does the real check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isValidEmail = (value: string): boolean => EMAIL_RE.test(value.trim())

// Lightweight phone check: allows +, spaces, dashes, parentheses; 7-15 digits.
export const isValidPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export const isNonEmpty = (value: string): boolean => value.trim().length > 0

export const minLength = (value: string, n: number): boolean => value.trim().length >= n
