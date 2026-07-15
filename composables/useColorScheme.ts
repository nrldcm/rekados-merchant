/**
 * Lightweight dark-mode toggle. Persists the user's choice in localStorage
 * (a UI preference only — no PII, no tokens) and toggles the `dark` class on
 * <html> so Tailwind's `darkMode: 'class'` responds.
 */
export type ColorScheme = 'light' | 'dark'

const STORAGE_KEY = 'rekados-merchant:color-scheme'

export const useColorScheme = () => {
  const scheme = useState<ColorScheme>('color-scheme', () => 'light')

  const apply = (value: ColorScheme) => {
    scheme.value = value
    if (import.meta.client) {
      const root = document.documentElement
      root.classList.toggle('dark', value === 'dark')
      try {
        localStorage.setItem(STORAGE_KEY, value)
      } catch {
        // ignore storage failures (private mode, etc.)
      }
    }
  }

  const init = () => {
    if (!import.meta.client) return
    let saved: ColorScheme | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY) as ColorScheme | null
    } catch {
      saved = null
    }
    // Default to LIGHT (day) mode; honour an explicit saved choice only.
    apply(saved ?? 'light')
  }

  const toggle = () => apply(scheme.value === 'dark' ? 'light' : 'dark')

  return { scheme, init, toggle, apply }
}
