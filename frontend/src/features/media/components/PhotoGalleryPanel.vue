<script setup lang="ts">
/**
 * La galería gestionable de una especie o de un ejemplar: subir, elegir la portada, corregir,
 * reordenar y borrar. Es **el mismo panel** para los dos dueños —lo propio de cada uno es un campo
 * más: la autoría en la especie, el propósito en el ejemplar—.
 *
 * No habla con el API: recibe el caso de uso (`useMediaGallery`) ya creado por la pantalla, que lo
 * comparte con su cabecera para que subir actualice el recuento y la portada sin recargar
 * (ADR-015). Las imágenes se validan **antes** de enviarlas, pero el servidor decide.
 */
import type { useMediaGallery } from '../composables/useMediaGallery'
import { usePendingUploads } from '../composables/usePendingUploads'
import { IMAGE_ACCEPT, IMAGE_LIMITS } from '@shared/utils/imageFiles'
import { PHOTO_PURPOSES, type MediaOwner, type PhotoPatch, type PhotoPurpose } from '../types/media.types'

const props = withDefaults(defineProps<{
  owner: MediaOwner
  /** Nombre del dueño, para el texto de ayuda: «Echinocactus grusonii». */
  subject: string
  gallery: ReturnType<typeof useMediaGallery>
  /** Solo el ejemplar ordena por fecha o a mano; la especie siempre es a mano. */
  sort?: 'date' | 'manual'
  title?: string
  description?: string
}>(), {
  sort: 'manual',
  title: 'Fotografías',
  description: undefined,
})

const emit = defineEmits<{ 'update:sort': ['date' | 'manual'], changed: [] }>()

const isPlant = computed(() => props.owner.kind === 'plants')
const { pendingFor, retry, discard } = usePendingUploads()
const pending = pendingFor(props.owner)

const credit = ref('')
const purpose = ref<PhotoPurpose | ''>('')
const retrying = ref(false)

async function onFiles(files: File[]) {
  await props.gallery.upload(files, {
    ...(credit.value.trim() ? { credit: credit.value.trim() } : {}),
    ...(purpose.value ? { purpose: purpose.value } : {}),
  })
  emit('changed')
}

async function retryPending() {
  retrying.value = true
  await retry(props.owner)
  retrying.value = false
  await props.gallery.load()
  emit('changed')
}

/* Editar --------------------------------------------------------------------------------------- */
const editingId = ref<string | null>(null)
const form = reactive({ altText: '', capturedAt: '', credit: '', purpose: '' as PhotoPurpose | '' })
const formError = ref('')
const saving = ref(false)

const editing = computed(() => props.gallery.photos.value.find((photo) => photo.id === editingId.value) ?? null)

function dayOf(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : ''
}

function openEdit(id: string) {
  const photo = props.gallery.photos.value.find((entry) => entry.id === id)
  if (!photo) return
  editingId.value = id
  form.altText = photo.altText
  form.capturedAt = dayOf(photo.capturedAt)
  form.credit = photo.credit ?? ''
  form.purpose = photo.purpose ?? ''
  formError.value = ''
}

async function saveEdit() {
  const photo = editing.value
  if (!photo) return
  if (form.altText.trim() === '') {
    formError.value = 'El texto alternativo no puede estar vacío: es lo que oye quien no ve la imagen.'
    return
  }
  const patch: PhotoPatch = {}
  if (form.altText.trim() !== photo.altText) patch.altText = form.altText.trim()
  if (form.capturedAt !== dayOf(photo.capturedAt)) {
    patch.capturedAt = form.capturedAt ? `${form.capturedAt}T00:00:00Z` : null
  }
  if (!isPlant.value && form.credit.trim() !== (photo.credit ?? '')) patch.credit = form.credit.trim() || null
  if (isPlant.value && form.purpose !== (photo.purpose ?? '')) patch.purpose = form.purpose || null

  if (Object.keys(patch).length === 0) {
    editingId.value = null
    return
  }
  saving.value = true
  const result = await props.gallery.update(photo.id, patch)
  saving.value = false
  if (!result.success) {
    formError.value = result.error!.message
    return
  }
  editingId.value = null
  emit('changed')
}

/* Borrar --------------------------------------------------------------------------------------- */
const removingId = ref<string | null>(null)
const removing = ref(false)
const toRemove = computed(() => props.gallery.photos.value.find((photo) => photo.id === removingId.value) ?? null)

async function confirmRemove() {
  if (!toRemove.value) return
  removing.value = true
  const result = await props.gallery.remove(toRemove.value.id)
  removing.value = false
  if (result.success) {
    removingId.value = null
    emit('changed')
  }
}

async function onPrimary(id: string) {
  await props.gallery.makePrimary(id)
  emit('changed')
}

async function onReorder(ids: string[]) {
  await props.gallery.reorder(ids)
  emit('changed')
}

const SORTS = [
  { value: 'date', label: 'Por fecha' },
  { value: 'manual', label: 'Manual' },
]

const uploadHint = `JPG, PNG o WebP · hasta ${IMAGE_LIMITS.maxBytes / (1024 * 1024)} MB cada una`
</script>

<template>
  <section class="photos" data-test="photos-view">
    <UiSectionHeader
      :title="title"
      :description="description ?? `Vista general, detalles y evolución de ${subject}.`"
    >
      <template #actions>
        <span class="photos__count" data-test="photo-count">
          {{ gallery.total.value }} {{ gallery.total.value === 1 ? 'fotografía' : 'fotografías' }}
        </span>
      </template>
    </UiSectionHeader>

    <UiNotice
      v-if="pending.length"
      severity="warning"
      title="Hay fotografías sin subir"
      data-test="photo-pending"
    >
      <ul class="photos__pending">
        <li v-for="item in pending" :key="item.key">{{ item.name }}: {{ item.message }}</li>
      </ul>
      <div class="photos__pending-actions">
        <UiButton :busy="retrying" data-test="retry-uploads" @click="retryPending">Reintentar</UiButton>
        <UiButton variant="secondary" data-test="discard-uploads" @click="discard(owner)">Descartar</UiButton>
      </div>
    </UiNotice>

    <div class="photos__upload">
      <UiUploadArea
        layout="inline"
        mark="▧"
        :label="isPlant ? 'Arrastra fotografías o selecciónalas' : 'Subir fotografías de referencia'"
        :hint="uploadHint"
        :accept="IMAGE_ACCEPT"
        action-label="Seleccionar archivos"
        data-test="photo-upload"
        @files="onFiles"
      />
      <div class="photos__fields">
        <UiField
          v-if="!isPlant"
          v-model="credit"
          label="Autoría o procedencia"
          help="Opcional. Vale para las fotografías que subas ahora."
          data-test="upload-credit"
        />
        <UiField
          v-else
          v-model="purpose"
          as="select"
          label="Qué muestran"
          placeholder="Sin indicar"
          :options="PHOTO_PURPOSES"
          help="Opcional. Vale para las fotografías que subas ahora."
          data-test="upload-purpose"
        />
      </div>
    </div>

    <UiInlineError v-if="gallery.actionError.value" data-test="photo-action-error">
      {{ gallery.actionError.value }}
    </UiInlineError>

    <p v-if="gallery.loading.value" role="status" data-test="photos-loading">Cargando las fotografías…</p>
    <div v-else-if="gallery.error.value" class="photos__error" data-test="photos-error">
      <UiInlineError>{{ gallery.error.value }}</UiInlineError>
      <UiButton variant="secondary" data-test="photos-retry" @click="gallery.load()">Reintentar</UiButton>
    </div>
    <template v-else>
      <div v-if="isPlant" class="photos__sort">
        <UiSegmentedControl
          label="Orden"
          :options="SORTS"
          :model-value="sort"
          data-test="photo-sort"
          @update:model-value="emit('update:sort', $event as 'date' | 'manual')"
        />
      </div>

      <UiMediaGallery
        manage
        data-test="photo-gallery"
        :images="gallery.images.value"
        :reorderable="sort === 'manual'"
        :empty-message="`Todavía no hay fotografías de ${subject}.`"
        @primary="onPrimary"
        @edit="openEdit"
        @remove="removingId = $event"
        @reorder="onReorder"
      />
      <ul v-if="gallery.uploads.value.some((item) => item.status === 'error')" class="photos__failed">
        <li v-for="item in gallery.uploads.value.filter((entry) => entry.status === 'error')" :key="item.key">
          <span>{{ item.name }}: {{ item.message }}</span>
          <button type="button" @click="gallery.dismissUpload(item.key)">Descartar</button>
        </li>
      </ul>
    </template>

    <UiDialog :open="editing !== null" title="Editar la fotografía" data-test="photo-edit-dialog" @close="editingId = null">
      <form class="photos__form" @submit.prevent="saveEdit">
        <UiInlineError v-if="formError" data-test="photo-edit-error">{{ formError }}</UiInlineError>
        <UiField v-model="form.altText" label="Texto alternativo" help="Describe la imagen para quien no la ve." data-test="edit-alt" />
        <UiField v-model="form.capturedAt" label="Fecha de captura" type="date" help="Corrígela si la cámara se equivocó: la galería se reordena." data-test="edit-captured" />
        <UiField v-if="!isPlant" v-model="form.credit" label="Autoría o procedencia" data-test="edit-credit" />
        <UiField v-else v-model="form.purpose" as="select" label="Qué muestra" placeholder="Sin indicar" :options="PHOTO_PURPOSES" data-test="edit-purpose" />
        <div class="photos__form-actions">
          <UiButton variant="secondary" data-test="cancel-edit" @click="editingId = null">Cancelar</UiButton>
          <UiButton type="submit" :busy="saving" data-test="save-edit">Guardar</UiButton>
        </div>
      </form>
    </UiDialog>

    <UiDialog :open="toRemove !== null" title="Borrar la fotografía" data-test="photo-remove-dialog" @close="removingId = null">
      <p>
        «{{ toRemove?.altText }}» se borrará del todo, con sus archivos. Quedarán
        {{ Math.max(0, gallery.total.value - 1) }}
        {{ gallery.total.value - 1 === 1 ? 'fotografía' : 'fotografías' }}.
      </p>
      <p v-if="toRemove?.primary && gallery.total.value > 1">La siguiente en el orden pasará a ser la principal.</p>
      <template #footer>
        <UiButton variant="secondary" data-test="cancel-photo-remove" @click="removingId = null">Cancelar</UiButton>
        <UiButton :busy="removing" data-test="confirm-photo-remove" @click="confirmRemove">
          {{ removing ? 'Borrando…' : 'Borrar' }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>

<style scoped>
.photos {
  display: grid;
  gap: var(--space-4);
}

.photos__count {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  font-weight: 700;
}

.photos__upload {
  align-items: start;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1.6fr) minmax(220px, 1fr);
}

.photos__sort {
  max-width: 280px;
}

.photos__pending {
  margin: 0 0 var(--space-3);
  padding-left: var(--space-4);
}

.photos__pending-actions,
.photos__form-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.photos__form {
  display: grid;
  gap: var(--space-3);
}

.photos__error {
  align-items: center;
  display: flex;
  gap: var(--space-3);
}

.photos__failed {
  display: grid;
  gap: var(--space-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.photos__failed li {
  color: var(--color-danger);
  font-size: var(--font-size-12);
}

.photos__failed button {
  background: none;
  border: 0;
  color: var(--color-brand);
  cursor: pointer;
  font: inherit;
  margin-left: var(--space-2);
  text-decoration: underline;
}

@media (max-width: 820px) {
  .photos__upload { grid-template-columns: 1fr; }
}
</style>
