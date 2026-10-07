<script setup lang="ts">
/**
 * Registrar una acción **en muchas plantas a la vez**, diciendo antes el alcance exacto: «Se
 * registrará en 31 plantas», con el número que devuelve el servidor y no uno calculado aquí.
 *
 * Los datos de la acción son **los mismos campos que su alta individual** (`ReadingFields`,
 * `InterventionFields`, `CommentFields`): un lote no tiene reglas propias. Con una **lista** de
 * plantas se muestran y se pueden excluir excepciones; con una **consulta** no hay lista que enseñar
 * y se explica; con una **localización** se decide si cuentan sus sublocalizaciones. Sin alcance
 * previo —lo abre así el Dashboard— lo primero que se pide es la localización.
 *
 * Un error no pierde nada: ni lo escrito ni las exclusiones.
 */
import { fromLocalInput, emptyInterventionValues, interventionError, interventionPayload, type InterventionValues } from '@features/timeline/mappers/timeline.mapper'
import { emptyReadingValues, readingInput, type ReadingValues } from '@features/care-records/mappers/readingFields'
import { useLocations } from '@features/locations/composables/useLocations'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import type { LocationSummary } from '@features/locations/types/location.types'
import { useBatch } from '../composables/useBatch'
import { BATCH_ACTION_LABELS, type BatchAction, type BatchActionKind, type BatchPlant, type BatchResult, type BatchScope } from '../types/batch.types'

const props = withDefaults(defineProps<{
  open: boolean
  action: BatchActionKind
  /** A qué plantas se aplica. Sin alcance se pide primero la localización. */
  scope: BatchScope | null
  /** Las plantas, cuando el alcance es una lista: para enseñarlas y poder excluir. */
  plants?: BatchPlant[]
  /** Deja elegir la acción dentro del diálogo (desde una localización o el Dashboard no hay una barra que lo decida). */
  chooseAction?: boolean
  /** Con un alcance de localización, ofrecer si cuentan sus sublocalizaciones; una hoja no tiene a quién preguntar. */
  descendantsChoice?: boolean
}>(), { plants: () => [], chooseAction: false, descendantsChoice: true })

const emit = defineEmits<{ done: [BatchResult], close: [] }>()

const batch = useBatch()
const { loadAll } = useLocations()
const { list: listSoilMixes } = useSoilMixes()

const PAGE_SIZE = 20

const reading = ref<ReadingValues>(emptyReadingValues())
const intervention = ref<InterventionValues>(emptyInterventionValues())
const commentText = ref('')
const occurredAt = ref('')
const localError = ref('')
const mixError = ref('')
const commentError = ref('')
const listPage = ref(0)
const locations = ref<LocationSummary[]>([])
const soilMixes = ref<{ id: string, name: string }[]>([])
const chosenLocation = ref('')
const current = ref<BatchActionKind>(props.action)

const ACTION_CHOICES = [
  { value: 'reading', label: 'Lectura' },
  { value: 'intervention', label: 'Intervención' },
  { value: 'comment', label: 'Comentario' },
]

// El alcance se compara por su contenido, no por su identidad: un padre que lo escribe en su plantilla
// crea un objeto nuevo en cada repintado, y eso no debe reiniciar un diálogo a medias.
watch(() => [props.open, JSON.stringify(props.scope), props.action] as const, async ([open]) => {
  if (!open) return
  reading.value = emptyReadingValues()
  intervention.value = emptyInterventionValues()
  commentText.value = ''
  occurredAt.value = ''
  localError.value = ''
  mixError.value = ''
  commentError.value = ''
  listPage.value = 0
  chosenLocation.value = ''
  current.value = props.action
  await batch.open(props.scope)

  if (props.scope === null) {
    const result = await loadAll()
    if (result.success) locations.value = result.data!.filter((location) => location.plantCountTotal > 0)
  }
}, { immediate: true })

// Las mezclas solo hacen falta para una intervención: se piden la primera vez que se muestra.
watch(() => [props.open, current.value] as const, async ([open, action]) => {
  if (!open || action !== 'intervention' || soilMixes.value.length) return
  const result = await listSoilMixes()
  if (result.success) soilMixes.value = result.data!.content.map((mix) => ({ id: mix.id, name: mix.name }))
}, { immediate: true })

const scopeKind = computed(() => batch.scope.value?.kind ?? null)
const locationScope = computed(() => (batch.scope.value?.kind === 'location' ? batch.scope.value : null))
const descendants = computed(() => locationScope.value?.includeDescendants ?? false)

const pages = computed(() => Math.max(1, Math.ceil(props.plants.length / PAGE_SIZE)))
const visiblePlants = computed(() => props.plants.slice(listPage.value * PAGE_SIZE, (listPage.value + 1) * PAGE_SIZE))

const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: `${location.path || location.name} · ${location.plantCountTotal}`,
})))

async function chooseLocation(id: string) {
  chosenLocation.value = id
  if (id) await batch.chooseLocation(id, true)
}

function buildAction(): BatchAction | null {
  localError.value = ''
  mixError.value = ''
  commentError.value = ''

  if (current.value === 'reading') {
    const values = readingInput(reading.value)
    if (!Object.keys(values).length) {
      localError.value = 'Informa al menos un valor para registrar la lectura.'
      return null
    }
    return { kind: 'reading', reading: values }
  }

  if (current.value === 'intervention') {
    mixError.value = interventionError(intervention.value)
    if (mixError.value) return null
    return { kind: 'intervention', intervention: interventionPayload(intervention.value) }
  }

  if (!commentText.value.trim()) {
    commentError.value = 'El comentario no puede estar vacío.'
    return null
  }
  return { kind: 'comment', comment: { text: commentText.value.trim() } }
}

async function confirm() {
  if (!batch.canConfirm.value) return
  const action = buildAction()
  if (!action) return

  const done = await batch.apply(action, fromLocalInput(occurredAt.value))
  if (done) emit('done', done)
}

const shownError = computed(() => localError.value || batch.error.value)
const plural = (count: number) => `${count} ${count === 1 ? 'planta' : 'plantas'}`
const labels = computed(() => BATCH_ACTION_LABELS[current.value])

function changeAction(next: string) {
  current.value = next as BatchActionKind
  localError.value = ''
  mixError.value = ''
  commentError.value = ''
}
</script>

<template>
  <UiDialog
    :open="open"
    :title="labels.title"
    subtitle="Aplicar a varias plantas"
    data-test="batch-dialog"
    @close="emit('close')"
  >
    <UiInlineError v-if="shownError" data-test="batch-error">{{ shownError }}</UiInlineError>

    <form class="batch" data-test="batch-form" @submit.prevent="confirm">
      <div v-if="chooseAction" data-test="batch-action-choice">
        <UiSegmentedControl label="Qué registrar" :options="ACTION_CHOICES" :model-value="current" @update:model-value="changeAction" />
      </div>

      <section aria-labelledby="batch-scope-title" data-test="batch-scope">
        <h3 id="batch-scope-title">Plantas afectadas</h3>

        <UiField
          v-if="scope === null"
          :model-value="chosenLocation"
          label="Localización"
          as="select"
          placeholder="Elige dónde aplicarlo"
          :options="locationOptions"
          help="Se aplicará a las plantas en curso que haya en ella."
          data-test="batch-location"
          @update:model-value="chooseLocation(String($event))"
        />

        <UiCheckboxPanel
          v-if="locationScope && descendantsChoice"
          :model-value="descendants"
          title="Incluir las sublocalizaciones"
          description="Cuenta también lo que hay dentro de cada una."
          data-test="batch-descendants"
          @update:model-value="batch.setDescendants($event)"
        />

        <p v-if="batch.previewing.value" role="status" data-test="batch-calculating">Calculando el alcance…</p>
        <p v-else-if="batch.count.value !== null" class="batch__count" data-test="batch-count" aria-live="polite">
          Se registrará en <strong>{{ plural(batch.count.value) }}</strong>.
        </p>
        <p v-if="batch.count.value === 0 && !batch.previewing.value" class="batch__empty" data-test="batch-empty">
          El alcance está vacío: no afectaría a ninguna planta.
        </p>

        <ul v-if="scopeKind === 'plants' && plants.length" class="batch__plants">
          <li v-for="plant in visiblePlants" :key="plant.id" :class="{ 'is-excluded': batch.excluded.has(plant.id) }">
            <label>
              <input
                type="checkbox"
                :checked="batch.excluded.has(plant.id)"
                :aria-label="`Excluir ${plant.code}`"
                data-test="exclude-plant"
                @change="batch.toggle(plant.id)"
              >
              <span class="batch__what">
                <code>{{ plant.code }}</code>
                <strong>{{ plant.nickname }}</strong>
                <small v-if="plant.detail">{{ plant.detail }}</small>
              </span>
              <span class="batch__flag">{{ batch.excluded.has(plant.id) ? 'Excluida' : 'Se incluye' }}</span>
            </label>
          </li>
        </ul>
        <UiPagination
          v-if="scopeKind === 'plants'"
          :page="listPage"
          :total-pages="pages"
          label="Páginas del alcance"
          @update:page="listPage = $event"
        />
        <p v-if="scopeKind === 'query'" class="batch__note" data-test="batch-query-note">
          El alcance es todo el resultado del filtro. Para dejar plantas fuera, selecciona una a una.
        </p>
      </section>

      <section aria-labelledby="batch-data-title" data-test="batch-data">
        <h3 id="batch-data-title">{{ labels.verb }} en cada una</h3>

        <ReadingFields v-if="current === 'reading'" v-model="reading" />
        <InterventionFields v-else-if="current === 'intervention'" v-model="intervention" :soil-mixes="soilMixes" :mix-error="mixError" />
        <CommentFields v-else v-model="commentText" :error="commentError" />

        <UiField
          v-model="occurredAt"
          label="Fecha"
          type="datetime-local"
          help="Opcional. Si la dejas vacía, se anota ahora."
          data-test="batch-date"
        />
        <p class="batch__note" data-test="batch-same">
          El mismo registro se aplica a todas las plantas incluidas. Si una necesita un dato distinto,
          exclúyela y regístrala aparte.
        </p>
      </section>
    </form>

    <template #footer>
      <UiButton variant="secondary" data-test="batch-cancel" @click="emit('close')">Cancelar</UiButton>
      <UiButton
        :disabled="!batch.canConfirm.value"
        :busy="batch.applying.value"
        data-test="batch-confirm"
        @click="confirm"
      >
        {{ labels.title }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.batch {
  display: grid;
  gap: var(--space-5);
}

h3 {
  font-size: var(--font-size-14);
  margin: 0 0 var(--space-2);
}

.batch__count,
.batch__note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-2);
}

.batch__count strong {
  color: var(--color-ink);
}

.batch__empty {
  color: var(--color-danger);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-2);
}

.batch__plants {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
}

.batch__plants label {
  align-items: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-2) var(--space-3);
}

.batch__plants .is-excluded label {
  background: var(--color-surface-muted);
  color: var(--color-ink-muted);
}

.batch__what code,
.batch__what strong,
.batch__what small {
  display: block;
}

.batch__what code {
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
}

.batch__what small,
.batch__flag {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}
</style>
