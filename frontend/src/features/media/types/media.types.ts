/**
 * Las fotografías de una especie y de un ejemplar (T-19). Un mismo archivo —`media_asset`— con dos
 * dueños posibles: lo que las dos galerías tienen en común vive aquí y lo propio de cada una, en
 * campos que el otro dueño no trae.
 */

/** Rutas **relativas** de las tres variantes: el cliente las completa con la base del API. */
export interface PhotoUrls {
  thumb: string
  medium: string
  full: string
}

/** La portada y las fotos de una entrada de la cronología: lo mínimo para pintarlas. */
export interface PhotoSummary {
  id: string
  altText: string
  urls: PhotoUrls
}

export interface TimelinePhoto extends PhotoSummary {
  width: number
  height: number
  capturedAt: string | null
}

export type PhotoPurpose = 'general' | 'detalle' | 'etiqueta_fisica'

export const PHOTO_PURPOSES: { value: PhotoPurpose, label: string }[] = [
  { value: 'general', label: 'Vista general' },
  { value: 'detalle', label: 'Detalle' },
  { value: 'etiqueta_fisica', label: 'Etiqueta física' },
]

/** Una fotografía de galería. `credit` es de la especie; `purpose` y `eventId`, del ejemplar. */
export interface MediaPhoto extends TimelinePhoto {
  contentType: string
  createdAt: string
  position: number
  primary: boolean
  credit?: string | null
  purpose?: PhotoPurpose | null
  eventId?: string | null
}

export type MediaOwnerKind = 'species' | 'plants'

export interface MediaOwner {
  kind: MediaOwnerKind
  id: string
}

/** Los campos de texto de una subida: valen para **todos** los archivos de la petición. */
export interface UploadFields {
  altText?: string
  capturedAt?: string
  credit?: string
  purpose?: PhotoPurpose
  eventId?: string
}

/**
 * Corrección parcial: lo ausente no se toca y `eventId: null` descuelga del evento. `primary` solo
 * existe como `true` —elegir la portada—: quitarla sin sustituta es un `400`.
 */
export interface PhotoPatch {
  altText?: string
  capturedAt?: string | null
  credit?: string | null
  purpose?: PhotoPurpose | null
  eventId?: string | null
  primary?: true
}

export interface PhotoQuery {
  page?: number
  size?: number
  /** `position` pide el orden manual; por defecto la galería del ejemplar va por fecha de captura. */
  sort?: 'position'
  purpose?: PhotoPurpose
  event?: string
}

/** Un archivo elegido antes de que su dueño exista, con el propósito que se le dio al elegirlo. */
export interface PhotoSelection {
  file: File
  purpose: PhotoPurpose
}
