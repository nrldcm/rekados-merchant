/**
 * Philippine mobile number formatting (client-side).
 *
 * Folds the common ways users type a number to canonical E.164:
 *   09171234567 / 9171234567 / 639171234567 / +639171234567 / 00639171234567
 *     → +639171234567
 * Returns null when the input is not a valid PH mobile number. The backend
 * normalizes again as the source of truth; this is for UX + to send +639… .
 */
export function formatPhMobile(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let digits = String(raw).replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)

  let subscriber: string | null = null
  if (digits.startsWith('63') && digits.length === 12) subscriber = digits.slice(2)
  else if (digits.startsWith('0') && digits.length === 11) subscriber = digits.slice(1)
  else if (digits.length === 10) subscriber = digits

  if (!subscriber || subscriber.length !== 10 || !subscriber.startsWith('9')) return null
  return `+63${subscriber}`
}

/** True when the value is / can be folded to a valid PH mobile. */
export function isPhMobile(raw: string | null | undefined): boolean {
  return formatPhMobile(raw) !== null
}
