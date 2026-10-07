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
import { useToast } from '@shared/composables/useToast'
import { useAlertActions } from '@features/alerts/composables/useAlertActions'
import type { AlertInput } from '@features/alerts/types/alert.types'
import { useRelatedTasks } from '@features/tasks/composables/useRelatedTasks'
import { useTaskWorkflow } from '@features/tasks/composables/useTaskWorkflow'
import { overdueText, taskTiming } from '@features/tasks/mappers/task.mapper'
import { TASK_TYPE_LABELS } from '@features/tasks/types/task.types'
import { usePlantTimeline } from '@features/timeline/composables/usePlantTimeline'
import { usePlantBlooms } from '@features/timeline/composables/usePlantBlooms'
import { TIMELINE_KIT_TYPES, toEvent } from '@features/timeline/mappers/timeline.mapper'
import type { EventInput, EventResource, TimelineEntry } from '@features/timeline/types/timeline.types'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import { useMediaGallery } from '@features/media/composables/useMediaGallery'
import { usePendingUploads } from '@features/media/composables/usePendingUploads'
import { toThumbImage } from '@features/media/mappers/media.mapper'

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

/**
 * La galería la crea la ficha y la comparten la cabecera, la pestaña y la cronología: subir una foto
 * actualiza el recuento y la portada sin recargar. Por defecto va por fecha de captura —la
 * evolución—; «Manual» pide el orden que el usuario ha dado. Las fotos de la especie no entran.
 */
const photoSort = ref<'date' | 'manual'>('date')
const gallery = useMediaGallery(
  { kind: 'plants', id: plantId },
  {
    sort: () => (photoSort.value === 'manual' ? 'position' : undefined),
    eventHref: (eventId) => `/plants/${plantId}?event=${eventId}`,
  },
)
const galleryLoaded = ref(false)
const apiBase = useRuntimeConfig().public.apiBaseUrl as string
/** Lo que se eligió en el alta o en un diálogo y no llegó a subirse: se avisa y se reintenta en la pestaña. */
const pending = usePendingUploads()
const pendingPhotos = pending.pendingFor({ kind: 'plants', id: plantId })
const toast = useToast()

const plant = ref<PlantDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const tab = ref('resumen')
const readingOpen = ref(false)
const statusOpen = ref(false)
/** Se incrementa tras cada cambio de estado: es lo que refresca el historial de la pestaña de datos. */
const historyVersion = ref(0)
const today = useReferenceDate()

const photoCount = computed(() => galleryLoaded.value ? gallery.total.value : (plant.value?.photoCount ?? 0))

/** La portada: la principal de la galería, o la que trae la ficha mientras la galería llega. */
const cover = computed(() => {
  const primary = gallery.photos.value.find((photo) => photo.primary)
  const source = galleryLoaded.value ? primary : (plant.value?.primaryPhoto ?? null)
  if (!source) return null
  const image = toThumbImage(source, apiBase)
  return { src: image.src, alt: image.alt }
})

/** Un enlace «ver el evento» desde una foto: lleva a la cronología y a su tarjeta. */
async function showEvent(id: string) {
  tab.value = 'resumen'
  await nextTick()
  document.getElementById(`event-${id}`)?.scrollIntoView?.({ block: 'center' })
}
watch(() => route.query?.event, (id) => { if (id) showEvent(String(id)) }, { immediate: true })
watch(photoSort, () => gallery.load())

/** Su próximo trabajo: lo que le afecta —dirigido a ella, a su localización o a un ascendiente—. */
const work = useRelatedTasks(() => ({ plant: plantId }))
const taskWorkflow = useTaskWorkflow(async () => {
  await Promise.all([work.load(), timeline.reload()])
})

function createTaskHere() {
  if (!plant.value) return
  taskWorkflow.openCreate({
    plants: [{
      id: plant.value.id,
      code: plant.value.code,
      nickname: plant.value.nickname,
      detail: `${plant.value.species.scientificName} · ${plant.value.location.name}`,
    }],
  })
}

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
  timeline.load().then(() => {
    if (route.query?.event) showEvent(String(route.query.event))
  })
  blooms.load()
  work.load()
  gallery.load().then(() => { galleryLoaded.value = !gallery.error.value })
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
 * «De un vistazo»: riego y medición salen de lecturas reales, la última floración de las
 * observadas y la próxima tarea del API de tareas. `now` se pasa aquí y no dentro, para que la
 * función sea determinista y testeable.
 */
const glance = computed(() => plantGlance(
  history.records.value,
  new Date().toISOString(),
  blooms.last.value,
  work.loaded.value ? { task: work.tasks.value[0] ?? null, today: today.value } : undefined,
))

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

/* Anotar una alerta sobre el ejemplar: la ficha la guarda y refresca su aviso y su cronología. */
const alertActions = useAlertActions()
const alertDialogOpen = ref(false)

function openAlertDialog() {
  alertActions.reset()
  addOpen.value = false
  alertDialogOpen.value = true
}

async function submitAlert(input: Omit<AlertInput, 'plantId' | 'locationId'>) {
  const created = await alertActions.create({ ...input, plantId: plantId })
  if (!created) return
  alertDialogOpen.value = false
  // El aviso vive en el detalle de la planta y la apertura, en la cronología: las dos se ponen al día.
  const fresh = await detail(plantId)
  if (fresh.success) plant.value = fresh.data!
  await timeline.reload()
}

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

/**
 * Crea o corrige el evento y **después** sube las fotografías adjuntas con su `eventId`: un fallo de
 * imagen no deshace el evento ni bloquea el guardado. Lo que no sube queda en la cola, la ficha lo
 * avisa y la tarjeta del evento ofrece reintentarlo.
 */
async function submitDialog(resource: EventResource, input: EventInput, files: File[] = []) {
  const current = dialog.value!
  saving.value = true
  dialogError.value = null
  const result = current.source === 'blooms'
    ? await blooms.save(input as never, current.entry?.id)
    : await timeline.save(resource, input, current.entry?.id)

  if (!result.success) {
    saving.value = false
    dialogError.value = result.error!.message
    return
  }

  const failed = files.length ? (await uploadFor(result.data!.id, files)).failed : 0
  saving.value = false
  // Sin fotografías, el evento ya está colocado; con ellas la cronología se vuelve a pedir para traerlas.
  if (files.length) await refreshAfterPhotos()
  else await afterChange(current.source)
  closeDialog()
  if (failed) warnUnsent(failed)
}

const uploadFor = (eventId: string, files: File[]) =>
  pending.uploadAfterSave({ kind: 'plants', id: plantId }, files, { eventId })

/** La cronología (con sus fotos), la pestaña de floración y el recuento de la cabecera se ponen al día. */
async function refreshAfterPhotos() {
  await Promise.all([timeline.reload(), blooms.load(), gallery.load()])
}

const warnUnsent = (failed: number) =>
  toast.show(`${failed} ${failed === 1 ? 'fotografía no se subió' : 'fotografías no se subieron'}: reintenta desde la tarjeta del evento.`)

/** «Añadir fotografía» en la tarjeta de un evento existente. */
async function addEventPhotos(entry: TimelineEntry, files: File[]) {
  const { failed } = await uploadFor(entry.id, files)
  await refreshAfterPhotos()
  if (failed) warnUnsent(failed)
}

/** «Quitar»: descuelga la fotografía del evento; sigue en la galería del ejemplar. */
async function removeEventPhoto(_entry: TimelineEntry, photoId: string) {
  const result = await gallery.update(photoId, { eventId: null })
  if (result.success) await timeline.reload()
}

async function retryEventPhotos() {
  const { failed } = await pending.retry({ kind: 'plants', id: plantId })
  await refreshAfterPhotos()
  if (failed) warnUnsent(failed)
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
      <PlantHeader
        :plant="plant"
        :cover="cover"
        :photo-count="photoCount"
        @register-reading="readingOpen = true"
        @create-task="createTaskHere"
        @change-status="statusOpen = true"
        @open-photos="tab = 'fotografias'"
      />

      <UiNotice
        v-if="pendingPhotos.length && tab !== 'fotografias'"
        severity="warning"
        title="Hay fotografías sin subir"
        data-test="pending-photos"
      >
        El ejemplar se guardó, pero {{ pendingPhotos.length }}
        {{ pendingPhotos.length === 1 ? 'fotografía no se subió' : 'fotografías no se subieron' }}.
        <UiButton variant="secondary" data-test="review-pending" @click="tab = 'fotografias'">Revisar</UiButton>
      </UiNotice>

      <PlantAlertsNotice :alerts="plant.openAlerts ?? []" :plant-id="plant.id" />

      <UiTabs
        v-model="tab"
        :tabs="[
          { value: 'resumen', label: 'Resumen e historial' },
          { value: 'fotografias', label: 'Fotografías', count: photoCount > 0 ? photoCount : undefined },
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
              <UiButton variant="text" data-test="add-alert" @click="openAlertDialog">Alerta</UiButton>
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
                    :pending-photos="pendingPhotos.filter((item) => item.eventId === event.id)"
                    @edit="editEntry($event)"
                    @close="editEntry($event, 'timeline', true)"
                    @remove="removeEntry($event)"
                    @add-photos="addEventPhotos"
                    @remove-photo="removeEventPhoto"
                    @retry-photos="retryEventPhotos"
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

          <UiPanel title="Próximo trabajo" data-test="next-work">
            <template #action>
              <UiButton variant="text" :to="`/tasks?plant=${plant.id}`" data-test="all-tasks">Ver todas</UiButton>
            </template>
            <p v-if="work.error.value" class="tasks__empty" data-test="next-work-error">{{ work.error.value }}</p>
            <ul v-else-if="work.tasks.value.length" class="tasks">
              <li v-for="task in work.tasks.value" :key="task.id" :class="{ 'is-overdue': overdueText(task.dueTo, today) }" data-test="next-work-item">
                <strong>{{ task.title }}</strong>
                <small>
                  {{ TASK_TYPE_LABELS[task.type] }} · {{ taskTiming(task, today).main }}
                  <b v-if="overdueText(task.dueTo, today)" data-test="next-work-overdue">· Vencida</b>
                </small>
              </li>
            </ul>
            <p v-else-if="work.loaded.value" class="tasks__empty" data-test="next-work-empty">No hay trabajo pendiente para este ejemplar.</p>
            <UiButton variant="secondary" data-test="create-task-here" @click="createTaskHere">＋ Crear tarea</UiButton>
          </UiPanel>
        </aside>
      </div>

      <PhotoGalleryPanel
        v-else-if="tab === 'fotografias'"
        :owner="{ kind: 'plants', id: plant.id }"
        :subject="plant.nickname"
        :gallery="gallery"
        v-model:sort="photoSort"
        :description="`La evolución de ${plant.nickname}: de la más reciente a la más antigua, o en el orden que le des.`"
      />

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
        @submit="(input, files) => submitDialog('comments', input, files)"
        @close="closeDialog"
      />
      <TimelineInterventionDialog
        :open="dialog?.kind === 'intervention'"
        :entry="dialog?.entry"
        :soil-mixes="soilMixes"
        :busy="saving"
        :error="dialogError"
        @submit="(input, files) => submitDialog('interventions', input, files)"
        @close="closeDialog"
      />
      <TimelineBloomDialog
        :open="dialog?.kind === 'bloom'"
        :entry="dialog?.entry"
        :closing="dialog?.closing"
        :busy="saving"
        :error="dialogError"
        @submit="(input, files) => submitDialog('blooms', input, files)"
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

    <AlertCreateDialog
      v-if="plant"
      :open="alertDialogOpen"
      :subject-label="`${plant.code} · ${plant.nickname}`"
      :busy="alertActions.submitting.value"
      :error="alertActions.error.value"
      @submit="submitAlert"
      @close="alertDialogOpen = false"
    />
    <TaskDialogs :workflow="taskWorkflow" />
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

/* Lo vencido se lee además de verse: «Vencida» va en el texto. */
.tasks .is-overdue b {
  color: var(--color-danger);
}

.tasks__empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
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
