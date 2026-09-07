<script setup lang="ts">
/**
 * Pautas a lo largo de los doce meses del año, con **intensidad por mes**: el «año de cultivo» de
 * una especie —crecimiento, floración y riego— de un vistazo.
 *
 * Es el hermano de `UiMonthRange` para cuando hay varias pautas y lo que importa no es solo
 * *cuándo*, sino *cuánto*: el riego no se enciende y se apaga, sube y baja. Una fila por pauta, los
 * meses rotulados una sola vez, y la intensidad como fuerza del color.
 *
 * **La rejilla vacía se muestra igual.** Una especie sin periodos registrados sigue teniendo que
 * enseñar qué se va a poder registrar; ocultarla convertiría «todavía no lo sé» en «esto no existe».
 *
 * **El tono lo decide quien la usa**: un kit que sabe qué es «crecimiento» deja de ser un kit. Y la
 * leyenda la pone quien la usa, porque una intensidad en color no se interpreta sola.
 */
export type YearTone = 'brand' | 'warning' | 'info' | 'danger' | 'neutral'

export interface YearRow {
  label: string
  /** Un valor por mes: `0` es sin actividad, `1`–`3` la intensidad. Se recorta o rellena a doce. */
  levels: number[]
  tone?: YearTone
}

const props = withDefaults(defineProps<{
  rows: YearRow[]
  legend?: { tone: YearTone, label: string }[]
}>(), { legend: undefined })

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Doce siempre: ni un mes de más aunque llegue de más, ni una columna de menos si llega corto. */
function levelsOf(row: YearRow): number[] {
  return MONTHS.map((_, index) => row.levels[index] ?? 0)
}

/**
 * Quien no ve el color necesita la frase: en qué meses hay actividad, o que no la hay en ninguno.
 * Sin esto la rejilla sería una tabla de celdas vacías para un lector de pantalla.
 */
function describe(row: YearRow): string {
  const active = levelsOf(row)
    .map((level, index) => (level > 0 ? FULL[index] : null))
    .filter((month): month is string => month !== null)

  return active.length
    ? `${row.label}: ${active.join(', ')}`
    : `${row.label}: sin actividad registrada`
}
</script>

<template>
  <div class="year" role="table">
    <div class="year__head" role="row">
      <span />
      <b v-for="month in MONTHS" :key="month" data-role="month-head" role="columnheader">{{ month }}</b>
    </div>

    <div
      v-for="row in props.rows"
      :key="row.label"
      class="year__row"
      :class="`is-${row.tone ?? 'neutral'}`"
      role="row"
      data-role="year-row"
      :aria-label="describe(row)"
    >
      <strong role="rowheader">{{ row.label }}</strong>
      <span
        v-for="(level, index) in levelsOf(row)"
        :key="index"
        role="cell"
        data-role="month"
        :data-level="level"
      >
        <i :data-level="level" />
      </span>
    </div>

    <div v-if="legend?.length" class="year__legend" data-test="legend">
      <span v-for="item in legend" :key="item.label">
        <i :class="`is-${item.tone}`" aria-hidden="true" />
        {{ item.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/*
 * Una tabla acotada, no una rejilla suelta: el borde exterior y los de celda son lo que hace que
 * doce columnas se lean como un calendario y no como una fila de cajas.
 */
.year {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.year__head,
.year__row {
  display: grid;
  grid-template-columns: 110px repeat(12, 1fr);
}

.year__head > *,
.year__row > * {
  align-items: center;
  border-left: 1px solid var(--color-line);
  display: flex;
  justify-content: center;
  min-height: 32px;
}

.year__head > *:first-child,
.year__row > *:first-child {
  border-left: 0;
}

.year__head {
  background: var(--color-surface-muted);
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  font-weight: 400;
  text-transform: uppercase;
}

.year__row {
  border-top: 1px solid var(--color-line);
}

.year__row strong {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  justify-content: flex-start;
  padding-left: var(--space-3);
}

/* El bloque va **dentro** de la celda, con aire alrededor: así el mes se lee como una casilla. */
.year__row i {
  align-self: stretch;
  display: block;
  flex: 1;
  margin: 5px 3px;
}

/*
 * La intensidad se deriva del tono con `color-mix`, no se declara: así hay tres fuerzas sin
 * inventar tres colores fuera del sistema (ADR-014).
 */
.year__row i[data-level='1'] {
  background: color-mix(in srgb, var(--color-ink-muted) 12%, var(--color-surface));
}

.year__row i[data-level='2'] {
  background: color-mix(in srgb, var(--color-ink-muted) 32%, var(--color-surface));
}

.year__row i[data-level='3'] {
  background: color-mix(in srgb, var(--color-ink-muted) 55%, var(--color-surface));
}

.year__row.is-brand i[data-level='1'] { background: color-mix(in srgb, var(--color-brand) 12%, var(--color-surface)); }
.year__row.is-brand i[data-level='2'] { background: color-mix(in srgb, var(--color-brand) 30%, var(--color-surface)); }
.year__row.is-brand i[data-level='3'] { background: color-mix(in srgb, var(--color-brand) 45%, var(--color-surface)); }

.year__row.is-warning i[data-level='1'] { background: color-mix(in srgb, var(--color-warning) 12%, var(--color-surface)); }
.year__row.is-warning i[data-level='2'] { background: color-mix(in srgb, var(--color-warning) 28%, var(--color-surface)); }
.year__row.is-warning i[data-level='3'] { background: color-mix(in srgb, var(--color-warning) 42%, var(--color-surface)); }

.year__row.is-info i[data-level='1'] { background: color-mix(in srgb, var(--color-info) 10%, var(--color-surface)); }
.year__row.is-info i[data-level='2'] { background: color-mix(in srgb, var(--color-info) 28%, var(--color-surface)); }
.year__row.is-info i[data-level='3'] { background: color-mix(in srgb, var(--color-info) 50%, var(--color-surface)); }

.year__row.is-danger i[data-level='1'] { background: color-mix(in srgb, var(--color-danger) 12%, var(--color-surface)); }
.year__row.is-danger i[data-level='2'] { background: color-mix(in srgb, var(--color-danger) 28%, var(--color-surface)); }
.year__row.is-danger i[data-level='3'] { background: color-mix(in srgb, var(--color-danger) 45%, var(--color-surface)); }

.year__legend {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--font-size-11);
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
}

.year__legend span {
  align-items: center;
  display: inline-flex;
  gap: var(--space-1);
}

.year__legend i {
  border-radius: 2px;
  display: inline-block;
  height: 8px;
  width: 16px;
  background: var(--color-ink-muted);
}

.year__legend i.is-brand { background: color-mix(in srgb, var(--color-brand) 45%, var(--color-surface)); }
.year__legend i.is-warning { background: color-mix(in srgb, var(--color-warning) 42%, var(--color-surface)); }
.year__legend i.is-info { background: color-mix(in srgb, var(--color-info) 50%, var(--color-surface)); }
.year__legend i.is-danger { background: color-mix(in srgb, var(--color-danger) 45%, var(--color-surface)); }
</style>
