<script setup lang="ts">
/**
 * El resumen de estado de una entidad: «de un vistazo».
 *
 * **No es la métrica navegable del Dashboard.** `UiStatTile` existe para una cifra grande que
 * lleva a su conjunto —«12 alertas importantes»—; esto es otra cosa: cuatro magnitudes leídas de
 * corrido para responder «cómo está esto ahora». El valor es una **línea compacta**, no un número:
 * «16 ago · 450 ml», «24 °C · 31 %», «Mayo de 2026». Confundirlos convierte un resumen en un panel
 * de indicadores, que es justo lo que el documento de producto pide no hacer.
 *
 * Una sola superficie dividida por líneas internas, no tarjetas sueltas: las magnitudes se
 * comparan entre sí y separarlas en cajas rompe esa lectura.
 */
export interface SummaryItem {
  label: string
  value: string
  note?: string
  /** Marca la magnitud como dato de ejemplo cuando el API todavía no la sirve. */
  mock?: boolean
  /** `true` cuando la magnitud no se informó: se muestra igual, atenuada. */
  absent?: boolean
}

withDefaults(defineProps<{
  items: SummaryItem[]
  title?: string
  eyebrow?: string
  /**
   * `compact` para el resumen dentro de otra cosa —los valores de una lectura en la cronología—:
   * mismo patrón, misma lectura comparada, menos aire.
   */
  density?: 'comfortable' | 'compact'
}>(), { title: undefined, eyebrow: undefined, density: 'comfortable' })
</script>

<template>
  <section class="summary">
    <header v-if="title || eyebrow || $slots.action" class="summary__head">
      <div>
        <p v-if="eyebrow" class="summary__eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title">{{ title }}</h2>
      </div>
      <div v-if="$slots.action" data-test="summary-action"><slot name="action" /></div>
    </header>

    <div
      v-if="items.length"
      class="summary__grid"
      :class="[`is-${density}`, `has-${items.length}`]"
      data-role="summary-grid"
    >
      <div
        v-for="item in items"
        :key="item.label"
        data-role="summary-item"
        :data-mock="item.mock ? 'true' : undefined"
        :data-absent="item.absent ? 'true' : undefined"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small v-if="item.note">{{ item.note }}</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.summary__head {
  align-items: flex-end;
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.summary__eyebrow {
  color: var(--color-brand);
  font-size: var(--font-size-11);
  font-weight: 800;
  letter-spacing: 0.13em;
  margin: 0 0 2px;
  text-transform: uppercase;
}

.summary__head h2 {
  font-size: var(--font-size-17);
  margin: 0;
}

/* Una superficie, dividida: las magnitudes se comparan entre sí. */
.summary__grid {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  overflow: hidden;
}

/* Una lectura puede traer entre una y cinco medidas: la rejilla se ajusta a las que haya. */
.summary__grid.has-1 { grid-template-columns: 1fr; }
.summary__grid.has-2 { grid-template-columns: repeat(2, 1fr); }
.summary__grid.has-3 { grid-template-columns: repeat(3, 1fr); }
.summary__grid.has-5 { grid-template-columns: repeat(5, 1fr); }

.summary__grid > div {
  min-height: 95px;
  padding: var(--space-4);
}

/* Compacta: cabe dentro de una tarjeta de evento sin robarle el protagonismo al texto. */
.summary__grid.is-compact {
  border-radius: var(--radius-sm);
}

.summary__grid.is-compact > div {
  min-height: 0;
  padding: var(--space-2);
}

.summary__grid.is-compact span {
  font-size: var(--font-size-11);
  margin-bottom: 0;
}

.summary__grid.is-compact strong {
  font-size: var(--font-size-12);
}

.summary__grid > div + div {
  border-left: 1px solid var(--color-line);
}

.summary__grid span,
.summary__grid strong,
.summary__grid small {
  display: block;
}

.summary__grid span {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-bottom: var(--space-2);
}

.summary__grid strong {
  font-size: var(--font-size-13);
}

.summary__grid small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: 3px;
}

/* La ausencia se atenúa: está para que la columna exista, no para competir con los datos. */
.summary__grid > div[data-absent="true"] strong {
  color: var(--color-ink-faint);
}

/* La marca de ejemplo se ve además de leerse, como en el resto de la ficha. */
.summary__grid > div[data-mock="true"] strong {
  border-bottom: 1px dashed var(--color-line-strong);
}

@media (max-width: 1100px) {
  .summary__grid {
    grid-template-columns: 1fr 1fr;
  }

  .summary__grid > div:nth-child(3) {
    border-left: 0;
  }

  .summary__grid > div:nth-child(n+3) {
    border-top: 1px solid var(--color-line);
  }
}

@media (max-width: 600px) {
  .summary__grid {
    grid-template-columns: 1fr;
  }

  .summary__grid > div + div {
    border-left: 0;
    border-top: 1px solid var(--color-line);
  }
}
</style>
