/** Shared display formatters for the merchant console. */
export function useFormat() {
  const peso = (v: number | string | null | undefined): string => {
    const n = Number(v ?? 0)
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  const qty = (v: number | string | null | undefined): string => {
    const n = Number(v ?? 0)
    return n.toLocaleString('en-PH', { maximumFractionDigits: 3 })
  }
  const date = (v: string | Date | null | undefined): string => {
    if (!v) return '—'
    const d = new Date(v)
    return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
  }
  const day = (v: string | Date | null | undefined): string => {
    if (!v) return '—'
    return new Date(v).toLocaleDateString('en-PH', { dateStyle: 'medium' })
  }
  return { peso, qty, date, day }
}
