import type { LocationDetail, LocationSummary, PlantMovement } from '@features/locations/types/location.types'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

export const page = <T>(content: T[], overrides: Partial<PageResponse<T>> = {}): PageResponse<T> => ({
  content,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  pageNumber: 0,
  pageSize: 25,
  ...overrides,
})

export const summary = (overrides: Partial<LocationSummary> & Pick<LocationSummary, 'id' | 'name'>): LocationSummary => ({
  code: `LOC-${overrides.id}`,
  parentId: null,
  path: overrides.name,
  locationType: null,
  capacity: null,
  plantCount: 0,
  plantCountTotal: 0,
  ...overrides,
})

/**
 * Invernadero 1 (300001) > Bancada norte (300002) > Bandeja A3 (300003) y Bandeja A4 (300004),
 * más una raíz aparte: Cuarentena (300005).
 */
export const nursery = (): LocationSummary[] => [
  summary({ id: '300001', name: 'Invernadero 1', code: 'LOC-I1', locationType: 'invernadero', capacity: 400, plantCount: 0, plantCountTotal: 62 }),
  summary({ id: '300002', name: 'Bancada norte', code: 'LOC-I1-BN', parentId: '300001', path: 'Invernadero 1 / Bancada norte', locationType: 'bancada', capacity: 250, plantCount: 4, plantCountTotal: 62 }),
  summary({ id: '300003', name: 'Bandeja A3', code: 'LOC-I1-BN-A3', parentId: '300002', path: 'Invernadero 1 / Bancada norte / Bandeja A3', locationType: 'bandeja', plantCount: 31, plantCountTotal: 31 }),
  summary({ id: '300004', name: 'Bandeja A4', code: 'LOC-I1-BN-A4', parentId: '300002', path: 'Invernadero 1 / Bancada norte / Bandeja A4', locationType: 'bandeja', plantCount: 27, plantCountTotal: 27 }),
  summary({ id: '300005', name: 'Cuarentena', code: 'LOC-CUA', plantCount: 2, plantCountTotal: 2 }),
]

export const detail = (overrides: Partial<LocationDetail> = {}): LocationDetail => ({
  id: '300002',
  name: 'Bancada norte',
  code: 'LOC-I1-BN',
  parentId: '300001',
  description: 'Zona de semisombra para ejemplares jóvenes.',
  locationType: 'bancada',
  capacity: 250,
  operationalNotes: 'Malla de sombreo fija.',
  environment: 'cubierto',
  sunExposure: 'semisombra',
  ancestors: [{ id: '300001', name: 'Invernadero 1' }],
  children: [
    { id: '300003', name: 'Bandeja A3', code: 'LOC-I1-BN-A3', locationType: 'bandeja', plantCount: 31, plantCountTotal: 31 },
    { id: '300004', name: 'Bandeja A4', code: 'LOC-I1-BN-A4', locationType: 'bandeja', plantCount: 27, plantCountTotal: 27 },
  ],
  plantCount: 4,
  plantCountTotal: 62,
  ...overrides,
})

export const movement = (overrides: Partial<PlantMovement> = {}): PlantMovement => ({
  id: '600001',
  plantId: '400001',
  plantCode: 'CAT-GRUSS-01',
  from: { id: '300005', name: 'Cuarentena' },
  to: { id: '300002', name: 'Bancada norte' },
  movedAt: '2026-10-06T10:00:00Z',
  ...overrides,
})


export const plantRow = (id: string, nickname: string, overrides: Partial<PlantSummary> = {}): PlantSummary => ({
  id,
  code: `CAT-GRUSS-${id.slice(-2).padStart(2, '0')}`,
  status: 'activa',
  nickname,
  createdAt: '2026-05-04T10:00:00Z',
  location: { id: '300003', name: 'Bandeja A3' },
  species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  ...overrides,
})

/**
 * Lo que sirve el API para la ficha de `300002` (Bancada norte): la ficha, sus ejemplares, sus
 * movimientos y el catálogo —que el diálogo de mover pide al abrirse—.
 */
export function serveLocation(api: { get: { mockImplementation: (fn: (path: string, params?: Record<string, unknown>) => unknown) => void } }, options: {
  detail?: LocationDetail
  plants?: PlantSummary[]
  plantsPage?: Partial<PageResponse<PlantSummary>>
  movements?: PlantMovement[]
} = {}) {
  const location = options.detail ?? detail()
  api.get.mockImplementation(async (path: string) => {
    if (path === `/locations/${location.id}`) return location
    if (path === `/locations/${location.id}/movements`) return page(options.movements ?? [])
    if (path === '/locations') return page(nursery())
    if (path === '/plants') return page(options.plants ?? [], options.plantsPage)
    throw new Error(`petición no doblada: ${path}`)
  })
}
