<script setup lang="ts">
/**
 * Zona para elegir ficheros: por selector o soltándolos encima.
 *
 * **No sube nada.** Emite los ficheros elegidos y ahí termina su trabajo. Subir exige saber a
 * dónde, en qué formato y con qué límites, y eso es T-19 —que además necesita un ADR previo sobre
 * almacenamiento, miniaturas y metadatos EXIF—. Un componente que hoy inventara una subida habría
 * que rehacerlo entonces.
 *
 * El control real es un `input` de fichero con su etiqueta: es alcanzable y activable con el
 * teclado por sí mismo, y ninguna zona de arrastre construida a mano lo iguala. La zona de soltar
 * es un añadido para quien usa el ratón, no el camino principal.
 */
const props = withDefaults(defineProps<{
  label?: string
  accept?: string
  hint?: string
  multiple?: boolean
}>(), {
  label: 'Añadir ficheros',
  accept: undefined,
  hint: undefined,
  multiple: true,
})

const emit = defineEmits<{ files: [File[]] }>()

const inputId = useId()
const dragging = ref(false)

function emitFiles(list: FileList | null | undefined) {
  const files = [...(list ?? [])]
  if (files.length) emit('files', files)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  emitFiles(event.dataTransfer?.files)
}
</script>

<template>
  <div
    class="upload"
    :class="{ 'is-dragging': dragging }"
    data-role="dropzone"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <label :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="emitFiles(($event.target as HTMLInputElement).files)"
    >
    <p v-if="hint" class="upload__hint">{{ hint }}</p>
    <p class="upload__drop" aria-hidden="true">…o suelta los ficheros aquí</p>
  </div>
</template>

<style scoped>
.upload {
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  text-align: center;
}

/* El estado de arrastre cambia fondo y borde: no depende solo del color del borde. */
.upload.is-dragging {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
}

.upload label {
  display: block;
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.upload input {
  display: block;
  margin: 0 auto;
}

.upload__hint,
.upload__drop {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-2) 0 0;
}
</style>
