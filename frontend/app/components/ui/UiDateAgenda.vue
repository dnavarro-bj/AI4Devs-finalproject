<script setup lang="ts">
/** Agenda breve agrupada por fecha, con un raíl visual de día y mes. No conoce tareas. */
export interface DateAgendaEntry {
  id: string
  due: string
}

const props = withDefaults(defineProps<{
  entries: DateAgendaEntry[]
  today: string
  emptyMessage?: string
}>(), { emptyMessage: 'No hay trabajo próximo.' })

const groups = computed(() => {
  const grouped = new Map<string, DateAgendaEntry[]>()
  for (const entry of props.entries) {
    const group = grouped.get(entry.due) ?? []
    group.push(entry)
    grouped.set(entry.due, group)
  }
  return [...grouped.entries()].map(([date, entries]) => {
    const value = new Date(`${date}T00:00:00Z`)
    return {
      date,
      entries,
      label: date === props.today
        ? 'Hoy'
        : new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' }).format(value).replace('.', ''),
      day: new Intl.DateTimeFormat('es-ES', { day: '2-digit', timeZone: 'UTC' }).format(value),
      month: new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(value).replace('.', '').slice(0, 3),
    }
  })
})
</script>

<template>
  <section class="date-agenda" aria-label="Próximo trabajo">
    <p v-if="!groups.length" class="date-agenda__empty">{{ emptyMessage }}</p>
    <div v-for="group in groups" v-else :key="group.date" class="date-agenda__group" data-role="date-group">
      <time class="date-agenda__rail" :datetime="group.date">
        <strong>{{ group.label }}</strong>
        <span>{{ group.day }}</span>
        <small>{{ group.month }}</small>
      </time>
      <ul>
        <li v-for="entry in group.entries" :key="entry.id">
          <slot name="entry" :entry="entry" />
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.date-agenda__empty {
  color: var(--color-ink-muted);
  margin: 0;
}

.date-agenda__group {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: var(--space-12) minmax(0, 1fr);
}

.date-agenda__group + .date-agenda__group {
  margin-top: var(--space-4);
}

.date-agenda__rail {
  align-content: start;
  color: var(--color-ink-muted);
  display: grid;
  text-align: center;
  text-transform: uppercase;
}

.date-agenda__rail strong,
.date-agenda__rail small {
  font-size: var(--font-size-11);
}

.date-agenda__rail span {
  color: var(--color-ink);
  font-size: var(--font-size-24);
  font-weight: 700;
  line-height: 1;
  margin: var(--space-1) 0;
}

.date-agenda ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.date-agenda li {
  border-top: 1px solid var(--color-line);
  min-width: 0;
  padding: var(--space-2) 0;
}

@media (max-width: 600px) {
  .date-agenda__group {
    grid-template-columns: var(--space-10) minmax(0, 1fr);
  }
}
</style>
