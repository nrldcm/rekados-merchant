// @ts-check
// Flat config that consumes Nuxt's generated ESLint config (@nuxt/eslint module).
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
  },
})
