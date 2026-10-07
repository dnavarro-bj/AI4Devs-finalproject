/** Lo que se puede exportar: el resultado filtrado de un listado. */
export type ExportKind = 'plants' | 'species'

/** El archivo que entrega el API: sus bytes y el nombre fechado que fija el servidor. */
export interface ExportedFile {
  blob: Blob
  filename: string | null
}
