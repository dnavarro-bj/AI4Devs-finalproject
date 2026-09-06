<script setup lang="ts">
/**
 * La cronología de un ejemplar: eventos heterogéneos en una sola línea temporal, del más reciente
 * al más antiguo (§7.3 del documento de producto).
 *
 * **No conoce los tipos del producto.** Recibe qué tipos existen y pinta el contenido de cada
 * evento por slot `event-<tipo>`, así que T-20 podrá añadir floraciones o movimientos sin tocar
 * este fichero. Es lo que mantiene el kit fuera de las features (ADR-015).
 *
 * Un tipo que no esté en `types` **se muestra igual**, con una representación de reserva:
 * ocultarlo escondería algo que ocurrió de verdad.
 *
 * Una fotografía, un comentario breve y una alerta piden densidades distintas; por eso el cuerpo
 * lo pone quien la usa y aquí solo se garantiza el orden y la cabecera.
 */
export interface TimelineEvent {
  id: string
  type: string
  title: string
  /** Marca temporal en ISO. Ordena y se expone en `datetime`. */
  at: string
}

export interface TimelineType {
  value: string
  label: string
  mark?: string
}

const props = withDefaults(defineProps<{
  events: TimelineEvent[]
  types: TimelineType[]
  emptyMessage?: string
}>(), { emptyMessage: 'Todavía no hay nada registrado para esta planta.' })

const activeType = ref<string | null>(null)

/** Ordenar es del componente: quien sirve los eventos no tiene por qué garantizar el orden. */
const ordered = computed(
  () => [...props.events].sort((a, b) => b.at.localeCompare(a.at)),
)

const shown = computed(
  () => (activeType.value ? ordered.value.filter((event) => event.type === activeType.value) : ordered.value),
)

/** Un tipo desconocido no tiene etiqueta declarada, así que se muestra por su valor crudo. */
function typeOf(event: TimelineEvent): TimelineType {
  return props.types.find((type) => type.value === event.type) ?? { value: event.type, label: event.type, mark: '•' }
}

function formatDate(at: string): string {
  return new Date(at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <section class="timeline" aria-label="Cronología">
    <div class="timeline__filters" role="group" aria-label="Filtrar por tipo de evento">
      <UiButton
        :variant="activeType === null ? 'secondary' : 'text'"
        data-test="filter-all"
        @click="activeType = null"
      >
        Todos
      </UiButton>
      <UiButton
        v-for="type in types"
        :key="type.value"
        :variant="activeType === type.value ? 'secondary' : 'text'"
        :data-test="`filter-${type.value}`"
        @click="activeType = type.value"
      >
        {{ type.label }}
      </UiButton>
    </div>

    <p v-if="!shown.length" class="timeline__empty">{{ emptyMessage }}</p>

    <ol v-else class="timeline__list">
      <li v-for="event in shown" :key="event.id" class="timeline__event" data-role="event">
        <span class="timeline__mark" aria-hidden="true">{{ typeOf(event).mark ?? '•' }}</span>
        <article class="timeline__card">
          <header>
            <div>
              <span class="timeline__type">{{ typeOf(event).label }}</span>
              <h3>{{ event.title }}</h3>
            </div>
            <time :datetime="event.at">{{ formatDate(event.at) }}</time>
          </header>
          <slot :name="`event-${event.type}`" :event="event" />
        </article>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.timeline__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}

.timeline__empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.timeline__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline__event {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 32px 1fr;
  padding-bottom: var(--space-4);
  position: relative;
}

/* La línea une los eventos; el último no la prolonga hacia la nada. */
.timeline__event:not(:last-child)::before {
  background: var(--color-line);
  bottom: 0;
  content: '';
  left: 15px;
  position: absolute;
  top: 32px;
  width: 1px;
}

.timeline__mark {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 50%;
  color: var(--color-ink-muted);
  display: flex;
  height: 32px;
  justify-content: center;
  width: 32px;
  z-index: 1;
}

.timeline__card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.timeline__card header {
  align-items: flex-start;
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
}

.timeline__type {
  color: var(--color-ink-faint);
  display: block;
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.timeline__card h3 {
  font-size: var(--font-size-15);
  margin: 0;
}

.timeline__card time {
  color: var(--color-ink-muted);
  flex-shrink: 0;
  font-size: var(--font-size-12);
}
</style>
