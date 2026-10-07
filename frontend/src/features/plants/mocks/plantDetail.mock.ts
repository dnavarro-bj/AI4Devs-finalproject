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

/**
 * Contexto botánico: exposición y entorno, que sustituye T-17. El **estado** y la **germinación** ya
 * son reales y salen del ejemplar (`ficha-del-ejemplar`).
 */
export const MOCK_CONTEXT = ['Pleno sol', 'Exterior']

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

/** Próxima tarea del resumen — la sustituye T-22. La última floración ya es real (T-20). */
export const MOCK_NEXT_TASK = { value: 'Revisión general', context: 'Vencida hace 2 días' }
