<script setup lang="ts">
/**
 * Movimientos de ejemplares, del más reciente al más antiguo (el orden lo pone el API).
 *
 * Dos perspectivas: la de una **localización** —cada movimiento es recibido o cedido, según el
 * sentido respecto a ella— y la de un **ejemplar** —de dónde a dónde—. El sentido sale de
 * comparar el destino con la localización, no de un campo que el API tuviera que traer.
 */
import type { PlantMovement } from '../types/location.types'

const props = defineProps<{
  movements: PlantMovement[]
  /** La localización desde la que se mira. Sin ella, la perspectiva es la del ejemplar. */
  locationId?: string
}>()

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

const received = (movement: PlantMovement) => props.locationId !== undefined && movement.to.id === props.locationId
</script>

<template>
  <ol class="movement-list" data-test="movement-list">
    <li v-for="movement in movements" :key="movement.id" data-test="movement">
      <span class="movement-list__mark" aria-hidden="true">{{ locationId === undefined ? '⇄' : received(movement) ? '⇢' : '⇠' }}</span>
      <span class="movement-list__copy">
        <template v-if="locationId !== undefined">
          <strong>{{ movement.plantCode }}</strong>
          <span v-if="received(movement)" data-test="movement-direction">recibida desde {{ movement.from.name }}</span>
          <span v-else data-test="movement-direction">cedida a {{ movement.to.name }}</span>
        </template>
        <template v-else>
          <strong data-test="movement-route">{{ movement.from.name }} → {{ movement.to.name }}</strong>
        </template>
        <time :datetime="movement.movedAt">{{ formatDate(movement.movedAt) }}</time>
      </span>
    </li>
  </ol>
</template>

<style scoped>
.movement-list {
  display: grid;
  gap: var(--space-3);
  list-style: none;
  margin: 0;
  padding: 0;
}

.movement-list li {
  align-items: start;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr;
}

.movement-list__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand-strong);
  display: flex;
  height: 29px;
  justify-content: center;
  width: 29px;
}

.movement-list__copy {
  display: grid;
  font-size: var(--font-size-12);
  gap: 2px;
}

.movement-list__copy time {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}
</style>
