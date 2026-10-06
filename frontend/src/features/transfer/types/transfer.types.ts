/**
 * El modelo de la maqueta de importar y exportar. **Provisional y sin ticket**: ningún ticket del
 * backlog recoge la importación CSV, la actividad de transferencias ni la generación de
 * exportaciones (T-21 solo pide exportar el resultado filtrado). Se propone abrir uno.
 */

export type ImportStep = 'file' | 'review' | 'complete'

export type RowResult = 'valid' | 'warning' | 'error'

export interface ImportRow {
  /** Número de fila del CSV, para que el usuario la encuentre en su hoja. */
  row: number
  code: string
  species: string
  location: string
  result: RowResult
  /** Por qué: «Código duplicado». Vacío si la fila es válida. */
  reason: string
}

export interface ImportReview {
  fileName: string
  rows: number
  size: string
  /** Cifras del archivo entero. La tabla enseña solo las filas con errores y las primeras con avisos. */
  ready: number
  warnings: number
  errors: number
  preview: ImportRow[]
}

export type ExportContent = 'full' | 'filtered' | 'labels'

export interface Backup {
  when: string
  scope: string
  format: string
  plants: number
}

export interface TransferActivity {
  id: string
  direction: 'export' | 'import' | 'labels'
  title: string
  detail: string
  when: string
  /** Lo que el resultado dice en texto: «Completada», «5 errores». */
  status: string
  tone: 'ok' | 'warning' | 'danger'
}
