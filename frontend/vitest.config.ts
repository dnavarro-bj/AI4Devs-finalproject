import { defineVitestConfig } from '@nuxt/test-utils/config'

// Entorno Nuxt (decisión 3 del design): los tests montan componentes y páginas con el cliente
// HTTP doblado, sin levantar el backend.
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: { domEnvironment: 'happy-dom' },
    },
  },
})
