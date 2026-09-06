/**
 * DATOS DE EJEMPLO DE LA FICHA DE PLANTA.
 *
 * Cada bloque dice qué ticket lo sustituye. **Los consume el service**, nunca un componente
 * (ADR-015): así conectar cada uno será cambiar la fuente y borrar su entrada de aquí, no
 * reescribir la pantalla.
 *
 * Y se marcan **también en la interfaz**, no solo aquí. Una ficha con código, estado y fotografía
 * inventados es indistinguible de una que funciona: el comentario en el fichero protege al
 * programador, la marca en pantalla protege la conversación sobre el producto.
 */

/** Código de inventario — lo sustituye T-15. */
export const MOCK_CODE = 'CAT-GRUSS-01'

/** Estado del ejemplar — lo sustituye T-16. */
export const MOCK_STATUS = { label: 'Activa', tone: 'ok' as const }

/** Contexto botánico: exposición y entorno son T-17; la germinación, T-16. */
export const MOCK_CONTEXT = ['Pleno sol', 'Exterior', 'Germinada 04/2021']

/** Fotografías — las sustituye T-19. La ficha solo enseña el hueco y el recuento. */
export const MOCK_PHOTO_COUNT = 8

/** Aviso de revisión pendiente — lo sustituye T-23, cuando la alerta sea una entidad. */
export const MOCK_NOTICE = {
  title: 'Revisión pendiente',
  body: 'No se registra una observación desde hace 43 días.',
}

/** Próximo trabajo — lo sustituye T-22. */
export const MOCK_TASKS = [
  { id: 't1', title: 'Revisión general', detail: 'Vencida · 1 sep', overdue: true },
  { id: 't2', title: 'Comprobar tamaño de maceta', detail: '15 oct', overdue: false },
]

/** Próxima tarea y última floración del resumen — T-22 y T-20. */
export const MOCK_NEXT_TASK = { value: 'Revisión general', context: 'Vencida hace 2 días' }
export const MOCK_LAST_BLOOM = { value: 'Mayo de 2026', context: 'Duró 4 días' }

/**
 * Eventos de la cronología que no son lecturas — los sustituye T-20, cuando exista la espina de
 * eventos. Las lecturas sí son reales y salen del API.
 */
export const MOCK_EVENTS = [
  {
    id: 'm1',
    type: 'water',
    title: 'Riego de mantenimiento',
    at: '2026-08-16T08:42:00Z',
    body: '450 ml · registrado desde la tarea «Regar bandejas A3 y A4».',
  },
  {
    id: 'm2',
    type: 'photo',
    title: 'Nueva espinación en el ápice',
    at: '2026-08-02T18:14:00Z',
    body: 'La coloración se mantiene uniforme. Volver a revisar tras el siguiente riego.',
  },
  {
    id: 'm3',
    type: 'bloom',
    title: 'Floración finalizada',
    at: '2026-05-22T10:00:00Z',
    body: 'Una flor amarilla · 4 días de duración.',
  },
  {
    id: 'm4',
    type: 'move',
    title: 'Traslado a Bandeja A3',
    at: '2026-03-11T09:00:00Z',
    body: 'Desde Zona exterior / Mesa 2.',
  },
]
