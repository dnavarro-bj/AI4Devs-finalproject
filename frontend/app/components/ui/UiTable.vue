<script setup lang="ts">
/**
 * La tabla del inventario. La primera columna es la identificativa y domina visualmente; las
 * acciones masivas solo existen cuando hay selección, y declaran a cuántos elementos afectan
 * **antes** de ejecutarse (patterns.md, "Selección masiva").
 *
 * Las columnas se declaran con `columns` y su contenido con slots `cell-<key>`; sin slot, la celda
 * pinta el valor de esa clave. Un descriptor de formato en `props` obligaría a inventar un
 * lenguaje que nadie necesita todavía.
 */
type Row = Record<string, unknown>

const props = withDefaults(defineProps<{
  columns: { key: string, label: string }[]
  rows: Row[]
  rowKey: string
  selectable?: boolean
  selected?: string[]
}>(), {
  selectable: false,
  selected: () => [],
})

const emit = defineEmits<{ 'update:selected': [string[]] }>()

const keyOf = (row: Row) => String(row[props.rowKey])

/** El nombre accesible del selector sale de la columna identificativa, la primera. */
const nameOf = (row: Row) => String(row[props.columns[0]?.key ?? props.rowKey] ?? '')

const allSelected = computed(
  () => props.rows.length > 0 && props.rows.every((row) => props.selected.includes(keyOf(row))),
)

function toggleRow(row: Row, checked: boolean) {
  const key = keyOf(row)
  emit('update:selected', checked
    ? [...props.selected, key]
    : props.selected.filter((selected) => selected !== key))
}

function toggleAll(checked: boolean) {
  emit('update:selected', checked ? props.rows.map(keyOf) : [])
}
</script>

<template>
  <div>
    <div v-if="selectable && selected.length" class="selection-bar" data-role="bulk-actions">
      <strong>Selección: {{ selected.length }} de {{ rows.length }}</strong>
      <slot name="bulk-actions" :count="selected.length" />
    </div>

    <div class="table-frame">
      <table>
        <thead>
          <tr>
            <th v-if="selectable" class="select-column">
              <input
                type="checkbox"
                aria-label="Seleccionar todas"
                :checked="allSelected"
                @change="toggleAll(($event.target as HTMLInputElement).checked)"
              >
            </th>
            <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="keyOf(row)">
            <td v-if="selectable" class="select-column">
              <input
                type="checkbox"
                :aria-label="`Seleccionar ${nameOf(row)}`"
                :checked="selected.includes(keyOf(row))"
                @change="toggleRow(row, ($event.target as HTMLInputElement).checked)"
              >
            </td>
            <td v-for="column in columns" :key="column.key" :class="{ 'is-identity': column === columns[0] }">
              <slot :name="`cell-${column.key}`" :row="row">{{ row[column.key] }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.selection-bar {
  align-items: center;
  background: var(--color-brand-strong);
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-text);
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  min-height: 48px;
  padding: var(--space-2) var(--space-3);
}

.selection-bar strong {
  margin-right: auto;
}

/* La comparación entre columnas manda: se desplaza, no se ocultan columnas. */
.table-frame {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
}

th {
  background: var(--color-canvas);
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  letter-spacing: 0.06em;
  padding: var(--space-3);
  text-align: left;
  text-transform: uppercase;
}

td {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  padding: var(--space-3);
}

td.is-identity {
  color: var(--color-ink);
  font-weight: 700;
}

.select-column {
  width: 40px;
}

.select-column input {
  accent-color: var(--color-brand);
  height: 17px;
  width: 17px;
}
</style>
