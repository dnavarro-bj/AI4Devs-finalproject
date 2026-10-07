<script setup lang="ts">
/**
 * Las fotografías elegidas **antes de guardar**: se muestran con su vista previa local y se suben
 * cuando la especie o el ejemplar ya existe (el alta no cambia de contrato: ver `design.md`,
 * decisión 3). La primera de la lista será la principal, así que elegir portada es moverla al
 * principio.
 *
 * No sube nada y no habla con el API: es una lista de `File` que el formulario conserva. Un fallo
 * de la subida posterior **nunca** deshace el alta.
 */
import { IMAGE_ACCEPT, IMAGE_LIMITS, validateImageFiles } from '@shared/utils/imageFiles'

const props = withDefaults(defineProps<{
  modelValue: File[]
  label?: string
  /** Para el atributo de test del selector. */
  uploadTest?: string
  /** Una nota por archivo, que se lee al ampliarlo: por ejemplo, el propósito que se le dio. */
  captionOf?: (file: File) => string | undefined
}>(), { label: 'Subir fotografías', uploadTest: 'photo-upload', captionOf: undefined })

const emit = defineEmits<{ 'update:modelValue': [File[]] }>()

const rejected = ref<string[]>([])
const previews = new Map<File, string>()

function previewOf(file: File): string {
  let url = previews.get(file)
  if (!url) {
    try {
      url = URL.createObjectURL(file)
    } catch {
      url = ''
    }
    previews.set(file, url)
  }
  return url
}

onBeforeUnmount(() => {
  for (const url of previews.values()) {
    try { URL.revokeObjectURL(url) } catch { /* nada que liberar */ }
  }
})

const images = computed(() => props.modelValue.map((file, index) => ({
  id: String(index),
  src: previewOf(file),
  alt: file.name,
  primary: index === 0,
  caption: props.captionOf?.(file),
})))

function onFiles(files: File[]) {
  const result = validateImageFiles(files, { existing: props.modelValue.length })
  rejected.value = result.rejected.map((entry) => entry.message)
  if (result.accepted.length) emit('update:modelValue', [...props.modelValue, ...result.accepted])
}

function move(ids: string[]) {
  emit('update:modelValue', ids.map((id) => props.modelValue[Number(id)]!))
}

function makePrimary(id: string) {
  const index = Number(id)
  const next = [...props.modelValue]
  const [file] = next.splice(index, 1)
  emit('update:modelValue', [file!, ...next])
}

function remove(id: string) {
  emit('update:modelValue', props.modelValue.filter((_, index) => index !== Number(id)))
}
</script>

<template>
  <div class="picker">
    <UiUploadArea
      layout="inline"
      mark="▧"
      :label="label"
      :hint="`JPG, PNG o WebP · hasta ${IMAGE_LIMITS.maxBytes / (1024 * 1024)} MB cada una`"
      :accept="IMAGE_ACCEPT"
      action-label="Seleccionar archivos"
      :data-test="uploadTest"
      @files="onFiles"
    />
    <ul v-if="rejected.length" class="picker__rejected" role="alert" data-test="photo-rejected">
      <li v-for="message in rejected" :key="message">{{ message }}</li>
    </ul>
    <UiMediaGallery
      v-if="modelValue.length"
      manage
      :editable="false"
      :images="images"
      data-test="photo-previews"
      @primary="makePrimary"
      @reorder="move"
      @remove="remove"
    />
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  gap: var(--space-3);
}

.picker__rejected {
  color: var(--color-danger);
  font-size: var(--font-size-12);
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
