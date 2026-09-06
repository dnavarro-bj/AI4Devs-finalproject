<script setup lang="ts">
/**
 * Un periodo del año por meses: épocas de crecimiento, reposo y floración (§9.4).
 *
 * **El año es un ciclo**: un periodo de noviembre a febrero es uno solo, no dos. Resolverlo aquí
 * evita que cada pantalla tenga que saber si su periodo cruza diciembre, que es justo lo que este
 * componente existe para ocultar.
 */
const props = defineProps<{
  /** Mes de inicio, 1–12. */
  from: number
  /** Mes de fin, 1–12. Puede ser anterior al de inicio: entonces el periodo cruza el año. */
  to: number
  label: string
}>()

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Recorriendo el año hacia delante desde `from`: si `to` es anterior, el arco cruza diciembre. */
function includes(month: number): boolean {
  return props.from <= props.to
    ? month >= props.from && month <= props.to
    : month >= props.from || month <= props.to
}

const spoken = computed(() => `De ${FULL[props.from - 1]} a ${FULL[props.to - 1]}`)
</script>

<template>
  <div class="month-range">
    <p class="month-range__label">{{ label }} · <span>{{ spoken }}</span></p>
    <ol>
      <li
        v-for="(month, index) in MONTHS"
        :key="month"
        :data-month="index + 1"
        :data-included="String(includes(index + 1))"
      >{{ month }}</li>
    </ol>
  </div>
</template>

<style scoped>
.month-range__label {
  font-size: var(--font-size-13);
  font-weight: 700;
  margin: 0 0 var(--space-2);
}

.month-range__label span {
  color: var(--color-ink-muted);
  font-weight: 400;
}

.month-range ol {
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(12, 1fr);
  list-style: none;
  margin: 0;
  padding: 0;
}

.month-range li {
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  padding: var(--space-1) 0;
  text-align: center;
}

/* El mes incluido cambia fondo, color y peso: no depende solo del color. */
.month-range li[data-included="true"] {
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
  font-weight: 700;
}
</style>
