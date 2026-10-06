<script setup lang="ts">
/**
 * El Dashboard (§4), con la composición de la pantalla `dashboard` del prototipo: «Trabajo de hoy».
 * Cabecera con la fecha y la acción de crear; **tres cifras navegables** antes que cualquier panel;
 * y dos columnas: la **agenda** como principal y, a un lado, las **alertas** y la **carga por zona**.
 *
 * Presenta **trabajo pendiente, no métricas decorativas**: lo vencido va primero y cada cifra abre el
 * conjunto que cuenta, ya filtrado.
 *
 * **Híbrido, y marcado por bloque.** Real: la carga por zona, que sale de las localizaciones. De
 * ejemplo, cada uno con su ticket: la agenda (T-22), las alertas (T-23) y las cifras (T-24). Una
 * advertencia general arriba se lee una vez y se olvida; la marca va en el bloque que simula.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePendingAction } from '@shared/composables/usePendingAction'
import { useDashboard } from '@features/dashboard/composables/useDashboard'
import { useTasks } from '@features/tasks/composables/useTasks'

useHead({ title: 'Cactify · Dashboard' })
useBreadcrumbs().set([])

const {
  today, load, loadZones, zonesError,
  overdueCount, todayCount, openAlertCount, overdueOverAWeek, flexibleToday, criticalAlerts,
  dateLabel, agenda, alertsToShow, busiestZones, maxZoneLoad,
} = useDashboard()

// Cómo se cuenta cuándo es una tarea es de la feature de tareas: aquí solo se pide.
const { timing } = useTasks()

const pendingAction = usePendingAction()

const alertSignals = computed(() => alertsToShow.value.map((alert) => ({
  id: alert.id,
  title: alert.title,
  detail: `${alert.plantCode} · ${alert.location}`,
  trailing: alert.detected,
  to: `/plants/${alert.plantId}`,
  tone: alert.severity === 'critical' ? 'danger' as const : 'warning' as const,
})))

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
        <UiButton data-test="new-task" @click="pendingAction('Crear tarea', 'T-22')">
          <span aria-hidden="true">＋</span> Crear tarea
        </UiButton>
      </template>
    </UiPageHeader>

    <MockNotice ticket="T-24" what="las cifras de trabajo" />
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
        :context="flexibleToday ? `${flexibleToday} sin hora fija` : 'Todas con hora'"
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
        <MockNotice ticket="T-22" what="las tareas" />
        <UiDateAgenda :entries="agenda" :today="today" empty-message="No hay trabajo próximo.">
          <template #entry="{ entry }">
            <TaskRow
              :task="(entry as typeof agenda[number]).task"
              :main="timing((entry as typeof agenda[number]).task).main"
              :hint="timing((entry as typeof agenda[number]).task).hint"
              :editable="false"
              @complete="pendingAction('Completar tarea', 'T-22')"
            />
          </template>
        </UiDateAgenda>
      </UiPanel>

      <template #aside>
        <UiPanel as="article" eyebrow="Atención" eyebrow-tone="danger" title="Alertas" data-test="alerts-panel">
          <template #action>
            <UiButton variant="text" to="/alerts">Ver todas</UiButton>
          </template>
          <MockNotice ticket="T-23" what="las alertas" />
          <UiSignalList :items="alertSignals" label="Alertas abiertas" data-test="dashboard-alerts" />
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
                <small>{{ zone.plantCount }} plantas</small>
              </NuxtLink>
              <UiProgressBar
                :value="zone.plantCount"
                :max="maxZoneLoad"
                :label="`Carga de ${zone.name}`"
                :show-value="false"
              />
            </li>
          </ul>
          <!-- El prototipo cuenta también las tareas de cada zona: no hay tareas reales todavía. -->
          <p class="zone-tasks" data-test="zone-tasks-pending">Tareas por zona · lo habilita T-22</p>
        </UiPanel>
      </template>
    </UiDetailLayout>
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
.zone-tasks {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.zone-tasks {
  margin: var(--space-3) 0 0;
}
</style>
