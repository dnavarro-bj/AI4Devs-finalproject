import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

// Entorno Nuxt (decisión 3 del design): los tests montan componentes y páginas con el cliente
// HTTP doblado, sin levantar el backend.
export default defineVitestConfig({
  // Los mismos aliases que `nuxt.config.ts`. Desincronizarlos da un fallo de resolución confuso.
  resolve: {
    alias: {
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@ui': fileURLToPath(new URL('./app/components/ui', import.meta.url)),
    },
  },
  test: {
    // Los tests de service y composable viven junto a su feature (ADR-015); los de pantalla y kit
    // siguen en `test/`.
    include: ['test/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    environment: 'nuxt',
    environmentOptions: {
      nuxt: { domEnvironment: 'happy-dom' },
    },
  },
})
