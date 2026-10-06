<script setup lang="ts">
/**
 * Un nodo de `UiTree`, y sus descendientes.
 *
 * Se llama a sí mismo: es lo que permite una profundidad arbitraria en lugar de fijar niveles.
 * No se usa suelto; su contrato es el de `UiTree`.
 */
import type { TreeNode } from './UiTree.vue'

const props = defineProps<{ node: TreeNode, selected?: string }>()
const emit = defineEmits<{ select: [string] }>()

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)

// Abierto de partida: quien abre la pantalla quiere ver dónde están sus plantas, no un árbol cerrado.
const expanded = ref(true)
</script>

<template>
  <li class="tree-node" role="treeitem" :aria-expanded="hasChildren ? String(expanded) : undefined">
    <div class="tree-node__row" :class="{ 'is-selected': node.id === selected }">
      <button
        v-if="hasChildren"
        type="button"
        class="tree-node__toggle"
        :data-test="`toggle-${node.id}`"
        :aria-expanded="String(expanded)"
        :aria-label="`${expanded ? 'Plegar' : 'Desplegar'} ${node.label}`"
        @click="expanded = !expanded"
      >
        <span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
      </button>
      <!-- La hoja no lleva control, pero sí su hueco: los nombres siguen alineados. -->
      <span v-else class="tree-node__toggle" aria-hidden="true" />

      <button
        type="button"
        class="tree-node__label"
        :data-test="`select-${node.id}`"
        @click="emit('select', node.id)"
      >
        <span v-if="node.mark" class="tree-node__mark" aria-hidden="true">{{ node.mark }}</span>
        <span class="tree-node__copy">
          <strong>{{ node.label }}</strong>
          <small v-if="node.detail">{{ node.detail }}</small>
        </span>
      </button>

      <span
        v-if="node.count !== undefined"
        class="tree-node__count"
        :data-test="`count-${node.id}`"
      >{{ node.count }}</span>
    </div>

    <ul v-if="hasChildren && expanded" role="group">
      <UiTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected="selected"
        @select="emit('select', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.tree-node {
  list-style: none;
}

.tree-node__row {
  align-items: center;
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-1);
  grid-template-columns: 24px minmax(0, 1fr) auto;
  min-height: 47px;
  padding: var(--space-1);
}

.tree-node__row:hover {
  background: var(--color-surface-muted);
}

.tree-node__row.is-selected {
  background: var(--color-brand-strong);
  color: var(--color-sidebar-text);
}

.tree-node__toggle {
  background: transparent;
  border: 0;
  color: var(--color-ink-muted);
  flex-shrink: 0;
  height: 24px;
  padding: 0;
  width: 24px;
}

.tree-node__label {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  display: grid;
  font: inherit;
  gap: var(--space-2);
  grid-template-columns: auto minmax(0, 1fr);
  margin-right: auto;
  padding: var(--space-1) var(--space-2);
  text-align: left;
  width: 100%;
}

.tree-node__row.is-selected .tree-node__label,
.tree-node__row.is-selected .tree-node__toggle,
.tree-node__row.is-selected .tree-node__count {
  color: var(--color-sidebar-text);
}

.tree-node__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-13);
  height: 29px;
  justify-content: center;
  width: 29px;
}

.tree-node__row.is-selected .tree-node__mark {
  background: color-mix(in srgb, var(--color-sidebar-text) 14%, transparent);
  color: var(--color-sidebar-text);
}

.tree-node__copy strong,
.tree-node__copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node__copy strong {
  font-size: var(--font-size-12);
}

.tree-node__copy small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: 2px;
}

.tree-node__row.is-selected .tree-node__copy small {
  color: color-mix(in srgb, var(--color-sidebar-text) 72%, transparent);
}

/* El recuento se distingue del nombre: otra escala, otro color y ancho propio. */
.tree-node__count {
  background: var(--color-surface-muted);
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  font-variant-numeric: tabular-nums;
  min-width: 28px;
  padding: var(--space-1) var(--space-2);
  text-align: center;
}

.tree-node__row.is-selected .tree-node__count {
  background: color-mix(in srgb, var(--color-sidebar-text) 14%, transparent);
}

.tree-node ul {
  border-left: 1px solid var(--color-line);
  list-style: none;
  margin-left: var(--space-4);
  padding-left: var(--space-2);
}
</style>
