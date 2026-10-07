<script setup lang="ts">
/**
 * La ficha de una planta: el centro operativo del ejemplar.
 *
 * Compuesta sobre el kit —`UiTabs`, `UiSummaryGrid`, `UiTimeline`, `UiDialog`, `UiPanel`— siguiendo
 * la pantalla `plant-detail` del wireframe de administración.
 *
 * **Híbrida a propósito.** Lo que el API sirve es real: la planta, su especie, su localización, sus
 * tags, los cuidados heredados y su **cronología unificada** (T-20: lecturas, estados, movimientos,
 * comentarios, intervenciones y floraciones). Lo que no existe todavía —tareas, avisos— sale de
 * `mocks/plantDetail.mock.ts` y **se marca en la pantalla**, no solo en el código.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantDetail } from '@features/plants/types/plant.types'
import { usePlantHistory } from '@features/care-records/composables/usePlantHistory'
import type { CareRecord } from '@features/care-records/types/careRecord.types'
import { plantGlance } from '@features/plants/composables/plantGlance'
import { ORIGIN_LABELS, germinationLabel } from '@features/plants/mappers/plantProfile'
import { useOnVisible } from '@shared/composables/useOnVisible'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { MOCK_NOTICE, MOCK_TASKS } from '@features/plants/mocks/plantDetail.mock'
import { usePlantTimeline } from '@features/timeline/composables/usePlantTimeline'
import { usePlantBlooms } from '@features/timeline/composables/usePlantBlooms'
import { TIMELINE_KIT_TYPES, toEvent } from '@features/timeline/mappers/timeline.mapper'
import type { EventInput, EventResource, TimelineEntry } from '@features/timeline/types/timeline.types'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'

const route = useRoute()
const plantId = String(route.params.id)
const { detail } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()
const history = usePlantHistory()
const timeline = usePlantTimeline(plantId)
const moreSentinel = ref<HTMLElement | null>(null)
// Scroll infinito: al llegar al final se pide la página siguiente; un fallo no se reintenta solo.
useOnVisible(moreSentinel, () => {
  if (!timeline.error.value) timeline.loadMore()
})
const blooms = usePlantBlooms(plantId)
const { list: listSoilMixes } = useSoilMixes()

const plant = ref<PlantDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const tab = ref('resumen')
const readingOpen = ref(false)
const statusOpen = ref(false)
/** Se incrementa tras cada cambio de estado: es lo que refresca el historial de la pestaña de datos. */
const historyVersion = ref(0)
const today = useReferenceDate()

function onStatusChanged(updated: PlantDetail) {
  plant.value = updated
  statusOpen.value = false
  historyVersion.value += 1
  // El cambio de estado aparece en la cronología sin recargar la ficha.
  timeline.reload()
}

const germination = computed(() => plant.value
  ? germinationLabel(plant.value.germinationYear, plant.value.germinationMonth, Number(today.value.slice(0, 4)))
  : null)

const acquired = computed(() => plant.value?.acquiredOn
  ? new Date(`${plant.value.acquiredOn}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  : null)
const noticeDismissed = ref(false)

/*
 * Mientras la planta carga, el último nivel es neutro: no se inventa un nombre ni se deja el
 * hueco saltando de sitio cuando llega el dato (ADR-013, los datos llegan ya montada la página).
 */
setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: 'Planta' }])

onMounted(async () => {
  const result = await detail(plantId)
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }

  plant.value = result.data!
  setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: plant.value.nickname }])
  // Ni el historial ni las floraciones bloquean la ficha: si fallan, la planta se ve igual.
  history.load(plantId)
  timeline.load()
  blooms.load()
})

/** La lectura recién registrada entra en la cronología sin recargar. */
function onRegistered(record: CareRecord) {
  history.prepend(record)
  readingOpen.value = false
  timeline.reload()
}

const timelineEvents = computed(() => timeline.entries.value.map(toEvent))
const entryById = computed(() => new Map(timeline.entries.value.map((entry) => [entry.id, entry])))

/**
 * «De un vistazo»: riego y medición salen de lecturas reales y la última floración de las
 * observadas; solo la tarea es maqueta y va marcada. `now` se pasa aquí y no dentro, para que la
 * función sea determinista y testeable.
 */
const glance = computed(() => plantGlance(history.records.value, new Date().toISOString(), blooms.last.value))

/*
 * Comentarios, intervenciones y floraciones: un solo diálogo abierto a la vez. `source` dice quién
 * guarda —la cronología o la pestaña de floraciones— para que la otra se entere.
 */
type DialogKind = 'comment' | 'intervention' | 'bloom' | 'remove'
interface DialogState {
  kind: DialogKind
  source: 'timeline' | 'blooms'
  entry?: TimelineEntry
  closing?: boolean
}

const RESOURCE_OF: Record<string, EventResource> = {
  comentario: 'comments', intervencion: 'interventions', floracion: 'blooms',
}
const WHAT_OF: Record<string, string> = {
  comentario: 'el comentario', intervencion: 'la intervención', floracion: 'la floración',
}

const addOpen = ref(false)
const dialog = ref<DialogState | null>(null)
const saving = ref(false)
const dialogError = ref<string | null>(null)
const soilMixes = ref<{ id: string, name: string }[]>([])

function openDialog(state: DialogState) {
  dialogError.value = null
  addOpen.value = false
  dialog.value = state
  if (state.kind === 'intervention' && !soilMixes.value.length) {
    listSoilMixes().then((result) => {
      if (result.success) soilMixes.value = result.data?.content ?? []
    })
  }
}

const closeDialog = () => { dialog.value = null }

function editEntry(entry: TimelineEntry, source: DialogState['source'] = 'timeline', closing = false) {
  const kind = ({ comentario: 'comment', intervencion: 'intervention', floracion: 'bloom' } as const)[entry.type as 'comentario']
  if (kind) openDialog({ kind, source, entry, closing })
}

const removeEntry = (entry: TimelineEntry, source: DialogState['source'] = 'timeline') =>
  openDialog({ kind: 'remove', source, entry })

/** Lo que cambia en un lado se refleja en el otro: la pestaña y la cronología cuentan lo mismo. */
async function afterChange(source: DialogState['source']) {
  if (source === 'timeline') await blooms.load()
  else await timeline.reload()
}

async function submitDialog(resource: EventResource, input: EventInput) {
  const current = dialog.value!
  saving.value = true
  dialogError.value = null
  const result = current.source === 'blooms'
    ? await blooms.save(input as never, current.entry?.id)
    : await timeline.save(resource, input, current.entry?.id)
  saving.value = false

  if (!result.success) {
    dialogError.value = result.error!.message
    return
  }
  await afterChange(current.source)
  closeDialog()
}

async function confirmRemove() {
  const current = dialog.value!
  const entry = current.entry!
  saving.value = true
  dialogError.value = null
  const result = current.source === 'blooms'
    ? await blooms.remove(entry.id)
    : await timeline.remove(RESOURCE_OF[entry.type]!, entry.id)
  saving.value = false

  if (!result.success) {
    dialogError.value = result.error!.message
    return
  }
  await afterChange(current.source)
  closeDialog()
}
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la planta…</p>

    <div v-else-if="error" class="not-found">
      <UiInlineError title="No se ha podido abrir la planta" data-test="error">
        {{ error }}
        <template #action>
          <UiButton variant="secondary" to="/plants" data-test="back-to-inventory">
            Volver al inventario
          </UiButton>
        </template>
      </UiInlineError>
    </div>

    <template v-else-if="plant">
      <PlantHeader :plant="plant" @register-reading="readingOpen = true" @change-status="statusOpen = true" />

      <UiNotice
        v-if="!noticeDismissed"
        severity="warning"
        :title="MOCK_NOTICE.title"
        data-mock="true"
        dismissible
        @dismiss="noticeDismissed = true"
      >
        {{ MOCK_NOTICE.body }} <em>(dato de ejemplo hasta T-23)</em>
      </UiNotice>

      <UiTabs
        v-model="tab"
        :tabs="[
          { value: 'resumen', label: 'Resumen e historial' },
          { value: 'fotografias', label: 'Fotografías' },
          { value: 'floracion', label: 'Floración', count: blooms.total.value || undefined },
          { value: 'datos', label: 'Datos' },
        ]"
      />

      <div v-if="tab === 'resumen'" class="plant-layout">
        <div>
          <UiSummaryGrid eyebrow="Estado actual" title="De un vistazo" :items="glance">
            <template #action>
              <UiButton variant="text" :to="`/plants/${plant.id}/edit`">Editar datos</UiButton>
            </template>
          </UiSummaryGrid>

          <UiPanel title="Historial completo" class="history">
            <template #action>
              <div class="history__actions">
                <small v-if="!timeline.loading.value && !timeline.error.value" data-test="timeline-total">
                  {{ timeline.total.value === 1 ? '1 registro' : `${timeline.total.value} registros` }}
                </small>
                <UiButton variant="secondary" data-test="add-event" :aria-expanded="addOpen" @click="addOpen = !addOpen">＋ Añadir</UiButton>
              </div>
            </template>

            <div v-if="addOpen" class="history__add" role="group" aria-label="Qué añadir" data-test="add-menu">
              <UiButton variant="text" data-test="add-comment" @click="openDialog({ kind: 'comment', source: 'timeline' })">Comentario</UiButton>
              <UiButton variant="text" data-test="add-intervention" @click="openDialog({ kind: 'intervention', source: 'timeline' })">Intervención</UiButton>
              <UiButton variant="text" data-test="add-bloom-event" @click="openDialog({ kind: 'bloom', source: 'timeline' })">Floración</UiButton>
            </div>

            <p v-if="timeline.loading.value" role="status">Cargando el historial…</p>
            <UiInlineError v-else-if="timeline.error.value && !timeline.entries.value.length" title="No se ha podido cargar el historial" data-test="timeline-error">
              {{ timeline.error.value }}
              <template #action>
                <UiButton variant="secondary" data-test="timeline-retry" @click="timeline.load()">Reintentar</UiButton>
              </template>
            </UiInlineError>
            <UiEmptyState
              v-else-if="!timeline.entries.value.length && !timeline.filter.value"
              title="Este ejemplar todavía no tiene historia"
              mark="∿"
              data-test="timeline-empty"
            >
              Las lecturas, los cambios y lo que observes aparecerán aquí.
              <template #action>
                <UiButton variant="secondary" data-test="add-first-comment" @click="openDialog({ kind: 'comment', source: 'timeline' })">
                  Añadir el primer comentario
                </UiButton>
              </template>
            </UiEmptyState>
            <template v-else>
              <UiTimeline
                :events="timelineEvents"
                :types="TIMELINE_KIT_TYPES"
                :active-type="timeline.filter.value"
                empty-message="No hay registros de este tipo."
                data-test="timeline"
                @update:active-type="timeline.setFilter"
              >
                <template v-for="type in [...TIMELINE_KIT_TYPES.map((t) => t.value)]" :key="type" #[`event-${type}`]="{ event }">
                  <TimelineEntryBody
                    v-if="entryById.get(event.id)"
                    :entry="entryById.get(event.id)!"
                    :plant-id="plant.id"
                    @edit="editEntry($event)"
                    @close="editEntry($event, 'timeline', true)"
                    @remove="removeEntry($event)"
                  />
                </template>
              </UiTimeline>
              <UiInlineError v-if="timeline.error.value" data-test="timeline-more-error">{{ timeline.error.value }}</UiInlineError>
              <div v-if="timeline.hasMore.value" ref="moreSentinel" class="history__more" data-test="timeline-sentinel">
                <UiButton variant="secondary" :busy="timeline.loadingMore.value" data-test="load-more" @click="timeline.loadMore()">
                  Cargar registros anteriores
                </UiButton>
              </div>
            </template>
          </UiPanel>
        </div>

        <aside class="plant-side">
          <UiPanel title="Cuidados efectivos">
            <PlantEffectiveCare :care="plant.effectiveCare" :species-name="plant.species.scientificName" />
          </UiPanel>

          <UiPanel title="Próximo trabajo" data-mock="true">
            <ul class="tasks">
              <li v-for="task in MOCK_TASKS" :key="task.id">
                <strong>{{ task.title }}</strong>
                <small>{{ task.detail }}</small>
              </li>
            </ul>
            <p class="mock-note">Datos de ejemplo hasta T-22.</p>
          </UiPanel>
        </aside>
      </div>

      <UiEmptyState v-else-if="tab === 'fotografias'" title="Las fotografías llegan en T-19" mark="▧">
        Esta sección necesita almacenamiento de ficheros, que todavía no existe.
      </UiEmptyState>

      <PlantBloomPanel
        v-else-if="tab === 'floracion'"
        :blooms="blooms.items.value"
        :loading="blooms.loading.value"
        :error="blooms.error.value"
        @create="openDialog({ kind: 'bloom', source: 'blooms' })"
        @edit="editEntry($event, 'blooms')"
        @close="editEntry($event, 'blooms', true)"
        @remove="removeEntry($event, 'blooms')"
      />

      <UiPanel v-else title="Datos del ejemplar">
        <dl class="data">
          <div><dt>Apodo</dt><dd>{{ plant.nickname }}</dd></div>
          <div><dt>Especie</dt><dd>{{ plant.species.scientificName }}</dd></div>
          <div><dt>Localización</dt><dd>{{ plant.location.name }}</dd></div>
          <div>
            <dt>Descripción</dt>
            <dd data-test="profile-description">{{ plant.description ?? 'Sin indicar' }}</dd>
          </div>
          <div>
            <dt>Germinación</dt>
            <dd data-test="profile-germination">{{ germination ?? 'Sin indicar' }}</dd>
          </div>
          <div>
            <dt>Entrada en la colección</dt>
            <dd data-test="profile-acquired">{{ acquired ?? 'Sin indicar' }}</dd>
          </div>
          <div>
            <dt>Procedencia</dt>
            <dd data-test="profile-origin">
              {{ plant.origin ? ORIGIN_LABELS[plant.origin] : 'Sin indicar' }}<template v-if="plant.originNote"> · {{ plant.originNote }}</template>
            </dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd>
              <template v-if="plant.tags.length">
                <UiStatus v-for="tag in plant.tags" :key="tag.id" tone="neutral">{{ tag.name }}</UiStatus>
              </template>
              <template v-else>Sin tags</template>
            </dd>
          </div>
        </dl>

        <h3 class="data-heading">Historial de estado</h3>
        <PlantStatusHistory :plant-id="plant.id" :version="historyVersion" />

        <h3 class="data-heading">Historial de movimientos</h3>
        <PlantMovementHistory :plant-id="plant.id" />
      </UiPanel>

      <TimelineCommentDialog
        :open="dialog?.kind === 'comment'"
        :entry="dialog?.entry"
        :busy="saving"
        :error="dialogError"
        @submit="submitDialog('comments', $event)"
        @close="closeDialog"
      />
      <TimelineInterventionDialog
        :open="dialog?.kind === 'intervention'"
        :entry="dialog?.entry"
        :soil-mixes="soilMixes"
        :busy="saving"
        :error="dialogError"
        @submit="submitDialog('interventions', $event)"
        @close="closeDialog"
      />
      <TimelineBloomDialog
        :open="dialog?.kind === 'bloom'"
        :entry="dialog?.entry"
        :closing="dialog?.closing"
        :busy="saving"
        :error="dialogError"
        @submit="submitDialog('blooms', $event)"
        @close="closeDialog"
      />
      <TimelineRemoveDialog
        :open="dialog?.kind === 'remove'"
        :what="dialog?.entry ? WHAT_OF[dialog.entry.type] ?? 'el registro' : ''"
        :busy="saving"
        :error="dialogError"
        @confirm="confirmRemove"
        @close="closeDialog"
      />

      <PlantStatusDialog
        :open="statusOpen"
        :plant="plant"
        @changed="onStatusChanged"
        @close="statusOpen = false"
      />

      <UiDialog
        :open="readingOpen"
        title="Registrar lectura o riego"
        :subtitle="`${plant.nickname} · ${plant.species.scientificName}`"
        @close="readingOpen = false"
      >
        <!-- Los rangos efectivos van al formulario: orientan al escribir, sin salir del diálogo. -->
        <CareRecordForm
          :plant-id="plant.id"
          :species="plant.species"
          @registered="onRegistered"
        />
      </UiDialog>
    </template>
  </section>
</template>

<style scoped>
.not-found {
  max-width: 480px;
}

.plant-layout {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: 1fr minmax(280px, 340px);
  margin-top: var(--space-5);
}


.history {
  margin-top: var(--space-5);
}

.history__actions {
  align-items: center;
  display: flex;
  gap: var(--space-3);
}

.history__actions small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.history__add {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.history__more {
  display: flex;
  justify-content: center;
}

.plant-side {
  display: grid;
  gap: var(--space-5);
  height: fit-content;
}

.mock-note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-2) 0 0;
}

.inheritance {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}

.tasks {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tasks li {
  border-top: 1px solid var(--color-line);
  padding: var(--space-2) 0;
}

.tasks small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-12);
}

.data-heading {
  font-size: var(--font-size-13);
  margin: var(--space-4) 0 var(--space-2);
}

.data div {
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.data dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  width: 140px;
}

.data dd {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: 0;
}

@media (max-width: 900px) {
  .plant-layout {
    grid-template-columns: 1fr;
  }
}
</style>
