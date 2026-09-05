<script setup lang="ts">
/**
 * La acción del sistema. Una primaria por región, verbo y resultado en la etiqueta
 * ([components.md](../../../../docs/ui-kit/components.md)).
 *
 * La variante `icon` exige nombre accesible: un control anónimo no es un uso admitido del kit, así
 * que se rechaza en lugar de renderizarse.
 */
type Variant = 'primary' | 'secondary' | 'text' | 'danger' | 'icon'

const props = withDefaults(defineProps<{
  variant?: Variant
  /** Nombre accesible. Obligatorio en `icon`; en el resto lo pone el contenido. */
  label?: string
  disabled?: boolean
  /** La acción está en curso: se comunica y no admite una segunda activación. */
  busy?: boolean
  type?: 'button' | 'submit' | 'reset'
  /** Destino, cuando la acción es navegar. Rinde un enlace con la forma del botón. */
  to?: string
}>(), {
  variant: 'primary',
  label: undefined,
  disabled: false,
  busy: false,
  type: 'button',
  to: undefined,
})

const emit = defineEmits<{ click: [MouseEvent] }>()

if (props.variant === 'icon' && !props.label) {
  throw new Error('UiButton: la variante «icon» necesita un nombre accesible en la prop `label`.')
}

const inactive = computed(() => props.disabled || props.busy)

/*
 * Un solo elemento raíz, siempre (ADR-014): así `data-test`, `type` y demás atributos del punto de
 * uso caen en el control. Un `v-if`/`v-else` entre enlace y botón haría del componente un
 * fragmento y los perdería por el camino.
 */
// Navegar es una acción como otra: mismo aspecto, elemento correcto (un enlace, no un botón).
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))

const bindings = computed(() => (props.to
  ? { 'to': props.to, 'aria-label': props.label }
  : {
      'type': props.type,
      'disabled': inactive.value || undefined,
      'aria-busy': props.busy ? 'true' : undefined,
      'aria-label': props.label,
      'onClick': onClick,
    }))

function onClick(event: MouseEvent) {
  if (inactive.value) return
  emit('click', event)
}
</script>

<template>
  <component
    :is="tag"
    v-bind="bindings"
    :class="variant === 'icon' ? 'icon-button' : ['button', `button--${variant}`]"
  >
    <span v-if="variant === 'icon'" aria-hidden="true"><slot /></span>
    <slot v-else />
  </component>
</template>

<style scoped>
.button {
  align-items: center;
  border-radius: var(--radius-sm);
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  min-height: 40px;
  padding: 0 var(--space-4);
  text-decoration: none;
}

.button--primary {
  background: var(--color-brand);
  border: 1px solid var(--color-brand);
  color: var(--color-surface);
}

.button--primary:hover:not(:disabled) {
  background: var(--color-brand-strong);
}

.button--secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  color: var(--color-ink);
}

.button--secondary:hover:not(:disabled) {
  background: var(--color-canvas);
}

.button--text {
  background: transparent;
  border: 0;
  color: var(--color-brand);
  min-height: 32px;
  padding: 0 var(--space-2);
}

/*
 * Destructiva: nunca con el peso de la primaria. El borde sale del token de peligro rebajado, no
 * de un color literal (ADR-014).
 */
.button--danger {
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-danger) 45%, var(--color-line));
  color: var(--color-danger);
}

.button--danger:hover:not(:disabled) {
  background: var(--color-danger-soft);
}

.icon-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  display: inline-flex;
  height: 38px;
  justify-content: center;
  padding: 0;
  width: 38px;
}

.icon-button:hover:not(:disabled) {
  background: var(--color-surface-muted);
}

button:disabled {
  opacity: 0.46;
}
</style>
