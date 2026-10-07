/**
 * DATOS DE EJEMPLO DE LA FICHA DE PLANTA.
 *
 * Cada bloque dice qué ticket lo sustituye. **Los consume el service**, nunca un componente
 * (ADR-015): así conectar cada uno será cambiar la fuente y borrar su entrada de aquí, no
 * reescribir la pantalla.
 *
 * Y se marcan **también en la interfaz**, no solo aquí. Una ficha con datos
 * inventados es indistinguible de una que funciona: el comentario en el fichero protege al
 * programador, la marca en pantalla protege la conversación sobre el producto.
 */

/**
 * Contexto botánico: exposición y entorno, que sustituye T-17. El **estado** y la **germinación** ya
 * son reales y salen del ejemplar (`ficha-del-ejemplar`).
 */
export const MOCK_CONTEXT = ['Pleno sol', 'Exterior']

