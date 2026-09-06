<script setup lang="ts">
/**
 * Una jerarquía plegable: en el producto, las localizaciones —vivero, invernadero, bancada,
 * bandeja (§16)—, con el recuento de cada nodo.
 *
 * **Recibe el árbol ya construido**, con los hijos anidados; no aplana ni reconstruye jerarquías
 * desde una lista con `parentId`. Construir el árbol es trabajo de la feature, que conoce el
 * modelo; el kit pinta.
 *
 * Se pinta con un componente recursivo —`UiTreeNode`, en este mismo directorio— porque es lo
 * único que admite profundidad arbitraria, y la del producto ya tiene cuatro niveles.
 *
 * El kit **no valida la jerarquía**: quien la construya responde de que sea un árbol. Un ciclo en
 * los datos desbordaría la pila, y evitarlo es responsabilidad de quien los sirve (T-18 lo tiene
 * entre sus criterios de aceptación).
 */
export interface TreeNode {
  id: string
  label: string
  count?: number
  children?: TreeNode[]
}

withDefaults(defineProps<{ nodes: TreeNode[], label?: string }>(), { label: 'Jerarquía' })

const emit = defineEmits<{ select: [string] }>()
</script>

<template>
  <ul class="tree" role="tree" :aria-label="label">
    <UiTreeNode
      v-for="node in nodes"
      :key="node.id"
      :node="node"
      @select="emit('select', $event)"
    />
  </ul>
</template>

<style scoped>
.tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
