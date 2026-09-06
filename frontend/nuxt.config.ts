import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  // Las dos únicas hojas globales del sistema de diseño (ADR-014).
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],
  // Rutas absolutas y no `~/...`: el alias se copia tal cual a los `paths` de los tsconfig
  // generados, y ahí una ruta no relativa sin `baseUrl` tumba el typecheck (ADR-015).
  alias: {
    '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
    '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    '@ui': fileURLToPath(new URL('./app/components/ui', import.meta.url)),
  },

  // Los componentes de dominio viven en su feature; Nuxt no los busca ahí por convención.
  // `~` es `app/` (srcDir por defecto en Nuxt 4) y `~~` es la raíz, donde cuelga `src/`.
  components: [
    { path: '~/components', pathPrefix: false },
    { path: '~~/src/features', pathPrefix: false, pattern: '**/components/**/*.vue' },
  ],

  // `getApiClient` se auto-importa como se auto-importaba `useApi`: es el seam que los tests
  // doblan con `mockNuxtImport`, y moverlo a `src/` no debe obligarles a conocer el módulo.
  imports: {
    dirs: [fileURLToPath(new URL('./src/shared/services', import.meta.url))],
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
    },
  },
})
