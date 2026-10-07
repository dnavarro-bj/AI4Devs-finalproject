<script setup lang="ts">
/**
 * La pestaña «Floración»: las floraciones **observadas** del ejemplar, la más reciente primero.
 * Una abierta se puede cerrar y cualquiera, corregir o retirar. No mezcla la floración esperada de
 * la especie —son datos distintos y la una no modifica la otra—.
 *
 * Presenta y emite: guardar es de quien la usa (ADR-015).
 */
import { BLOOM_STATUS_LABELS, bloomInterval } from '../mappers/timeline.mapper'
import type { TimelineEntry } from '../types/timeline.types'

defineProps<{ blooms: TimelineEntry[], loading?: boolean, error?: string | null }>()
const emit = defineEmits<{ create: [], edit: [TimelineEntry], close: [TimelineEntry], remove: [TimelineEntry] }>()
</script>

<template>
  <UiPanel title="Floraciones observadas" data-test="bloom-panel">
    <template #action>
      <UiButton data-test="add-bloom" @click="emit('create')">＋ Registrar floración</UiButton>
    </template>

    <p v-if="loading" role="status">Cargando las floraciones…</p>
    <UiInlineError v-else-if="error" data-test="bloom-panel-error">{{ error }}</UiInlineError>

    <UiEmptyState v-else-if="!blooms.length" title="Todavía no hay floraciones registradas" mark="✣" data-test="blooms-empty">
      Anota la primera cuando este ejemplar florezca.
      <template #action>
        <UiButton variant="secondary" data-test="add-first-bloom" @click="emit('create')">Registrar la primera</UiButton>
      </template>
    </UiEmptyState>

    <ul v-else class="blooms">
      <li v-for="entry in blooms" :key="entry.id" class="blooms__row" data-role="bloom">
        <div>
          <strong>{{ bloomInterval(entry.bloom!) }}</strong>
          <small>
            {{ BLOOM_STATUS_LABELS[entry.bloom!.status] }}
            <template v-if="entry.bloom!.flowerCount != null"> · ~{{ entry.bloom!.flowerCount }} flores</template>
          </small>
          <small v-if="entry.bloom!.notes">{{ entry.bloom!.notes }}</small>
        </div>
        <div class="blooms__actions">
          <UiButton v-if="entry.bloom!.status !== 'finalizada'" variant="secondary" data-test="close-bloom" @click="emit('close', entry)">Cerrar</UiButton>
          <UiButton variant="text" data-test="edit-bloom" @click="emit('edit', entry)">Corregir</UiButton>
          <UiButton variant="text" data-test="remove-bloom" @click="emit('remove', entry)">Retirar</UiButton>
        </div>
      </li>
    </ul>
  </UiPanel>
</template>

<style scoped>
.blooms {
  list-style: none;
  margin: 0;
  padding: 0;
}

.blooms__row {
  align-items: center;
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  padding: var(--space-3) 0;
}

.blooms__row small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-12);
}

.blooms__actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-1);
}
</style>
