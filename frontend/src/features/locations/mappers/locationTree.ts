import type { EntityPickerOption } from '@ui/UiEntityPicker.vue'
import type { LocationSummary } from '../types/location.types'
import { LOCATION_TYPE_MARKS } from '../types/locationVocabulary'

/**
 * Un nodo del mapa del vivero. Tiene la forma que `UiTree` espera —el kit recibe el árbol ya
 * construido— más el código, que la búsqueda necesita y el kit ignora.
 */
export interface LocationTreeNode {
  id: string
  label: string
  code: string
  count: number
  detail: string
  mark: string
  children: LocationTreeNode[]
}

const compareByName = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'es')
const plantsLabel = (total: number) => `${total} ${total === 1 ? 'planta' : 'plantas'}`

/**
 * Monta el árbol a partir de las filas planas del catálogo. La carga de cada nodo es la **total**,
 * contando a los descendientes, que es lo que dice «cuánto hay aquí».
 *
 * Una fila cuyo padre no ha llegado cuelga de la raíz: perderla del mapa sería esconder una
 * localización que existe.
 */
export function buildLocationTree(rows: LocationSummary[]): LocationTreeNode[] {
  const nodes = new Map<string, LocationTreeNode>(rows.map((row) => [row.id, {
    id: row.id,
    label: row.name,
    code: row.code,
    count: row.plantCountTotal,
    detail: plantsLabel(row.plantCountTotal),
    mark: row.locationType ? LOCATION_TYPE_MARKS[row.locationType] : '⌖',
    children: [],
  }]))

  const roots: LocationTreeNode[] = []
  for (const row of rows) {
    const node = nodes.get(row.id)!
    const parent = row.parentId ? nodes.get(row.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortDeep = (list: LocationTreeNode[]) => {
    list.sort(compareByName)
    list.forEach((node) => sortDeep(node.children))
  }
  sortDeep(roots)
  return roots
}

/**
 * Lo que queda del árbol al buscar por nombre o código: las coincidencias y la ruta que lleva
 * hasta ellas. Un texto en blanco devuelve el mismo árbol, no una copia.
 */
export function filterLocationTree(nodes: LocationTreeNode[], term: string): LocationTreeNode[] {
  const needle = term.trim().toLocaleLowerCase('es')
  if (!needle) return nodes

  const walk = (list: LocationTreeNode[]): LocationTreeNode[] => list.flatMap((node) => {
    const children = walk(node.children)
    const matches = `${node.label} ${node.code}`.toLocaleLowerCase('es').includes(needle)
    return matches || children.length ? [{ ...node, children }] : []
  })
  return walk(nodes)
}

/** El conjunto formado por una localización y todo lo que cuelga de ella, a cualquier profundidad. */
export function descendantIds(rows: LocationSummary[], id: string): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.parentId) continue
    childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row.id])
  }

  const found = new Set<string>([id])
  const pending = [id]
  while (pending.length) {
    for (const child of childrenOf.get(pending.pop()!) ?? []) {
      if (found.has(child)) continue
      found.add(child)
      pending.push(child)
    }
  }
  return found
}

/**
 * Las localizaciones como opciones del selector de `UiEntityPicker`, con la ruta como detalle.
 * `excluded` quita las que no se pueden elegir: es lo que hace imposible ofrecer un ciclo.
 */
export function locationOptions(rows: LocationSummary[], excluded: ReadonlySet<string> = new Set()): EntityPickerOption[] {
  return rows
    .filter((row) => !excluded.has(row.id))
    .map((row) => ({
      value: row.id,
      title: row.name,
      code: row.code,
      detail: row.path,
      mark: row.locationType ? LOCATION_TYPE_MARKS[row.locationType] : '⌖',
    }))
    .sort((a, b) => a.detail.localeCompare(b.detail, 'es'))
}
