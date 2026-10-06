/**
 * DATOS DE EJEMPLO — SIN TICKET QUE LOS SUSTITUYA TODAVÍA.
 *
 * Ningún ticket del backlog recoge la importación CSV, la actividad de transferencias ni la
 * generación de exportaciones: T-21 solo pide exportar el resultado filtrado y T-15 los códigos
 * (ya hechos), no el QR ni el PDF de las etiquetas. Hace falta abrir uno; hasta entonces esta maqueta es lo único que hay.
 *
 * Nadie más debe importarlo: solo el service de `transfer`.
 */
import type { Backup, ExportContent, ImportReview, TransferActivity } from '../types/transfer.types'

export const USE_MOCK_TRANSFER = true

export const BACKUP_MOCK: Backup = { when: 'hoy, 08:14', scope: 'Inventario completo', format: 'CSV', plants: 1284 }

/** El archivo de ejemplo: 248 filas, de las que 5 llevan error y 12 un aviso. */
export const IMPORT_SAMPLE_MOCK: ImportReview = {
  fileName: 'inventario_septiembre.csv',
  rows: 248,
  size: '84 KB',
  ready: 231,
  warnings: 12,
  errors: 5,
  preview: [
    { row: 18, code: 'CAT-GRUSS-24', species: 'E. grusonii', location: 'Invernadero 1 / A3', result: 'valid', reason: '' },
    { row: 43, code: 'CAT-ASTRO-12', species: 'A. myriostigma', location: 'Invernadero 1 / A3', result: 'error', reason: 'Código duplicado' },
    { row: 57, code: 'CAT-MAMMI-09', species: 'M. bocasana', location: 'Invernadero 2 / B1', result: 'error', reason: 'Especie no encontrada' },
    { row: 91, code: 'CAT-MAMMI-31', species: 'M. bocasana', location: 'Bandeja Z8', result: 'warning', reason: 'Ubicación no encontrada' },
    { row: 104, code: 'CAT-FEROC-15', species: 'F. gracilis', location: 'Invernadero 2 / B1', result: 'error', reason: 'Fecha de alta en el futuro' },
    { row: 133, code: 'CAT-ARIO-04', species: 'A. fissuratus', location: 'Zona exterior', result: 'warning', reason: 'Etiqueta nueva: se creará' },
    { row: 161, code: 'CAT-SCHLUM-11', species: 'S. truncata', location: 'Invernadero 1 / A1', result: 'error', reason: 'Código duplicado' },
    { row: 209, code: 'CAT-GRUSS-31', species: 'E. grusonii', location: 'Invernadero 1 / A3', result: 'error', reason: 'Código duplicado' },
  ],
}

export const ACTIVITY_MOCK: TransferActivity[] = [
  { id: 'x1', direction: 'export', title: 'Inventario completo', detail: 'CSV · 1.284 plantas · David Navarro', when: 'Hoy, 08:14', status: 'Completada', tone: 'ok' },
  { id: 'x2', direction: 'import', title: 'Alta de semilleros 2026', detail: 'CSV · 248 plantas · David Navarro', when: '31 ago, 18:42', status: '5 errores', tone: 'warning' },
  { id: 'x3', direction: 'labels', title: 'Etiquetas Invernadero 1', detail: 'PDF · 486 códigos QR', when: '26 ago, 11:07', status: 'Completada', tone: 'ok' },
]

/** Lo que pesaría cada exportación, para la estimación. */
export const EXPORT_ESTIMATE_MOCK: Record<ExportContent, string> = {
  full: '4,8 MB · 1.284 plantas',
  filtered: '0,3 MB · 86 plantas',
  labels: '1,1 MB · 486 códigos',
}
