<script setup lang="ts">
/**
 * Aviso: severidad, título accionable, explicación breve y, si procede, una acción.
 *
 * Descartarlo es un gesto visual y nada más: no resuelve la condición de dominio que lo originó,
 * y por eso el componente no emite nada parecido a «resuelto».
 */
type Severity = 'info' | 'warning' | 'danger'

const SEVERITY_LABELS: Record<Severity, string> = {
  info: 'Información',
  warning: 'Atención',
  danger: 'Riesgo alto',
}

const MARKS: Record<Severity, string> = { info: 'i', warning: '!', danger: '×' }

withDefaults(defineProps<{ severity?: Severity, title: string, dismissible?: boolean }>(), {
  severity: 'info',
  dismissible: false,
})

defineEmits<{ dismiss: [] }>()
</script>

<template>
  <article :class="['notice', `notice--${severity}`]">
    <span class="mark" aria-hidden="true">{{ MARKS[severity] }}</span>
    <div>
      <!-- La severidad también en texto: nunca solo el color. -->
      <span class="sr-only">{{ SEVERITY_LABELS[severity] }}:</span>
      <strong>{{ title }}</strong>
      <p v-if="$slots.default"><slot /></p>
    </div>
    <slot name="action" />
    <UiButton
      v-if="dismissible"
      variant="icon"
      label="Descartar aviso"
      data-role="dismiss"
      @click="$emit('dismiss')"
    >
      ×
    </UiButton>
  </article>
</template>

<style scoped>
/* La marca, el cuerpo, la acción y el descarte van en una sola fila: el descarte no baja. */
.notice {
  align-items: center;
  border: 1px solid;
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto auto;
  padding: var(--space-3) var(--space-4);
}

.notice--info {
  background: var(--color-info-soft);
  border-color: color-mix(in srgb, var(--color-info) 30%, var(--color-line));
}

.notice--warning {
  background: var(--color-warning-soft);
  border-color: color-mix(in srgb, var(--color-warning) 30%, var(--color-line));
}

.notice--danger {
  background: var(--color-danger-soft);
  border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-line));
}

.mark {
  align-items: center;
  border-radius: 50%;
  color: var(--color-surface);
  display: flex;
  font-weight: 800;
  height: 26px;
  justify-content: center;
  width: 26px;
}

.notice--info .mark {
  background: var(--color-info);
}

.notice--warning .mark {
  background: var(--color-warning);
}

.notice--danger .mark {
  background: var(--color-danger);
}

.notice strong {
  display: block;
}

.notice p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-1) 0 0;
}
</style>
