/**
 * DOBLE DEL API DE TAREAS PARA LOS TESTS DE PANTALLA.
 *
 * Es un **servidor en memoria** con la forma exacta del contrato del API real
 * (`tareas-modelo-y-api`): crear, editar, reprogramar, completar con exclusiones, omitir y cancelar
 * cambian de verdad lo que el listado devuelve después, y los filtros y el orden son los del API.
 * Antes de integrar el backend fue la maqueta con la que se recorrían las pantallas; hoy vive solo
 * aquí, fuera de `src/`: ningún código de producción lo importa.
 *
 * Las localizaciones y las plantas se resuelven contra los services de inventario, que cada test
 * dobla; solo el estado de las tareas vive aquí. `installTasksFake()` lo instala sobre
 * `tasksApiService` con `vi.spyOn`, así que `vi.restoreAllMocks()` lo desinstala.
 */
import { vi } from 'vitest'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { domainError, ErrorCodes, fail, ok, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import { PLANT_STATUSES } from '@features/plants/mappers/plantProfile'
import { locationsApiService } from '@features/locations/services/locations.api.service'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type {
  Task,
  TaskCompletionInput,
  TaskInput,
  TaskListQuery,
  TaskScheduleInput,
  TaskScopePlant,
  TasksApi,
} from '@features/tasks/types/task.types'

/** Una tarea y lo que el API sabe de su destino y no devuelve en el listado. */
interface Stored {
  task: Task
  plants: PlantSummary[]
}

const MAX_PLANTS = 500
const MS_PER_DAY = 86_400_000

let store: Stored[] | null = null
let sequence = 100

/** Vacía el estado: los tests y la recarga de la maqueta empiezan siempre de las mismas tareas. */
export function resetTasksMock() {
  store = null
  sequence = 100
  locationCache = null
  plantCache = null
}

const pad = (value: number) => String(value).padStart(2, '0')

function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10)
}

const now = () => new Date().toISOString()

function badRequest<T>(message: string): ServiceResponse<T> {
  return fail(domainError(ErrorCodes.VALIDATION_ERROR, message, 400))
}

function conflict<T>(message: string): ServiceResponse<T> {
  return fail(domainError(ErrorCodes.CONFLICT, message, 409))
}

function notFound<T>(): ServiceResponse<T> {
  return fail(domainError(ErrorCodes.NOT_FOUND, 'La tarea no existe', 404))
}

/** El inventario real, una vez: es lo que da nombre al destino y plantas al alcance. */
let locationCache: Map<string, { id: string, name: string, path: string }> | null = null
let plantCache: PlantSummary[] | null = null

async function locations() {
  if (!locationCache) {
    const result = await locationsApiService.list({ size: 500 })
    // Sin inventario (o con una respuesta que no es una página) no hay nada que resolver: vacío, no un fallo.
    locationCache = new Map(
      (result.success ? (result.data?.content ?? []) : []).map((location) => [
        location.id,
        { id: location.id, name: location.name, path: location.path || location.name },
      ]),
    )
  }
  return locationCache
}

async function plants() {
  if (!plantCache) {
    const result = await plantsApiService.list({ size: 500, status: PLANT_STATUSES, sort: 'code,asc' })
    plantCache = result.success ? (result.data?.content ?? []) : []
  }
  return plantCache
}

const inProgress = (plant: PlantSummary) => ['activa', 'cuarentena', 'enferma'].includes(plant.status)

function seed(today: string): Stored[] {
  const base = {
    origin: 'manual' as const,
    notes: null,
    completion: null,
    closedReason: null,
    createdAt: `${addDays(today, -20)}T08:00:00Z`,
    updatedAt: `${addDays(today, -20)}T08:00:00Z`,
  }
  const location = (id: string, name: string) => ({ kind: 'location' as const, location: { id, name, path: name } })
  const make = (
    id: string,
    type: Task['type'],
    title: string,
    priority: Task['priority'],
    dueFrom: number,
    dueTo: number,
    target: Task['target'],
    extra: Partial<Task> = {},
  ): Stored => ({
    plants: [],
    task: { ...base, id, type, title, priority, status: 'pendiente', dueFrom: addDays(today, dueFrom), dueTo: addDays(today, dueTo), target, ...extra },
  })

  return [
    make('t1', 'poda_raices', 'Revisar raíces antes del trasplante', 'alta', -4, -4, location('300001', 'Invernadero 1')),
    make('t2', 'otra', 'Revisión de ejemplares nuevos', 'normal', -1, -1, location('300002', 'Bandeja A3')),
    make('t3', 'riego', 'Regar la bandeja A3', 'alta', 0, 0, location('300002', 'Bandeja A3')),
    make('t4', 'cambio_maceta', 'Cambio de maceta de los ejemplares marcados', 'normal', -1, 2, location('300001', 'Invernadero 1')),
    make('t5', 'proteccion_sol', 'Instalar sombreo temporal', 'normal', 1, 1, location('300003', 'Alfeizar salon')),
    make('t6', 'riego', 'Riego del invernadero', 'normal', 5, 5, location('300001', 'Invernadero 1')),
    make('t7', 'otra', 'Revisar etiquetas', 'baja', 8, 8, location('300003', 'Alfeizar salon')),
    make('t8', 'proteccion_frio', 'Proteger del frío antes de la bajada', 'alta', 10, 14, location('300001', 'Invernadero 1')),
    make('t9', 'riego', 'Riego de la bandeja A3', 'normal', 21, 21, location('300002', 'Bandeja A3')),
    make('t10', 'riego', 'Regar la bandeja A3', 'normal', -6, -6, location('300002', 'Bandeja A3'), {
      status: 'completada',
      completion: { completedAt: `${addDays(today, -6)}T09:30:00Z`, affectedPlants: 4 },
    }),
    make('t11', 'proteccion_frio', 'Cubrir las plantas sensibles al frío', 'alta', -12, -10, location('300001', 'Invernadero 1'), {
      status: 'completada',
      completion: { completedAt: `${addDays(today, -11)}T18:00:00Z`, affectedPlants: 12 },
    }),
    make('t12', 'riego', 'Riego del exterior', 'normal', -3, -3, location('300003', 'Alfeizar salon'), {
      status: 'omitida',
      closedReason: 'Llovió toda la mañana',
    }),
    make('t13', 'cambio_maceta', 'Trasplantar los Mammillaria', 'normal', -8, -8, location('300001', 'Invernadero 1'), {
      status: 'cancelada',
      closedReason: 'Se aplaza a primavera',
    }),
  ]
}

function ensure(today?: string): Stored[] {
  if (!store) store = seed(today ?? localDay(new Date()))
  return store
}

function nextId(): string {
  sequence += 1
  return `t${sequence}`
}

function paginate<T>(items: T[], page = 0, size = 25): PageResponse<T> {
  const pageSize = Math.min(Math.max(size, 1), MAX_PLANTS)
  return {
    content: items.slice(page * pageSize, (page + 1) * pageSize),
    totalElements: items.length,
    totalPages: Math.ceil(items.length / pageSize),
    pageNumber: page,
    pageSize,
  }
}

/** Una copia: quien reciba una tarea no altera el estado del mock. */
const copy = (task: Task): Task => JSON.parse(JSON.stringify(task)) as Task

/** El listado trae el número de plantas; el detalle, las plantas. */
function summary(record: Stored): Task {
  const task = copy(record.task)
  if (task.target.kind === 'plants') delete task.target.plants
  return task
}

function detail(record: Stored): Task {
  const task = copy(record.task)
  if (task.target.kind === 'plants') {
    task.target.plants = record.plants.map((plant) => ({ id: plant.id, code: plant.code, nickname: plant.nickname }))
  }
  return task
}

const isPrefix = (parent: string, path: string) => path === parent || path.startsWith(`${parent} / `)

function parseSort(sort?: string): { key: string, direction: 1 | -1 } {
  const [key = 'due', direction = 'asc'] = (sort ?? 'due,asc').split(',')
  return { key, direction: direction === 'desc' ? -1 : 1 }
}

async function list(query: TaskListQuery = {}): Promise<ServiceResponse<PageResponse<Task>>> {
  const records = ensure(query.today)
  const today = query.today ?? localDay(new Date())
  const statuses = query.status?.length ? query.status : ['pendiente']

  const needsLocations = Boolean(query.location || query.plant)
  const [locs, allPlants] = await Promise.all([
    needsLocations ? locations() : Promise.resolve(new Map()),
    query.plant ? plants() : Promise.resolve([] as PlantSummary[]),
  ])
  const q = query.q?.trim().toLowerCase()

  // La ruta sale del catálogo real; la que lleva el destino sembrado es solo su nombre.
  const locationPath = (id: string, fallback = '') => locs.get(id)?.path ?? fallback
  const wantedPath = query.location ? locationPath(query.location) : ''
  const plantLocationPath = query.plant
    ? locationPath(allPlants.find((plant) => plant.id === query.plant)?.location.id ?? '')
    : ''

  const matches = (record: Stored): boolean => {
    const { task } = record
    if (!statuses.includes(task.status)) return false
    if (query.type?.length && !query.type.includes(task.type)) return false
    if (query.priority?.length && !query.priority.includes(task.priority)) return false
    if (q && !task.title.toLowerCase().includes(q)) return false
    if (query.from && task.dueTo < query.from) return false
    if (query.to && task.dueFrom > query.to) return false
    if (query.due === 'overdue' && !(task.status === 'pendiente' && task.dueTo < today)) return false
    if (query.due === 'today' && !(task.status === 'pendiente' && task.dueFrom <= today && today <= task.dueTo)) return false

    if (query.location) {
      const inside = (path: string) => (query.includeDescendants ? isPrefix(wantedPath, path) : path === wantedPath)
      const hit = task.target.kind === 'location'
        ? inside(locationPath(task.target.location.id, task.target.location.path))
        : record.plants.some((plant) => inside(locationPath(plant.location.id)))
      if (!hit) return false
    }
    if (query.plant) {
      const hit = task.target.kind === 'location'
        ? isPrefix(locationPath(task.target.location.id, task.target.location.path), plantLocationPath)
        : record.plants.some((plant) => plant.id === query.plant)
      if (!hit) return false
    }
    if (query.species && !(task.target.kind === 'plants' && record.plants.some((plant) => plant.species.id === query.species))) return false
    return true
  }

  const { key, direction } = parseSort(query.sort)
  const ordered = records.filter(matches).sort((a, b) => {
    const left = a.task
    const right = b.task
    let order = 0
    if (key === 'title') order = left.title.localeCompare(right.title, 'es')
    else if (key === 'createdAt') order = left.createdAt.localeCompare(right.createdAt)
    else order = left.dueTo.localeCompare(right.dueTo) || left.dueFrom.localeCompare(right.dueFrom)
    return (order || a.task.id.localeCompare(b.task.id)) * direction
  })

  return ok(paginate(ordered.map(summary), query.page ?? 0, query.size))
}

function validate(input: TaskInput): string | null {
  const title = input.title?.trim() ?? ''
  if (!title) return 'El título no puede estar en blanco'
  if (title.length > 120) return 'El título admite como máximo 120 caracteres'
  if (!input.dueFrom) return 'Falta la fecha de inicio'
  if ((input.dueTo ?? input.dueFrom) < input.dueFrom) return 'La fecha de fin no puede ser anterior a la de inicio'
  const hasLocation = Boolean(input.locationId)
  const hasPlants = Boolean(input.plantIds?.length)
  if (hasLocation === hasPlants) return 'La tarea se dirige a una localización o a plantas concretas, no a las dos ni a ninguna'
  if (hasPlants && new Set(input.plantIds).size !== input.plantIds!.length) return 'Hay plantas repetidas'
  if (hasPlants && input.plantIds!.length > MAX_PLANTS) return `Una tarea admite como máximo ${MAX_PLANTS} plantas`
  return null
}

async function resolveTarget(input: TaskInput): Promise<{ target: Task['target'], plants: PlantSummary[] } | string> {
  if (input.locationId) {
    const location = (await locations()).get(input.locationId)
    if (!location) return 'La localización no existe'
    return { target: { kind: 'location', location }, plants: [] }
  }
  const catalog = await plants()
  const found: PlantSummary[] = []
  for (const id of input.plantIds ?? []) {
    const plant = catalog.find((candidate) => candidate.id === id)
    if (!plant) return `La planta ${id} no existe`
    if (!inProgress(plant)) return `La planta ${plant.code} está archivada`
    found.push(plant)
  }
  return { target: { kind: 'plants', plantCount: found.length }, plants: found }
}

function find(id: string): Stored | undefined {
  return ensure().find((record) => record.task.id === id)
}

const notPending = <T>() => conflict<T>('La tarea ya no está pendiente')

/** Todas las plantas que la tarea afectaría ahora, por código: es lo que `scope` pagina y `complete` recorre. */
async function fullScope(record: Stored): Promise<TaskScopePlant[]> {
  const { target } = record.task
  let found: PlantSummary[] = []

  if (target.kind === 'plants') {
    found = [...record.plants]
  } else {
    for (let page = 0; ; page++) {
      const result = await plantsApiService.list({ location: target.location.id, includeDescendants: true, page, size: MAX_PLANTS, sort: 'code,asc' })
      if (!result.success || !result.data?.content) break
      found.push(...result.data.content)
      if (page + 1 >= result.data.totalPages) break
    }
  }

  return found
    .filter(inProgress)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((plant) => ({
      id: plant.id,
      code: plant.code,
      nickname: plant.nickname,
      species: { id: plant.species.id, scientificName: plant.species.scientificName },
      location: { id: plant.location.id, name: plant.location.name },
    }))
}

/** Lo que el servicio real valida del registro opcional; lo justo para que el diálogo ejercite sus errores. */
function recordError(input: TaskCompletionInput): string | null {
  if (input.reading && input.reading.waterAmountMl === undefined) return 'La lectura debe llevar al menos un valor'
  if (input.reading?.waterAmountMl !== undefined && input.reading.waterAmountMl < 0) return 'La cantidad de agua no puede ser negativa'
  if (input.intervention?.type === 'poda' && input.intervention.potSize !== undefined) return 'Una poda no admite tamaño de maceta'
  if (input.intervention?.type === 'trasplante' && !input.intervention.potSize) return 'Un trasplante necesita el tamaño de la maceta'
  return null
}

export const tasksMockService: TasksApi = {
  list,

  async detail(id) {
    const record = find(id)
    return record ? ok(detail(record)) : notFound()
  },

  async create(input) {
    ensure()
    const invalid = validate(input)
    if (invalid) return badRequest(invalid)
    const resolved = await resolveTarget(input)
    if (typeof resolved === 'string') return badRequest(resolved)

    const stamp = now()
    const record: Stored = {
      plants: resolved.plants,
      task: {
        id: nextId(),
        type: input.type,
        title: input.title.trim(),
        priority: input.priority ?? 'normal',
        status: 'pendiente',
        dueFrom: input.dueFrom,
        dueTo: input.dueTo ?? input.dueFrom,
        notes: input.notes?.trim() || null,
        origin: 'manual',
        target: resolved.target,
        completion: null,
        closedReason: null,
        createdAt: stamp,
        updatedAt: stamp,
      },
    }
    ensure().push(record)
    return ok(detail(record))
  },

  async update(id, input) {
    const record = find(id)
    if (!record) return notFound()
    if (record.task.status !== 'pendiente') return notPending()
    const invalid = validate(input)
    if (invalid) return badRequest(invalid)
    const resolved = await resolveTarget(input)
    if (typeof resolved === 'string') return badRequest(resolved)

    Object.assign(record.task, {
      type: input.type,
      title: input.title.trim(),
      priority: input.priority ?? 'normal',
      dueFrom: input.dueFrom,
      dueTo: input.dueTo ?? input.dueFrom,
      notes: input.notes?.trim() || null,
      target: resolved.target,
      updatedAt: now(),
    })
    record.plants = resolved.plants
    return ok(detail(record))
  },

  async schedule(id, input: TaskScheduleInput) {
    const record = find(id)
    if (!record) return notFound()
    if (record.task.status !== 'pendiente') return notPending()
    if (!input.dueFrom) return badRequest('Falta la fecha de inicio')
    if ((input.dueTo ?? input.dueFrom) < input.dueFrom) return badRequest('La fecha de fin no puede ser anterior a la de inicio')

    record.task.dueFrom = input.dueFrom
    record.task.dueTo = input.dueTo ?? input.dueFrom
    record.task.updatedAt = now()
    return ok(detail(record))
  },

  async scope(id, page = 0, size = 50) {
    const record = find(id)
    if (!record) return notFound()
    return ok(paginate(await fullScope(record), page, size))
  },

  async complete(id, input) {
    const record = find(id)
    if (!record) return notFound()
    if (record.task.status !== 'pendiente') return notPending()

    const invalidRecord = recordError(input)
    if (invalidRecord) return badRequest(invalidRecord)
    if (input.completedAt && Date.parse(input.completedAt) > Date.now()) return badRequest('La fecha de finalización no puede ser futura')

    const scope = await fullScope(record)
    const excluded = new Set(input.excludedPlantIds ?? [])
    const inScope = new Set(scope.map((plant) => plant.id))
    if ([...excluded].some((plantId) => !inScope.has(plantId))) return badRequest('Alguna planta excluida no pertenece al alcance de la tarea')
    const affected = scope.filter((plant) => !excluded.has(plant.id)).length
    if (affected === 0) return badRequest('La tarea no afectaría a ninguna planta')

    record.task.status = 'completada'
    record.task.completion = { completedAt: input.completedAt ?? now(), affectedPlants: affected }
    record.task.updatedAt = now()
    return ok(detail(record))
  },

  async skip(id, reason) {
    return close(id, 'omitida', reason)
  },

  async cancel(id, reason) {
    return close(id, 'cancelada', reason)
  },
}

async function close(id: string, status: 'omitida' | 'cancelada', reason?: string): Promise<ServiceResponse<Task>> {
  const record = find(id)
  if (!record) return notFound()
  if (record.task.status !== 'pendiente') return notPending()
  if (reason && reason.length > 500) return badRequest('El motivo admite como máximo 500 caracteres')

  record.task.status = status
  record.task.closedReason = reason?.trim() || null
  record.task.updatedAt = now()
  return ok(detail(record))
}

/** Instala el doble sobre `tasksApiService` y parte de las tareas sembradas. */
export function installTasksFake() {
  resetTasksMock()
  for (const key of Object.keys(tasksMockService) as (keyof TasksApi)[]) {
    vi.spyOn(tasksApiService, key).mockImplementation(tasksMockService[key] as never)
  }
}
