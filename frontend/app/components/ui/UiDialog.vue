<script setup lang="ts">
/**
 * Diálogo modal para tareas acotadas y reversibles.
 *
 * El foco se gestiona a mano y no sobre `<dialog>` nativo (ADR-014): la retención de foco del
 * nativo la pone el navegador, no el DOM, así que un test sobre ella comprobaría el entorno y no
 * el componente. Aquí el ciclo de tabulación, el escape y la devolución del foco son código
 * propio, y por tanto verificables.
 */
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  subtitle?: string
  /** Nota al pie del diálogo, junto a las acciones. */
  footnote?: string
}>(), { subtitle: undefined, footnote: undefined })

const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | null>(null)
/** Quién tenía el foco antes de abrir: es a quien se lo devolvemos al cerrar. */
const opener = ref<HTMLElement | null>(null)

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

function focusable(): HTMLElement[] {
  return dialog.value ? [...dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE)] : []
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return

  if (event.key === 'Escape') {
    emit('close')
    return
  }

  if (event.key !== 'Tab') return

  const targets = focusable()
  if (!targets.length) return

  const first = targets[0]!
  const last = targets[targets.length - 1]!
  const active = document.activeElement

  // El foco da la vuelta dentro del diálogo en lugar de salirse a la página de detrás.
  if (event.shiftKey && (active === first || !dialog.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !dialog.value?.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async (open) => {
  if (open) {
    opener.value = document.activeElement as HTMLElement | null
    await nextTick()
    focusable()[0]?.focus()
  } else {
    opener.value?.focus()
    opener.value = null
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  if (props.open) {
    opener.value = document.activeElement as HTMLElement | null
    nextTick(() => focusable()[0]?.focus())
  }
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="open" class="dialog-backdrop" @click.self="$emit('close')">
    <article ref="dialog" class="dialog" role="dialog" aria-modal="true" :aria-label="title">
      <header>
        <div>
          <p v-if="subtitle">{{ subtitle }}</p>
          <h2>{{ title }}</h2>
        </div>
        <UiButton variant="icon" label="Cerrar" @click="$emit('close')">×</UiButton>
      </header>

      <div class="dialog-body"><slot /></div>

      <footer v-if="$slots.footer || footnote">
        <span v-if="footnote">{{ footnote }}</span>
        <slot name="footer" />
      </footer>
    </article>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  align-items: center;
  background: color-mix(in srgb, var(--color-ink) 45%, transparent);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: var(--space-4);
  position: fixed;
  z-index: 100;
}

/* Sombra: aquí sí, porque esto sí está realmente superpuesto. */
.dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-overlay);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  max-width: 640px;
  width: 100%;
}

.dialog > header {
  align-items: start;
  border-bottom: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  padding: var(--space-5);
}

.dialog > header p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-1);
}

.dialog > header h2 {
  margin: 0;
}

.dialog-body {
  overflow-y: auto;
  padding: var(--space-5);
}

.dialog > footer {
  align-items: center;
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-12);
  gap: var(--space-3);
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
}
</style>
