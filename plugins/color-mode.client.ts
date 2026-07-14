/**
 * Applies the color scheme on EVERY page (including auth pages that don't use
 * the app layout). Default = follow the OS preference; a user's explicit toggle
 * (useColorScheme) persists and takes over. Also follows live OS changes while
 * no explicit choice has been made.
 */
export default defineNuxtPlugin(() => {
  const { init } = useColorScheme()
  init()
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
  mql?.addEventListener?.('change', () => {
    try {
      if (!localStorage.getItem('rekados-merchant:color-scheme')) init()
    } catch {
      init()
    }
  })
})
