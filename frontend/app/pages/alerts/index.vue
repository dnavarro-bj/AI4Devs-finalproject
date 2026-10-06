<script setup lang="ts">
/**
 * La bandeja de alertas (§17), con la composición de la pantalla `alerts` del prototipo: cabecera
 * con el recuento de abiertas, barra de filtros y **una tarjeta por alerta**.
 *
 * **Maqueta, y declarada.** No hay alerta con ciclo de vida (T-23): los datos son de ejemplo, el
 * filtro «Origen» espera a que exista un origen que filtrar, y revisar, descartar y crear tarea
 * **no cambian nada**. Una alerta no es una tarea: crear una tarea desde ella no la resuelve.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePendingAction } from '@shared/composables/usePendingAction'
import { useAlerts } from '@features/alerts/composables/useAlerts'

useHead({ title: 'Cactify · Alertas' })
useBreadcrumbs().set([{ label: 'Alertas' }])

const {
  alerts, loading, error, filters, load, visible, openCount,
  stateOptions, severityOptions, locationOptions,
} = useAlerts()

const pendingAction = usePendingAction()

onMounted(load)
</script>

<template>
  <section>
    <UiPageHeader title="Alertas" :context="`Trabajo diario · ${openCount} abiertas`" />

    <p v-if="loading" data-test="loading" role="status">Cargando las alertas…</p>

    <UiInlineError v-else-if="error" data-test="error">{{ error }}</UiInlineError>

    <UiEmptyState v-else-if="!alerts.length" title="No hay ninguna alerta" data-test="empty" mark="⚑">
      Cuando una planta salga de su rango o pase demasiado tiempo sin revisar, aparecerá aquí.
    </UiEmptyState>

    <template v-else>
      <MockNotice ticket="T-23" what="las alertas" />

      <div class="toolbar" role="group" aria-label="Filtros de alertas">
        <UiField v-model="filters.state" label="Estado" as="select" :options="stateOptions" data-test="filter-state" />
        <UiField v-model="filters.severity" label="Severidad" as="select" :options="severityOptions" data-test="filter-severity" />
        <UiField v-model="filters.location" label="Localización" as="select" :options="locationOptions" data-test="filter-location" />
        <UiField
          label="Origen"
          as="select"
          :options="[{ value: '', label: 'Cualquier origen' }]"
          model-value=""
          disabled
          help="Lo habilita T-23"
          data-test="filter-origin"
        />
      </div>

      <p v-if="!visible.length" class="none" data-test="no-match">
        Ninguna alerta coincide con los filtros.
      </p>

      <div class="list">
        <AlertCard
          v-for="alert in visible"
          :key="alert.id"
          :alert="alert"
          @create-task="pendingAction('Crear tarea desde una alerta', 'T-23')"
          @review="pendingAction('Revisar', 'T-23')"
          @dismiss="pendingAction('Descartar', 'T-23')"
        />
      </div>
    </template>
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

.none {
  color: var(--color-ink-muted);
}
</style>
