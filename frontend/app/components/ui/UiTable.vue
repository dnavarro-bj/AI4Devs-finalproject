<script setup lang="ts">
/**
 * La tabla del inventario. La primera columna es la identificativa y domina visualmente; las
 * acciones masivas solo existen cuando hay selección, y declaran a cuántos elementos afectan
 * **antes** de ejecutarse (patterns.md, "Selección masiva").
 *
 * Las columnas se declaran con `columns` y su contenido con slots `cell-<key>`; sin slot, la celda
 * pinta el valor de esa clave. Un descriptor de formato en `props` obligaría a inventar un
 * lenguaje que nadie necesita todavía.
 *
 * **No ordena por sí misma**: emite el criterio y recibe las filas ya ordenadas. Todo listado va
 * paginado (ADR-009), así que la tabla solo tiene delante una página; ordenar esa página en el
 * cliente daría un resultado plausible y equivocado —reordenaría veinte filas de dos mil y el
 * usuario creería estar viendo el máximo—.
 */
type Row = Record<string, unknown>

export type SortDirection = 'asc' | 'desc'
export interface TableSort { key: string, direction: SortDirection }

const props = withDefaults(defineProps<{
  columns: { key: string, label: string, sortable?: boolean }[]
  rows: Row[]
  rowKey: string
  selectable?: boolean
  selected?: string[]
  sort?: TableSort | null
  /** Las claves visibles. Sin declararlas se muestran todas. */
  visibleColumns?: string[] | null
  density?: 'comfortable' | 'compact'
}>(), {
  selectable: false,
  selected: () => [],
  sort: null,
  visibleColumns: null,
  density: 'comfortable',
})

const emit = defineEmits<{
  'update:selected': [string[]]
  'update:sort': [TableSort]
}>()

/** Ordenar por la columna ya ordenada invierte el sentido; por otra, empieza ascendente. */
function toggleSort(key: string) {
  const current = props.sort
  emit('update:sort', {
    key,
    direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  })
}

/** `aria-sort` solo tiene sentido en una columna ordenable: en las demás no se declara. */
function ariaSort(column: { key: string, sortable?: boolean }) {
  if (!column.sortable) return undefined
  if (props.sort?.key !== column.key) return 'none'
  return props.sort.direction === 'asc' ? 'ascending' : 'descending'
}

/**
 * La columna identificativa —la primera— nunca se oculta: una tabla de filas anónimas es peor que
 * una tabla ancha. Por eso no aparece entre las ocultables ni la retira `visibleColumns`.
 */
const identityKey = computed(() => props.columns[0]?.key)

const hideableColumns = computed(() => props.columns.filter((column) => column.key !== identityKey.value))

const shownColumns = computed(() => {
  if (!props.visibleColumns) return props.columns
  return props.columns.filter(
    (column) => column.key === identityKey.value || props.visibleColumns!.includes(column.key),
  )
})

defineExpose({ hideableColumns })

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
      <table :class="{ 'is-compact': density === 'compact' }">
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
            <th
              v-for="column in shownColumns"
              :key="column.key"
              :aria-sort="ariaSort(column)"
              :class="{ 'is-sorted': sort?.key === column.key }"
            >
              <button v-if="column.sortable" type="button" @click="toggleSort(column.key)">
                {{ column.label }}
                <!-- El sentido se ve además de anunciarse: no depende solo del color. -->
                <span aria-hidden="true">{{ sort?.key === column.key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕' }}</span>
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
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
            <td v-for="column in shownColumns" :key="column.key" :class="{ 'is-identity': column.key === identityKey }">
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

th button {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  display: inline-flex;
  font: inherit;
  gap: var(--space-1);
  letter-spacing: inherit;
  min-height: 32px;
  padding: 0;
  text-transform: inherit;
}

/* La columna ordenada no se distingue solo por color: gana peso y su indicador de sentido. */
th.is-sorted {
  color: var(--color-ink);
}

th.is-sorted button {
  font-weight: 700;
}

/* La densidad es preferencia de la pantalla sobre la tabla, no de la tabla sobre sí misma. */
table.is-compact th,
table.is-compact td {
  padding: var(--space-1) var(--space-2);
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
