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
  layout?: 'stacked' | 'inline'
  actionLabel?: string
  mark?: string
  disabled?: boolean
}>(), {
  label: 'Añadir ficheros',
  accept: undefined,
  hint: undefined,
  multiple: true,
  layout: 'stacked',
  actionLabel: 'Seleccionar archivos',
  mark: '⇧',
  disabled: false,
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
    :class="[`is-${layout}`, { 'is-dragging': dragging, 'is-disabled': disabled }]"
    data-role="dropzone"
    @dragover.prevent="!disabled && (dragging = true)"
    @dragleave="dragging = false"
    @drop.prevent="!disabled && onDrop($event)"
  >
    <span class="upload__mark" aria-hidden="true">{{ mark }}</span>
    <span class="upload__copy">
      <strong>{{ label }}</strong>
      <small v-if="hint">{{ hint }}</small>
      <small v-if="layout === 'stacked'" aria-hidden="true">…o suelta los ficheros aquí</small>
    </span>
    <label :for="inputId" class="upload__action">
      <span class="sr-only">{{ label }}: </span>{{ actionLabel }}
    </label>
    <input
      :id="inputId"
      class="sr-only"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="emitFiles(($event.target as HTMLInputElement).files)"
    >
  </div>
</template>

<style scoped>
.upload {
  align-items: center;
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
  padding: var(--space-6);
  text-align: center;
}

.upload.is-inline {
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 112px;
  padding: var(--space-5);
  text-align: left;
}

/* El estado de arrastre cambia fondo y borde: no depende solo del color del borde. */
.upload.is-dragging {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
}

.upload__mark {
  color: var(--color-brand);
  font-size: var(--font-size-24);
}

.upload.is-stacked .upload__mark {
  display: block;
  margin: 0 auto;
}

.upload__copy strong,
.upload__copy small {
  display: block;
}

.upload__copy strong {
  color: var(--color-ink);
  font-size: var(--font-size-13);
}

.upload__copy small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.upload__action {
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  cursor: pointer;
  font-size: var(--font-size-13);
  font-weight: 700;
  padding: var(--space-2) var(--space-3);
}

.upload.is-stacked .upload__action {
  justify-self: center;
}

.upload:focus-within {
  box-shadow: var(--focus-ring);
}

.upload.is-disabled .upload__action {
  background: var(--color-surface-muted);
  color: var(--color-ink-faint);
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .upload.is-inline {
    grid-template-columns: auto 1fr;
  }

  .upload.is-inline .upload__action {
    grid-column: 1 / -1;
    text-align: center;
  }
}
</style>
