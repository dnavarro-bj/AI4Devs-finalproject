/**
 * La validación previa de una subida de imágenes, antes de enviar nada.
 *
 * **Es una cortesía, no una defensa**: ahorra una petición condenada y dice el motivo por archivo,
 * pero el servidor decide por el contenido y es quien manda. La tabla de límites es **la misma**
 * que la del backend (`cactify.media.*`) y está definida una sola vez, aquí.
 */
export const IMAGE_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxFilesPerUpload: 10,
  maxPhotosPerOwner: 50,
} as const

const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

/** Para el atributo `accept` del selector. */
export const IMAGE_ACCEPT = TYPES.join(',')

/** Cómo se nombran los formatos en un mensaje. */
export const IMAGE_FORMATS_LABEL = 'JPEG, PNG o WebP'

export interface RejectedFile {
  file: File
  message: string
}

export interface ImageValidation {
  accepted: File[]
  rejected: RejectedFile[]
}

function isAdmittedType(file: File): boolean {
  if (file.type) return (TYPES as readonly string[]).includes(file.type)
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSIONS.includes(extension)
}

/**
 * Reparte los archivos entre admitidos y rechazados, con un mensaje por cada rechazado. `existing`
 * es lo que el dueño ya tiene: el límite de 50 cuenta lo guardado y lo que se añade.
 */
export function validateImageFiles(files: File[], options: { existing?: number } = {}): ImageValidation {
  const accepted: File[] = []
  const rejected: RejectedFile[] = []
  const room = Math.max(0, IMAGE_LIMITS.maxPhotosPerOwner - (options.existing ?? 0))

  for (const file of files) {
    if (!isAdmittedType(file)) {
      rejected.push({ file, message: `«${file.name}» no es una imagen admitida: solo ${IMAGE_FORMATS_LABEL}.` })
    } else if (file.size > IMAGE_LIMITS.maxBytes) {
      rejected.push({ file, message: `«${file.name}» pesa más de ${IMAGE_LIMITS.maxBytes / (1024 * 1024)} MB.` })
    } else if (accepted.length >= IMAGE_LIMITS.maxFilesPerUpload) {
      rejected.push({ file, message: `«${file.name}» no cabe: se pueden subir como mucho ${IMAGE_LIMITS.maxFilesPerUpload} a la vez.` })
    } else if (accepted.length >= room) {
      rejected.push({ file, message: `«${file.name}» no cabe: el límite es de ${IMAGE_LIMITS.maxPhotosPerOwner} fotografías.` })
    } else {
      accepted.push(file)
    }
  }
  return { accepted, rejected }
}
