import { useToast } from './useToast'

/**
 * Una acción que la pantalla enseña pero que todavía no existe: dice **qué ticket la habilita** y no
 * cambia nada.
 *
 * Es la contrapartida de los datos de ejemplo. Un botón que no hace nada indica un fallo; un botón
 * que explica por qué todavía no puede hacerlo indica el estado del producto.
 */
export function usePendingAction() {
  const toast = useToast()

  return (action: string, ticket: string) =>
    toast.show(`«${action}» todavía no está disponible: lo habilita ${ticket}.`)
}
