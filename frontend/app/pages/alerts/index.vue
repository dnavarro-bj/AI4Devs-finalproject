<script setup lang="ts">
/**
 * La bandeja de alertas (§17), con la composición de la pantalla `alerts` del prototipo: cabecera
 * con el recuento de abiertas, barra de filtros —estado, severidad, localización y origen— y **una
 * tarjeta por alerta**.
 *
 * **Datos reales.** Los filtros viajan al servidor y la lista se pagina; por defecto, las abiertas.
 * Las acciones son reales y se leen por estado: revisar, resolver y descartar son transiciones
 * explícitas —una alerta se cierra siempre por una persona—, y **crear una tarea no la resuelve ni
 * la revisa**. La tarea sale con tipo, título, destino y prioridad precompletados desde la alerta.
 *
 * Se aparta del prototipo en tres cosas, por falta de la maqueta y no por recorte: ofrece
 * «Resolver» (sin ella el ciclo no se recorre), dice las ocurrencias de una alerta repetida y
 * muestra cómo se cerraron las cerradas.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useOnVisible } from '@shared/composables/useOnVisible'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useAlerts } from '@features/alerts/composables/useAlerts'
import { useAlertActions } from '@features/alerts/composables/useAlertActions'
import { taskInitialFromAlert } from '@features/alerts/mappers/alert.mapper'
import { ALERT_STATUSES, type Alert } from '@features/alerts/types/alert.types'
import { useTaskWorkflow } from '@features/tasks/composables/useTaskWorkflow'

useHead({ title: 'Cactify · Alertas' })
useBreadcrumbs().set([{ label: 'Alertas' }])

const route = useRoute()
const today = useReferenceDate()

const one = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
const scope = { plant: one(route.query.plant), location: one(route.query.location) }

const {
  alerts, total, openTotal, loading, loadingMore, error, filters, hasMore,
  load, reload, loadMore, loadLocations,
  stateOptions, severityOptions, sourceOptions, locationOptions,
} = useAlerts(scope)

const status = one(route.query.status)
if (status && (status === 'all' || status === 'open' || (ALERT_STATUSES as string[]).includes(status))) {
  filters.state = status
}

const actions = useAlertActions()
const workflow = useTaskWorkflow(reload)

const closing = reactive({ open: false, alert: null as Alert | null, action: 'resolve' as 'resolve' | 'dismiss' })

function askToClose(alert: Alert, action: 'resolve' | 'dismiss') {
  actions.reset()
  closing.alert = alert
  closing.action = action
  closing.open = true
}

async function review(alert: Alert) {
  if (await actions.transition(alert.id, 'review')) await reload()
}

async function close(comment: string | undefined) {
  if (!closing.alert) return
  const done = await actions.transition(closing.alert.id, closing.action, comment)
  if (!done) {
    // Un 409 suele ser que la alerta ya estaba cerrada: la lista se pone al día sin cerrar el diálogo.
    await reload()
    return
  }
  closing.open = false
  await reload()
}

const sentinel = ref<HTMLElement | null>(null)
useOnVisible(sentinel, () => {
  if (!error.value) loadMore()
})

const isDefaultView = computed(() => filters.state === 'open' && !filters.severity && !filters.source && !filters.location)

onMounted(() => {
  load()
  loadLocations()
})
</script>

<template>
  <section>
    <UiPageHeader title="Alertas" :context="`Trabajo diario · ${openTotal} abiertas`" />

    <p v-if="scope.plant || scope.location" class="scope" data-test="scope-note">
      Filtradas por {{ scope.plant ? 'un ejemplar' : 'una localización' }} ·
      <NuxtLink to="/alerts">Ver todas</NuxtLink>
    </p>

    <div class="toolbar" role="group" aria-label="Filtros de alertas">
      <UiField v-model="filters.state" label="Estado" as="select" :options="stateOptions" data-test="filter-state" />
      <UiField v-model="filters.severity" label="Severidad" as="select" :options="severityOptions" data-test="filter-severity" />
      <UiField
        v-if="!scope.location"
        v-model="filters.location"
        label="Localización"
        as="select"
        :options="locationOptions"
        data-test="filter-location"
      />
      <UiField v-model="filters.source" label="Origen" as="select" :options="sourceOptions" data-test="filter-origin" />
    </div>

    <p v-if="loading" data-test="loading" role="status">Cargando las alertas…</p>

    <UiInlineError v-else-if="error && !alerts.length" title="No se han podido cargar las alertas" data-test="error">
      {{ error }}
      <template #action>
        <UiButton variant="secondary" data-test="retry" @click="load()">Reintentar</UiButton>
      </template>
    </UiInlineError>

    <UiEmptyState v-else-if="!alerts.length && isDefaultView" title="No hay ninguna alerta abierta" data-test="empty" mark="⚑">
      Cuando una planta salga de su rango o pase demasiado tiempo sin revisar, aparecerá aquí.
    </UiEmptyState>

    <p v-else-if="!alerts.length" class="none" data-test="no-match">
      Ninguna alerta coincide con los filtros.
    </p>

    <template v-else>
      <div class="list">
        <AlertCard
          v-for="alert in alerts"
          :key="alert.id"
          :alert="alert"
          :today="today"
          @create-task="workflow.openCreate(taskInitialFromAlert(alert))"
          @review="review(alert)"
          @resolve="askToClose(alert, 'resolve')"
          @dismiss="askToClose(alert, 'dismiss')"
        />
      </div>

      <UiInlineError v-if="error" data-test="more-error">{{ error }}</UiInlineError>
      <div v-if="hasMore" ref="sentinel" class="more" data-test="alerts-sentinel">
        <UiButton variant="secondary" :busy="loadingMore" data-test="load-more" @click="loadMore()">
          Cargar más alertas
        </UiButton>
      </div>
      <p class="count" data-test="alerts-total">{{ total }} {{ total === 1 ? 'alerta' : 'alertas' }}</p>
    </template>

    <AlertCloseDialog
      :open="closing.open"
      :alert="closing.alert"
      :action="closing.action"
      :busy="actions.submitting.value"
      :error="actions.error.value"
      @submit="close"
      @close="closing.open = false"
    />
    <TaskDialogs :workflow="workflow" />
  </section>
</template>

<style scoped>
.toolbar {
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.list {
  display: grid;
  gap: var(--space-3);
}

.none,
.scope,
.count {
  color: var(--color-ink-muted);
}

.more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-4);
}

.count {
  font-size: var(--font-size-12);
  margin-top: var(--space-3);
}
</style>
