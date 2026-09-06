<script setup lang="ts">
/**
 * Un nodo de `UiTree`, y sus descendientes.
 *
 * Se llama a sí mismo: es lo que permite una profundidad arbitraria en lugar de fijar niveles.
 * No se usa suelto; su contrato es el de `UiTree`.
 */
import type { TreeNode } from './UiTree.vue'

const props = defineProps<{ node: TreeNode }>()
const emit = defineEmits<{ select: [string] }>()

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)

// Abierto de partida: quien abre la pantalla quiere ver dónde están sus plantas, no un árbol cerrado.
const expanded = ref(true)
</script>

<template>
  <li class="tree-node" role="treeitem" :aria-expanded="hasChildren ? String(expanded) : undefined">
    <div class="tree-node__row">
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
        {{ node.label }}
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
  display: flex;
  gap: var(--space-1);
  min-height: 36px;
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
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  font: inherit;
  margin-right: auto;
  padding: var(--space-1) var(--space-2);
  text-align: left;
}

.tree-node__label:hover {
  background: var(--color-surface-muted);
}

/* El recuento se distingue del nombre: otra escala, otro color y ancho propio. */
.tree-node__count {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  font-variant-numeric: tabular-nums;
}

.tree-node ul {
  border-left: 1px solid var(--color-line);
  list-style: none;
  margin-left: var(--space-4);
  padding-left: var(--space-2);
}
</style>
