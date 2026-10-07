<script setup lang="ts">
/**
 * Mover un lote de ejemplares: elegir el destino y **ver el alcance antes de confirmar**.
 *
 * El diálogo no mueve nada: declara cuántos ejemplares se moverán, desde dónde y hacia dónde, y
 * emite el destino cuando se confirma. Quien llama hace la operación y decide qué pasa con la
 * selección si falla. El destino **no puede ser la localización de origen**: no sería un movimiento.
 */
import { useLocations } from '../composables/useLocations'
import { locationOptions } from '../mappers/locationTree'
import type { LocationSummary } from '../types/location.types'

const props = withDefaults(defineProps<{
  open: boolean
  /** Cuántos ejemplares se van a mover. */
  count: number
  /** La localización desde la que se selecciona: no se ofrece como destino. */
  originId: string
  originName: string
  busy?: boolean
  error?: string | null
}>(), { busy: false, error: null })

const emit = defineEmits<{ close: [], confirm: [destinationId: string] }>()

const { loadAll } = useLocations()

const locations = ref<LocationSummary[]>([])
const loadError = ref<string | null>(null)
const query = ref('')
const destinationId = ref<string | undefined>(undefined)

// Se piden al abrir y no antes: el diálogo vive en la ficha aunque nadie lo abra.
watch(() => props.open, async (open) => {
  if (!open) return
  destinationId.value = undefined
  query.value = ''
  loadError.value = null

  const result = await loadAll()
  if (!result.success) {
    loadError.value = result.error!.message
    return
  }
  locations.value = result.data!
}, { immediate: true })

const options = computed(() => locationOptions(locations.value, new Set([props.originId])))
const destination = computed(() => locations.value.find((location) => location.id === destinationId.value) ?? null)
const noun = computed(() => (props.count === 1 ? 'ejemplar' : 'ejemplares'))

function confirm() {
  if (destination.value) emit('confirm', destination.value.id)
}
</script>

<template>
  <UiDialog
    :open="open"
    title="Mover ejemplares"
    subtitle="Elige la localización de destino. Cada movimiento deja constancia de dónde estaba el ejemplar, dónde está y cuándo cambió."
    data-test="move-dialog"
    @close="emit('close')"
  >
    <UiInlineError v-if="loadError" data-test="move-load-error">{{ loadError }}</UiInlineError>

    <UiEntityPicker
      v-model="destinationId"
      v-model:query="query"
      label="Destino"
      placeholder="Buscar por nombre, código o ruta"
      empty-message="No hay otra localización a la que mover."
      :options="options"
    />

    <p v-if="destination" class="move-scope" data-test="move-scope" role="status">
      Se moverán <strong>{{ count }} {{ noun }}</strong> de <strong>{{ originName }}</strong>
      a <strong>{{ destination.path }}</strong>.
    </p>
    <p v-else class="move-scope move-scope--pending" data-test="move-scope">
      Elige un destino para ver cuántos ejemplares se moverán.
    </p>

    <UiInlineError v-if="error" data-test="move-error">{{ error }}</UiInlineError>

    <template #footer>
      <UiButton variant="secondary" data-test="cancel-move" @click="emit('close')">Cancelar</UiButton>
      <UiButton :disabled="!destination || busy" data-test="confirm-move" @click="confirm">
        {{ busy ? 'Moviendo…' : `Mover ${count} ${noun}` }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.move-scope {
  background: var(--color-brand-soft);
  border-left: 4px solid var(--color-brand);
  border-radius: 4px var(--radius-md) var(--radius-md) 4px;
  color: var(--color-brand-strong);
  font-size: var(--font-size-13);
  margin: var(--space-3) 0 0;
  padding: var(--space-3) var(--space-4);
}

.move-scope--pending {
  background: var(--color-surface-muted);
  border-left-color: var(--color-line-strong);
  color: var(--color-ink-muted);
}
</style>
