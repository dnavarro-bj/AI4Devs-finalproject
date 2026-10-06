<script setup lang="ts">
/**
 * El historial de cambios de estado de un ejemplar, del más reciente al más antiguo (el orden lo
 * pone el API). Cada cambio con su fecha, de qué estado a cuál y su motivo.
 *
 * **No bloquea la ficha**: si falla, lo dice aquí y la planta se ve igual. `version` es lo que lo
 * refresca: la ficha lo incrementa tras un cambio de estado, y así no hace falta que este componente
 * conozca el diálogo.
 */
import { usePlants } from '../composables/usePlants'
import { STATUS_LABELS } from '../mappers/plantProfile'
import type { PlantStatusChange } from '../types/plant.types'

const props = withDefaults(defineProps<{ plantId: string, version?: number }>(), { version: 0 })

const { statusChanges } = usePlants()

const changes = ref<PlantStatusChange[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const result = await statusChanges(props.plantId)
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }
  changes.value = result.data!.content
}

// Ya montado, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(load)
watch(() => props.version, load)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <section class="status-history" aria-label="Historial de cambios de estado">
    <p v-if="loading" role="status">Cargando el historial…</p>
    <UiInlineError v-else-if="error" data-test="history-error">{{ error }}</UiInlineError>
    <p v-else-if="!changes.length" class="status-history__none" data-test="no-changes">
      Este ejemplar no ha cambiado de estado desde que se dio de alta.
    </p>
    <ol v-else>
      <li v-for="change in changes" :key="change.id" data-test="status-change">
        <time :datetime="change.occurredAt">{{ formatDate(change.occurredAt) }}</time>
        <span>
          <strong>{{ STATUS_LABELS[change.fromStatus] }}</strong>
          <span aria-hidden="true"> → </span><span class="sr-only"> pasó a </span>
          <strong>{{ STATUS_LABELS[change.toStatus] }}</strong>
        </span>
        <small v-if="change.reason">{{ change.reason }}</small>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.status-history ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

.status-history li {
  border-top: 1px solid var(--color-line);
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2) 0;
}

.status-history time,
.status-history small,
.status-history__none {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}
</style>
