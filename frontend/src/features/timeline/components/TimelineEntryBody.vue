<script setup lang="ts">
/**
 * El cuerpo de una tarjeta de la cronología, según el tipo de la entrada. Es el slot que
 * `UiTimeline` deja a quien la usa: el kit no conoce los tipos del producto.
 *
 * Una lectura trae sus medidas comparables y su análisis; un comentario, su texto y si fue editado;
 * una intervención, solo los datos de su tipo; una floración, su intervalo y estado. **Corregir y
 * retirar solo se ofrecen en lo que es del usuario** —comentario, intervención y floración—: una
 * lectura, un cambio de estado o un movimiento tienen su propia pantalla.
 *
 * Un tipo desconocido no pinta cuerpo: la tarjeta ya lleva su título y su fecha.
 */
import { toTimelineEvents } from '@features/care-records/composables/usePlantHistory'
import { ALERT_SEVERITY_LABELS } from '@features/alerts/types/alert.types'
import { TASK_TYPE_LABELS, type TaskType } from '@features/tasks/types/task.types'
import { toThumbImage } from '@features/media/mappers/media.mapper'
import { IMAGE_ACCEPT } from '@shared/utils/imageFiles'
import type { PendingView } from '@features/media/composables/usePendingUploads'
import { BLOOM_STATUS_LABELS, bloomInterval } from '../mappers/timeline.mapper'
import type { TimelineEntry } from '../types/timeline.types'

const props = defineProps<{
  entry: TimelineEntry
  plantId: string
  /** Fotografías de este evento que no llegaron a subirse: se avisa aquí y se puede reintentar. */
  pendingPhotos?: PendingView[]
}>()
const emit = defineEmits<{
  'edit': [TimelineEntry]
  'remove': [TimelineEntry]
  'close': [TimelineEntry]
  /** Fotografías elegidas para añadir a este evento: quien lo usa las sube con su `eventId`. */
  'add-photos': [TimelineEntry, File[]]
  /** Descolgar una fotografía del evento: sigue en la galería del ejemplar. */
  'remove-photo': [TimelineEntry, string]
  'retry-photos': [TimelineEntry]
}>()

const apiBase = useRuntimeConfig().public.apiBaseUrl as string

/** Solo los eventos de la espina admiten fotografía; las lecturas, estados y movimientos, no. */
const photoable = computed(() => ['comentario', 'intervencion', 'floracion', 'tarea'].includes(props.entry.type))
const images = computed(() => (props.entry.photos ?? []).map((photo) => toThumbImage(photo, apiBase)))

const fileInput = ref<HTMLInputElement | null>(null)
function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (files.length) emit('add-photos', props.entry, files)
}

const readingValues = computed(() => props.entry.reading
  ? toTimelineEvents([props.entry.reading])[0]!.values.map((value) => ({ label: value.label, value: value.text, absent: value.absent }))
  : [])

const editable = computed(() => ['comentario', 'intervencion', 'floracion'].includes(props.entry.type))
const openBloom = computed(() => props.entry.bloom?.status !== 'finalizada' && props.entry.type === 'floracion')

function editedLabel(at: string): string {
  return `editado el ${new Date(at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
</script>

<template>
  <div :id="`event-${entry.id}`" class="entry-body" :data-test="`entry-${entry.id}`">
    <template v-if="entry.type === 'lectura' && entry.reading">
      <div :data-test="`reading-${entry.id}`" class="entry-body__reading">
        <UiSummaryGrid density="compact" :items="readingValues" />
      </div>
      <RecommendationPanel :plant-id="plantId" :care-record="entry.reading" />
    </template>

    <p v-else-if="entry.type === 'cambio_estado' && entry.statusChange?.reason" class="entry-body__text" data-test="status-reason-text">
      {{ entry.statusChange.reason }}
    </p>

    <p v-else-if="entry.type === 'movimiento' && entry.movement" class="entry-body__text" data-test="movement-from">
      Desde {{ entry.movement.from.name }}.
    </p>

    <template v-else-if="entry.type === 'comentario' && entry.comment">
      <p class="entry-body__text entry-body__text--comment" data-test="comment-body">{{ entry.comment.text }}</p>
      <small v-if="entry.comment.editedAt" class="entry-body__meta" data-test="comment-edited">
        {{ editedLabel(entry.comment.editedAt) }}
      </small>
    </template>

    <template v-else-if="entry.type === 'intervencion' && entry.intervention">
      <dl class="entry-body__facts" data-test="intervention-body">
        <div v-if="entry.intervention.potSize"><dt>Maceta</dt><dd>{{ entry.intervention.potSize }}</dd></div>
        <div v-if="entry.intervention.soilMix"><dt>Mezcla</dt><dd>{{ entry.intervention.soilMix.name }}</dd></div>
        <div v-if="entry.intervention.product"><dt>Producto</dt><dd>{{ entry.intervention.product }}</dd></div>
      </dl>
      <p v-if="entry.intervention.notes" class="entry-body__text">{{ entry.intervention.notes }}</p>
    </template>

    <template v-else-if="entry.type === 'floracion' && entry.bloom">
      <p class="entry-body__text" data-test="bloom-body">
        {{ BLOOM_STATUS_LABELS[entry.bloom.status] }} · {{ bloomInterval(entry.bloom) }}
        <template v-if="entry.bloom.flowerCount != null"> · ~{{ entry.bloom.flowerCount }} flores</template>
      </p>
      <p v-if="entry.bloom.notes" class="entry-body__text">{{ entry.bloom.notes }}</p>
    </template>

    <p v-else-if="entry.type === 'tarea' && entry.task" class="entry-body__text" data-test="task-body">
      {{ entry.task.title }} · {{ TASK_TYPE_LABELS[entry.task.type as TaskType] ?? entry.task.type }}
    </p>

    <div v-else-if="entry.type === 'alerta' && entry.alert" class="entry-body__alert" :data-test="`alert-entry-${entry.id}`">
      <p class="entry-body__text">
        {{ ALERT_SEVERITY_LABELS[entry.alert.severity] ?? entry.alert.severity }} · {{ entry.alert.reason }}
      </p>
      <p v-if="entry.alert.comment" class="entry-body__text entry-body__text--comment" data-test="alert-entry-comment">
        {{ entry.alert.comment }}
      </p>
      <NuxtLink :to="`/alerts?plant=${plantId}&status=all`" class="entry-body__meta" data-test="alert-entry-link">Ver las alertas del ejemplar</NuxtLink>
    </div>

    <!-- Un registro de un lote lo dice: fue una sola operación sobre varias plantas, no un registro suelto. -->
    <small v-if="entry.batchId" class="entry-body__meta" data-test="batch-legend">
      <template v-if="entry.batchSize">En un lote de {{ entry.batchSize }} {{ entry.batchSize === 1 ? 'planta' : 'plantas' }}</template>
      <template v-else>Operación sobre varias plantas</template>
    </small>

    <!-- Las fotografías del evento, en su tarjeta. Sin ellas no se reserva hueco. -->
    <UiMediaGallery
      v-if="images.length"
      class="entry-body__photos"
      manage
      :editable="false"
      :reorderable="false"
      :primaryable="false"
      remove-label="Quitar del evento"
      :images="images"
      :data-test="`event-photos-${entry.id}`"
      @remove="emit('remove-photo', entry, $event)"
    />

    <div v-if="pendingPhotos?.length" class="entry-body__pending" role="status" :data-test="`event-pending-${entry.id}`">
      <span>{{ pendingPhotos.length }} {{ pendingPhotos.length === 1 ? 'fotografía sin subir' : 'fotografías sin subir' }}.</span>
      <UiButton variant="text" data-test="retry-event-photos" @click="emit('retry-photos', entry)">Reintentar</UiButton>
    </div>

    <div v-if="editable || photoable" class="entry-body__actions">
      <template v-if="photoable">
        <UiButton variant="text" data-test="add-photo" @click="fileInput?.click()">Añadir fotografía</UiButton>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          multiple
          :accept="IMAGE_ACCEPT"
          aria-label="Elegir fotografías para este evento"
          data-test="add-photo-input"
          @change="onPick"
        >
      </template>
      <template v-if="editable">
        <UiButton v-if="openBloom" variant="text" data-test="close-entry" @click="emit('close', entry)">Cerrar floración</UiButton>
        <UiButton variant="text" data-test="edit-entry" @click="emit('edit', entry)">Corregir</UiButton>
        <UiButton variant="text" data-test="remove-entry" @click="emit('remove', entry)">Retirar</UiButton>
      </template>
    </div>
  </div>
</template>

<style scoped>
.entry-body {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.entry-body__text {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.entry-body__text--comment {
  color: var(--color-ink);
  white-space: pre-wrap;
}

.entry-body__meta {
  color: var(--color-ink-faint);
  font-size: var(--font-size-12);
}

.entry-body__facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
}

.entry-body__facts dt {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  text-transform: uppercase;
}

.entry-body__facts dd {
  font-size: var(--font-size-13);
  margin: 0;
}

.entry-body__pending {
  align-items: center;
  color: var(--color-warning);
  display: flex;
  font-size: var(--font-size-12);
  gap: var(--space-2);
}

.entry-body__actions {
  display: flex;
  gap: var(--space-1);
  justify-content: flex-end;
}
</style>
