/**
 * El mapa de secciones de la aplicación: qué hay y dónde vive.
 *
 * Es un módulo de datos y no marcado dentro del layout (decisión del design de
 * `armazon-navegacion`) para que añadir una sección sea una línea aquí, y para que «marcar la
 * sección activa» se calcule una sola vez en lugar de repetirse por entrada.
 *
 * Los encabezados de grupo agrupan y **no navegan**: no llevan dirección a propósito.
 *
 * Las direcciones van en inglés, como el resto de identificadores del proyecto. La galería del
 * kit (`/ui-kit`) no está aquí: es una superficie de desarrollo, no una sección de producto.
 */

export interface NavigationEntry {
  label: string
  to: string
  /** Marca tipográfica de la entrada. Decorativa: nunca es la única señal de nada. */
  mark: string
}

export interface NavigationGroup {
  label: string
  entries: NavigationEntry[]
}

export const NAVIGATION: NavigationGroup[] = [
  {
    label: 'Colección',
    entries: [
      { label: 'Plantas', to: '/plants', mark: '▤' },
      { label: 'Localizaciones', to: '/locations', mark: '⌂' },
    ],
  },
  {
    label: 'Trabajo diario',
    entries: [
      { label: 'Tareas', to: '/tasks', mark: '◷' },
      { label: 'Alertas', to: '/alerts', mark: '⚑' },
    ],
  },
  {
    label: 'Catálogos',
    entries: [
      { label: 'Especies', to: '/species', mark: '❋' },
      { label: 'Mezclas de sustrato', to: '/soil-mixes', mark: '≡' },
      { label: 'Etiquetas', to: '/tags', mark: '⌗' },
    ],
  },
  {
    label: 'Administración',
    entries: [
      { label: 'Importar / exportar', to: '/import-export', mark: '⇄' },
      { label: 'Configuración', to: '/settings', mark: '⚙' },
    ],
  },
]

export function sectionAddresses(): string[] {
  return NAVIGATION.flatMap((group) => group.entries.map((entry) => entry.to))
}

/**
 * La sección que contiene la ruta actual, no solo la que coincide exactamente: la ficha
 * `/plants/882687672222443468` sigue estando en Plantas.
 */
export function isActiveSection(address: string, path: string): boolean {
  return path === address || path.startsWith(`${address}/`)
}
