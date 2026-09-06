<script setup lang="ts">
/**
 * Planificación mensual: las entradas de un mes repartidas por día.
 *
 * Sirve para **comprender la carga y la estacionalidad**, no para ejecutar el trabajo del día —eso
 * es la agenda—. Con una colección grande, un día puede acumular más entradas de las que caben en
 * su celda: entonces se **indica cuántas quedan** en lugar de recortarlas en silencio, porque
 * recortar sin avisar hace creer al usuario que lo ha visto todo (§14.5).
 *
 * **Recibe el mes y la fecha de referencia**; no consulta el reloj. Ver `calendarWeeks.ts`.
 */
import { monthWeeks, shiftMonth } from './calendarWeeks'

export interface CalendarEntry {
  id: string
  /** `YYYY-MM-DD`. */
  date: string
  label: string
  tone?: 'neutral' | 'warning' | 'danger'
}

const props = withDefaults(defineProps<{
  /** `YYYY-MM`. */
  month: string
  /** Hoy, en `YYYY-MM-DD`. Obligatoria: sin ella el componente no sería determinista. */
  today: string
  entries: CalendarEntry[]
  maxPerDay?: number
}>(), { maxPerDay: 3 })

const emit = defineEmits<{ 'update:month': [string], 'select-day': [string] }>()

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const weeks = computed(() => monthWeeks(props.month))

const byDate = computed(() => {
  const map = new Map<string, CalendarEntry[]>()
  for (const entry of props.entries) {
    map.set(entry.date, [...(map.get(entry.date) ?? []), entry])
  }
  return map
})

const entriesOf = (date: string) => byDate.value.get(date) ?? []
const shownOf = (date: string) => entriesOf(date).slice(0, props.maxPerDay)
const hiddenOf = (date: string) => Math.max(0, entriesOf(date).length - props.maxPerDay)

const monthLabel = computed(() => new Date(`${props.month}-01T00:00:00Z`)
  .toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }))

const dayNumber = (date: string) => Number(date.slice(8))
</script>

<template>
  <section class="calendar" aria-label="Calendario mensual">
    <header class="calendar__head">
      <UiButton variant="secondary" data-test="previous-month" @click="emit('update:month', shiftMonth(month, -1))">
        Anterior
      </UiButton>
      <h3>{{ monthLabel }}</h3>
      <UiButton variant="secondary" data-test="next-month" @click="emit('update:month', shiftMonth(month, 1))">
        Siguiente
      </UiButton>
    </header>

    <table>
      <thead>
        <tr>
          <th v-for="(day, index) in WEEKDAYS" :key="day" :abbr="WEEKDAY_NAMES[index]">{{ day }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, index) in weeks" :key="index">
          <td
            v-for="day in week"
            :key="day.date"
            data-role="day"
            :data-date="day.date"
            :data-in-month="String(day.inMonth)"
            :data-today="String(day.date === today)"
          >
            <button type="button" class="calendar__day" @click="emit('select-day', day.date)">
              {{ dayNumber(day.date) }}
            </button>

            <span
              v-for="entry in shownOf(day.date)"
              :key="entry.id"
              class="calendar__entry"
              :class="`is-${entry.tone ?? 'neutral'}`"
              data-role="entry"
            >{{ entry.label }}</span>

            <span v-if="hiddenOf(day.date)" class="calendar__overflow" data-test="overflow">
              +{{ hiddenOf(day.date) }} más
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.calendar__head {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.calendar__head h3 {
  font-size: var(--font-size-17);
  margin: 0;
  text-transform: capitalize;
}

table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}

th {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  letter-spacing: 0.06em;
  padding-bottom: var(--space-1);
  text-align: left;
}

td {
  border: 1px solid var(--color-line);
  height: 96px;
  padding: var(--space-1);
  vertical-align: top;
}

/* Los días de los meses contiguos se atenúan y su fondo cambia: no es solo color de texto. */
td[data-in-month="false"] {
  background: var(--color-canvas);
}

td[data-in-month="false"] .calendar__day {
  color: var(--color-ink-faint);
}

td[data-today="true"] .calendar__day {
  background: var(--color-brand);
  color: var(--color-sidebar-text);
  font-weight: 700;
}

.calendar__day {
  background: transparent;
  border: 0;
  border-radius: var(--radius-pill);
  color: var(--color-ink);
  font-size: var(--font-size-12);
  min-height: 24px;
  min-width: 24px;
  padding: 0 var(--space-1);
}

.calendar__entry {
  background: var(--color-surface-muted);
  border-left: 2px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  display: block;
  font-size: var(--font-size-11);
  margin-top: 2px;
  overflow: hidden;
  padding: 2px var(--space-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar__entry.is-warning {
  border-left-color: var(--color-warning);
}

.calendar__entry.is-danger {
  border-left-color: var(--color-danger);
}

.calendar__overflow {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
  font-weight: 700;
  margin-top: 2px;
  padding: 0 var(--space-1);
}
</style>
