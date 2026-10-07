<script setup lang="ts">
/**
 * El Dashboard (§4), con la composición de la pantalla `dashboard` del prototipo: «Trabajo de hoy».
 * Cabecera con la fecha y la acción de crear; **tres cifras navegables** antes que cualquier panel;
 * y dos columnas: la **agenda** como principal y, a un lado, las **alertas** y la **carga por zona**.
 *
 * Presenta **trabajo pendiente, no métricas decorativas**: lo vencido va primero y cada cifra abre el
 * conjunto que cuenta, ya filtrado.
 *
 * **Real casi todo, y lo que no, marcado en su sitio.** Reales: las tareas —la agenda y las cifras de
 * vencidas y de hoy—, las alertas —la cifra y las más graves— y la carga por zona. De ejemplo solo el
 * número de tareas por zona (T-24), marcado en la propia tarjeta.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useDashboard } from '@features/dashboard/composables/useDashboard'
import { alertSubject, lastSeenText } from '@features/alerts/mappers/alert.mapper'
import { useTaskWorkflow } from '@features/tasks/composables/useTaskWorkflow'
import type { Task } from '@features/tasks/types/task.types'

useHead({ title: 'Cactify · Dashboard' })
useBreadcrumbs().set([])

const {
  today, load, loadZones, zonesError,
  overdueCount, todayCount, openAlertCount, overdueOverAWeek, periodToday, criticalAlerts,
  dateLabel, agenda, alertsToShow, busiestZones, maxZoneLoad, timing, alertsError, loadAlerts,
} = useDashboard()

// Crear y completar son de la feature de tareas: aquí solo se abren y se recarga lo que cambió.
const workflow = useTaskWorkflow(load)
const asTask = (entry: unknown) => (entry as { task: Task }).task

const alertSignals = computed(() => alertsToShow.value.map((alert) => {
  const subject = alertSubject(alert)
  return {
    id: alert.id,
    title: alert.reason,
    detail: `${subject.label} · ${subject.where}`,
    trailing: lastSeenText(alert, today.value),
    to: subject.to,
    tone: alert.severity === 'critica' ? 'danger' as const : 'warning' as const,
  }
}))

onMounted(load)
</script>

<template>
  <section>
    <UiPageHeader
      title="Trabajo de hoy"
      :eyebrow="dateLabel"
      context="Primero lo vencido; después, lo que puede esperar."
    >
      <template #actions>
        <UiButton data-test="new-task" @click="workflow.openCreate()">
          <span aria-hidden="true">＋</span> Crear tarea
        </UiButton>
      </template>
    </UiPageHeader>

    <div class="summary" data-test="work-summary" role="group" aria-label="Resumen de trabajo">
      <UiStatTile
        :value="overdueCount"
        label="Vencidas"
        :context="overdueOverAWeek ? `${overdueOverAWeek} desde hace más de una semana` : 'Ninguna con más de una semana'"
        to="/tasks?due=overdue"
        tone="danger"
        layout="row"
      />
      <UiStatTile
        :value="todayCount"
        label="Para hoy"
        :context="periodToday ? `${periodToday} dentro de un periodo` : 'Todas de un solo día'"
        to="/tasks?due=today"
        layout="row"
      />
      <UiStatTile
        :value="openAlertCount"
        label="Alertas abiertas"
        :context="criticalAlerts ? `${criticalAlerts} requiere atención inmediata` : 'Ninguna crítica'"
        to="/alerts"
        tone="warning"
        layout="row"
      />
    </div>

    <UiDetailLayout aside-width="wide">
      <UiPanel as="article" eyebrow="Agenda" title="Siguiente trabajo" data-test="agenda-panel">
        <template #action>
          <UiButton variant="text" to="/tasks">Ver agenda</UiButton>
        </template>
        <UiDateAgenda :entries="agenda" :today="today" empty-message="No hay trabajo próximo.">
          <template #entry="{ entry }">
            <TaskRow
              :task="asTask(entry)"
              :main="timing(asTask(entry)).main"
              :hint="timing(asTask(entry)).hint"
              :editable="false"
              @complete="workflow.openComplete(asTask(entry))"
            />
          </template>
        </UiDateAgenda>
      </UiPanel>

      <template #aside>
        <UiPanel as="article" eyebrow="Atención" eyebrow-tone="danger" title="Alertas" data-test="alerts-panel">
          <template #action>
            <UiButton variant="text" to="/alerts">Ver todas</UiButton>
          </template>
          <UiInlineError v-if="alertsError" data-test="alerts-error">
            {{ alertsError }}
            <template #action>
              <UiButton variant="secondary" data-test="retry-alerts" @click="loadAlerts">Reintentar</UiButton>
            </template>
          </UiInlineError>
          <p v-else-if="!alertSignals.length" class="no-alerts" data-test="alerts-empty">No hay ninguna alerta abierta.</p>
          <UiSignalList v-else :items="alertSignals" label="Alertas abiertas" data-test="dashboard-alerts" />
        </UiPanel>

        <UiPanel as="article" eyebrow="Carga por zona" title="Localizaciones" data-test="zones-panel">
          <UiInlineError v-if="zonesError" data-test="zones-error">
            {{ zonesError }}
            <template #action>
              <UiButton variant="secondary" data-test="retry-zones" @click="loadZones">Reintentar</UiButton>
            </template>
          </UiInlineError>
          <ul v-else class="zones">
            <li v-for="zone in busiestZones" :key="zone.id" data-test="zone-load">
              <NuxtLink :to="`/locations/${zone.id}`">
                <strong>{{ zone.name }}</strong>
                <small>{{ zone.plantCountTotal }} plantas</small>
              </NuxtLink>
              <UiProgressBar
                :value="zone.plantCountTotal"
                :max="maxZoneLoad"
                :label="`Carga de ${zone.name}`"
                :show-value="false"
              />
            </li>
          </ul>
          <!-- El prototipo cuenta también las tareas de cada zona: agregarlas por localización es del Dashboard operativo (T-24). -->
          <p class="zone-tasks" data-test="zone-tasks-pending">Tareas por zona · lo habilita T-24</p>
        </UiPanel>
      </template>
    </UiDetailLayout>

    <TaskDialogs :workflow="workflow" />
  </section>
</template>

<style scoped>
.summary {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-bottom: var(--space-5);
}

.zones {
  display: grid;
  gap: var(--space-3);
  list-style: none;
  margin: 0;
  padding: 0;
}

.zones li {
  display: grid;
  gap: var(--space-1);
}

.zones a {
  color: var(--color-ink);
  display: grid;
  text-decoration: none;
}

.zones small,
.zone-tasks,
.no-alerts {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.zone-tasks {
  margin: var(--space-3) 0 0;
}
</style>
