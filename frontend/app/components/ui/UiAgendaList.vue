<script setup lang="ts">
/**
 * El trabajo pendiente agrupado por vencimiento: vencido, hoy, próximos días y posterior.
 *
 * Es la vista operativa por defecto del módulo de tareas (§14.5): para una colección grande el
 * calendario mensual no basta —demasiadas entradas en una celda dejan de ser legibles—, y quien
 * va a trabajar necesita saber por dónde empezar, no cómo se reparte el mes.
 *
 * **Recibe la fecha de referencia**; no la consulta. Ver `agendaGrouping.ts`.
 */
import { groupByDueness, type DueEntry } from './agendaGrouping'

export interface AgendaEntry extends DueEntry {
  title: string
  detail?: string
}

const props = withDefaults(defineProps<{
  entries: AgendaEntry[]
  /** Hoy, en `YYYY-MM-DD`. Obligatoria a propósito: sin ella el componente no sería determinista. */
  today: string
  emptyMessage?: string
}>(), { emptyMessage: 'No hay trabajo pendiente.' })

const emit = defineEmits<{ select: [string] }>()

const groups = computed(() => groupByDueness(props.entries, props.today))

function formatDate(due: string): string {
  return new Date(`${due}T00:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
</script>

<template>
  <section class="agenda" aria-label="Agenda de trabajo">
    <p v-if="!groups.length" class="agenda__empty">{{ emptyMessage }}</p>

    <div
      v-for="group in groups"
      v-else
      :key="group.key"
      class="agenda__group"
      data-role="group"
      :data-dueness="group.key"
    >
      <h3>{{ group.label }} <span>{{ group.entries.length }}</span></h3>

      <ul>
        <li v-for="entry in group.entries" :key="entry.id" data-role="entry">
          <button type="button" @click="emit('select', entry.id)">
            <span class="agenda__title">{{ entry.title }}</span>
            <span v-if="entry.detail" class="agenda__detail">{{ entry.detail }}</span>
          </button>
          <time :datetime="entry.due">{{ formatDate(entry.due) }}</time>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.agenda__empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.agenda__group + .agenda__group {
  margin-top: var(--space-5);
}

.agenda__group h3 {
  align-items: center;
  color: var(--color-ink-muted);
  display: flex;
  font-size: var(--font-size-11);
  gap: var(--space-2);
  letter-spacing: 0.06em;
  margin: 0 0 var(--space-2);
  text-transform: uppercase;
}

.agenda__group h3 span {
  background: var(--color-surface-muted);
  border-radius: var(--radius-pill);
  padding: 0 var(--space-2);
}

/* Lo vencido se lee además de verse: el grupo lleva su nombre, no solo su color. */
.agenda__group[data-dueness="overdue"] h3 {
  color: var(--color-danger);
}

.agenda__group[data-dueness="overdue"] h3 span {
  background: var(--color-danger-soft);
}

.agenda__group ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.agenda__group li {
  align-items: center;
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-3);
  min-height: 48px;
}

.agenda__group button {
  background: transparent;
  border: 0;
  color: var(--color-ink);
  font: inherit;
  margin-right: auto;
  padding: var(--space-2) 0;
  text-align: left;
}

.agenda__title {
  display: block;
  font-weight: 700;
}

.agenda__detail {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-12);
}

.agenda__group time {
  color: var(--color-ink-muted);
  flex-shrink: 0;
  font-size: var(--font-size-12);
}
</style>
