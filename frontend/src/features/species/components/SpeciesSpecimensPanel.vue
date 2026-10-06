<script setup lang="ts">
/**
 * Resumen/listado de ejemplares asociado a una especie. La estructura se comparte entre el
 * resumen y su pestaña; T-15 sustituirá estas filas marcadas por datos reales y recuentos.
 */
withDefaults(defineProps<{ standalone?: boolean }>(), { standalone: false })
</script>

<template>
  <section
    class="specimens-panel"
    :class="{ 'is-standalone': standalone }"
    data-mock="true"
    data-test="specimens"
  >
    <UiSectionHeader
      title="Ejemplares de esta especie"
      description="Inventario asociado, localización y estado de cada planta."
    >
      <template #actions>
        <UiButton to="/plants" variant="text">Abrir inventario</UiButton>
      </template>
    </UiSectionHeader>

    <div v-if="standalone" class="specimens-panel__toolbar" data-test="specimens-toolbar">
      <UiToolbarField
        label="Buscar ejemplares"
        placeholder="Buscar por código o nombre"
        icon="⌕"
        disabled
      />
      <UiToolbarField
        label="Localización"
        as="select"
        placeholder="Todas las localizaciones"
        disabled
      />
    </div>

    <p class="specimens-panel__notice">
      El API todavía no permite obtener el inventario filtrado por especie. La conexión llega con
      <strong>T-15</strong>.
    </p>

    <div class="specimens" role="table" aria-label="Ejemplares pendientes de conectar">
      <div class="specimens__head" role="row">
        <span role="columnheader">Ejemplar</span>
        <span role="columnheader">Localización</span>
        <span role="columnheader">Estado</span>
      </div>
      <div v-for="n in 3" :key="n" class="specimens__row" role="row">
        <span class="specimens__identity" role="cell">
          <i aria-hidden="true">♧</i>
          <span>— <small>T-15</small></span>
        </span>
        <span role="cell">—</span>
        <span role="cell">—</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.specimens-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.specimens-panel.is-standalone { margin-top: var(--space-5); }

.specimens-panel__toolbar {
  display: flex;
  gap: var(--space-2);
}

.specimens-panel__notice {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.specimens-panel__notice strong,
.specimens__identity small {
  border: 1px dashed var(--color-line-strong);
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

.specimens {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.specimens__head,
.specimens__row {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: minmax(180px, 1.2fr) minmax(140px, 1fr) 100px;
  padding: var(--space-3) var(--space-4);
}

.specimens__head {
  background: var(--color-surface-muted);
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  font-weight: 700;
}

.specimens__row {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-faint);
  font-size: var(--font-size-12);
}

.specimens__identity {
  align-items: center;
  display: flex;
  gap: var(--space-3);
}

.specimens__identity i {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  display: inline-flex;
  font-style: normal;
  height: 34px;
  justify-content: center;
  width: 34px;
}

@media (max-width: 620px) {
  .specimens-panel__toolbar { flex-direction: column; }
  .specimens { overflow-x: auto; }
  .specimens__head, .specimens__row { min-width: 580px; }
}
</style>
