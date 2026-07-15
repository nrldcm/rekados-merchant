/**
 * Applies the color scheme on EVERY page (including auth pages that don't use
 * the app layout). Default = LIGHT (day) mode; a user's explicit toggle
 * (useColorScheme) persists and takes over.
 */
export default defineNuxtPlugin(() => {
  useColorScheme().init()
})
