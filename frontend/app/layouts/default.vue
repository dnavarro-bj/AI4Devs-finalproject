<script setup lang="ts">
/**
 * El armazón de la aplicación (ADR-014): navegación lateral, barra superior con los breadcrumbs de
 * la pantalla y contenido con ancho máximo. Vive en un layout y no en `app.vue` para que la
 * galería del kit pueda no llevarlo, sin condicionales aquí dentro.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { NAVIGATION } from '@features/layout/navigation'
import { useGlobalSearch } from '@features/search/composables/useGlobalSearch'
import type { SearchResult } from '@features/search/types/search.types'

const { breadcrumbs, clear } = useBreadcrumbs()

const route = useRoute()
const router = useRouter()

const navigationOpen = ref(false)

// La búsqueda la orquesta su feature; el armazón solo la aloja y navega al resultado elegido.
const { query, groups: searchGroups, clear: clearSearch } = useGlobalSearch()

function openResult(result: Pick<SearchResult, 'to'>) {
  clearSearch()
  router.push(result.to)
}

// Ninguna pantalla hereda los breadcrumbs de la anterior: se limpian antes de que la nueva monte
// y los fije.
router.afterEach(() => {
  clear()
  navigationOpen.value = false
})
</script>

<template>
  <div class="shell">
    <aside
      class="sidebar"
      data-role="sidebar"
      :data-open="String(navigationOpen)"
      aria-label="Navegación lateral"
    >
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">C</span>
        <NuxtLink to="/plants">Cactify</NuxtLink>
        <UiButton
          class="only-narrow"
          variant="icon"
          label="Cerrar navegación"
          @click="navigationOpen = false"
        >
          ×
        </UiButton>
      </div>

      <nav aria-label="Navegación principal">
        <UiNavGroup
          v-for="group in NAVIGATION"
          :key="group.label"
          :label="group.label"
          :entries="group.entries"
          :active-path="route.path"
        />
      </nav>
    </aside>

    <div class="main">
      <header class="topbar">
        <UiButton
          class="only-narrow"
          variant="icon"
          label="Abrir navegación"
          @click="navigationOpen = true"
        >
          ☰
        </UiButton>
        <UiBreadcrumbs v-if="breadcrumbs.length" :items="[...breadcrumbs]" />
        <UiGlobalSearch v-model="query" :groups="searchGroups" @select="openResult" />
      </header>

      <main class="content">
        <slot />
      </main>
    </div>

    <UiToastHost />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.sidebar {
  background: var(--color-sidebar);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  height: 100vh;
  left: 0;
  position: fixed;
  top: 0;
  width: var(--sidebar-width);
  z-index: 50;
}

.brand {
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--color-sidebar-text) 10%, transparent);
  display: flex;
  gap: var(--space-3);
  min-height: var(--topbar-height);
  padding: 0 var(--space-4);
}

.brand a {
  color: var(--color-sidebar-text);
  font-size: var(--font-size-17);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-right: auto;
  text-decoration: none;
  text-transform: uppercase;
}

.brand-mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: 50% 50% 42% 42%;
  color: var(--color-sidebar);
  display: flex;
  font-weight: 800;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.sidebar nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

.main {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
}

.topbar {
  align-items: center;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-4);
  height: var(--topbar-height);
  padding: 0 var(--space-8);
  position: sticky;
  top: 0;
  z-index: 30;
}

/* El buscador ocupa el hueco sobrante y queda a la derecha de los breadcrumbs. */
.topbar :deep(.global-search) {
  margin-left: auto;
}

.content {
  margin: 0 auto;
  max-width: var(--content-max);
  padding: var(--space-8);
}

.only-narrow {
  display: none;
}

@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform var(--duration-page) var(--ease-standard);
  }

  .sidebar[data-open="true"] {
    box-shadow: var(--shadow-overlay);
    transform: translateX(0);
  }

  .main {
    margin-left: 0;
  }

  .topbar {
    padding: 0 var(--space-4);
  }

  .content {
    padding: var(--space-5) var(--space-4);
  }

  .only-narrow {
    display: inline-flex;
  }
}
</style>
