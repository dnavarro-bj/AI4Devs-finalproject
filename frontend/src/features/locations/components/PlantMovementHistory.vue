<script setup lang="ts">
/**
 * Los movimientos de un ejemplar entre localizaciones, del más reciente al más antiguo (el orden
 * lo pone el API): de dónde a dónde y cuándo.
 *
 * **No bloquea la ficha**: si falla, lo dice aquí y la planta se ve igual. Que el movimiento salga
 * también en la cronología unificada del ejemplar es de **T-20** y se declara en la pantalla.
 */
import { useLocations } from '../composables/useLocations'
import PlantMovementList from './PlantMovementList.vue'
import type { PlantMovement } from '../types/location.types'

const props = defineProps<{ plantId: string }>()

const { plantMovements } = useLocations()

const movements = ref<PlantMovement[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const result = await plantMovements(props.plantId)
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }
  movements.value = result.data!.content
}

// Ya montado, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(load)
</script>

<template>
  <section class="movement-history" aria-label="Historial de movimientos">
    <p v-if="loading" role="status">Cargando los movimientos…</p>
    <UiInlineError v-else-if="error" data-test="movements-error">{{ error }}</UiInlineError>
    <p v-else-if="!movements.length" class="movement-history__none" data-test="no-movements">
      Este ejemplar no se ha movido desde que se dio de alta.
    </p>
    <PlantMovementList v-else :movements="movements" />
  </section>
</template>

<style scoped>
.movement-history__none {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

</style>
