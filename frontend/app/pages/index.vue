<script setup lang="ts">
/**
 * El Dashboard (§4), con la composición de la pantalla `dashboard` del prototipo: «Trabajo de hoy».
 * Cabecera con la fecha y la acción de crear; **acciones rápidas**; **cuatro cifras navegables** antes
 * que cualquier panel; y dos columnas: la **agenda** como principal y, a un lado, las **alertas**, la
 * **carga por zona** y la **actividad reciente**.
 *
 * Presenta **trabajo pendiente, no métricas decorativas**: lo vencido va primero y cada cifra abre el
 * conjunto que cuenta, ya filtrado. **Todo es real y nada lleva marca de maqueta.** Cada bloque carga
 * en paralelo y falla solo, con su error y su reintento.
 *
 * Apartado del prototipo, que no trae estas dos piezas: la fila de acciones rápidas (§4.2) y el panel
 * de actividad reciente (§4.1), y la cuarta cifra, «plantas sin revisar» (historia 1.16).
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
  overdueCount, todayCount, openAlertCount, unreviewedCount, overdueOverAWeek, periodToday, criticalAlerts,
  dateLabel, agenda, alertsToShow, busiestZones, maxZoneLoad, timing, alertsError, loadAlerts,
  tasksError, loadTasks, activityItems, activityError, loadActivity,
} = useDashboard()

// Crear y completar son de la feature de tareas: aquí solo se abren y se recarga lo que cambió.
const workflow = useTaskWorkflow(load)

// «Registrar un cuidado por lote» abre el diálogo de lote **sin alcance**: lo primero que pide es la
// localización, y después dice cuántas plantas afecta. Al terminar se recarga todo: una lectura puede
// haber abierto alertas y el lote ya figura en la actividad.
const batchOpen = ref(false)
function batchDone() {
  batchOpen.value = false
  load()
}
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

    <nav class="quick-actions" data-test="quick-actions" aria-label="Acciones rápidas">
      <UiButton variant="secondary" to="/plants/new" data-test="quick-add-plant"><span aria-hidden="true">＋</span> Añadir planta</UiButton>
      <UiButton variant="secondary" data-test="quick-new-task" @click="workflow.openCreate()"><span aria-hidden="true">＋</span> Crear tarea</UiButton>
      <UiButton variant="secondary" data-test="quick-batch" @click="batchOpen = true">Registrar un cuidado por lote</UiButton>
      <UiButton variant="secondary" to="/tasks" data-test="quick-agenda">Abrir la agenda</UiButton>
      <UiButton variant="secondary" to="/locations" data-test="quick-locations">Abrir las localizaciones</UiButton>
      <UiButton variant="secondary" to="/alerts" data-test="quick-alerts">Revisar alertas</UiButton>
    </nav>

    <div class="summary" data-test="work-summary" role="group" aria-label="Resumen de trabajo">
      <UiStatTile
        :value="overdueCount"
        label="Vencidas"
        :context="overdueOverAWeek ? `${overdueOverAWeek} desde hace más de una semana` : 'Ninguna con más de una semana'"
        to="/tasks?due=overdue"
        :tone="overdueCount ? 'danger' : 'neutral'"
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
        to="/alerts?status=open"
        :tone="openAlertCount ? 'warning' : 'neutral'"
        layout="row"
      />
      <UiStatTile
        :value="unreviewedCount ?? '—'"
        label="Plantas sin revisar"
        :context="unreviewedCount === null ? 'No se ha podido contar' : unreviewedCount ? 'Alertas de seguimiento abiertas' : 'Ninguna alerta de seguimiento abierta'"
        to="/alerts?source=sin_revisar&status=open"
        :tone="unreviewedCount ? 'warning' : 'neutral'"
        layout="row"
      />
    </div>

    <UiDetailLayout aside-width="wide">
      <UiPanel as="article" eyebrow="Agenda" title="Siguiente trabajo" data-test="agenda-panel">
        <template #action>
          <UiButton variant="text" to="/tasks">Ver agenda</UiButton>
        </template>
        <UiInlineError v-if="tasksError" data-test="tasks-error">
          {{ tasksError }}
          <template #action>
            <UiButton variant="secondary" data-test="retry-tasks" @click="loadTasks">Reintentar</UiButton>
          </template>
        </UiInlineError>
        <UiDateAgenda v-else :entries="agenda" :today="today" empty-message="No hay trabajo próximo.">
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
                <small>{{ zone.summary }}</small>
              </NuxtLink>
              <UiProgressBar
                :value="zone.plantCountTotal"
                :max="maxZoneLoad"
                :label="`Carga de ${zone.name}`"
                :show-value="false"
              />
            </li>
          </ul>
        </UiPanel>

        <UiPanel as="article" eyebrow="Actividad" title="Actividad reciente" data-test="activity-panel">
          <UiInlineError v-if="activityError" data-test="activity-error">
            {{ activityError }}
            <template #action>
              <UiButton variant="secondary" data-test="retry-activity" @click="loadActivity">Reintentar</UiButton>
            </template>
          </UiInlineError>
          <p v-else-if="!activityItems.length" class="no-alerts" data-test="activity-empty">Todavía no se ha hecho nada.</p>
          <UiSignalList v-else :items="activityItems" label="Actividad reciente" data-test="dashboard-activity" />
        </UiPanel>
      </template>
    </UiDetailLayout>

    <TaskDialogs :workflow="workflow" />
    <BatchDialog
      :open="batchOpen"
      action="reading"
      choose-action
      :scope="null"
      @done="batchDone"
      @close="batchOpen = false"
    />
  </section>
</template>

<style scoped>
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

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
.no-alerts {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}
</style>
