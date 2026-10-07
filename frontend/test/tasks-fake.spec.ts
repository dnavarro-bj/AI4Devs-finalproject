import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@shared/types/api.types'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import { locationsApiService } from '@features/locations/services/locations.api.service'
import { resetTasksMock, tasksMockService as tasks } from './support/tasksFake'

/**
 * El doble es un servidor en memoria con la forma del contrato del API: estos tests fijan que
 * se comporta como él en lo que las pantallas dan por hecho (filtros, ciclo de vida, alcance).
 * Hoy es 2026-10-07; lo sembrado está fechado respecto a ese día.
 */
const TODAY = '2026-10-07'

const plant = (id: string, code: string, locationId = '300001') => ({
  id, code, nickname: `Planta ${code}`, status: 'activa', createdAt: null,
  location: { id: locationId, name: 'Invernadero 1' },
  species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
})

function page<T>(content: T[]) {
  return ok({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 500 })
}

beforeEach(() => {
  resetTasksMock()
  vi.spyOn(locationsApiService, 'list').mockResolvedValue(page([
    { id: '300001', name: 'Invernadero 1', path: 'Invernadero 1' },
    { id: '300002', name: 'Bandeja A3', path: 'Invernadero 1 / Bandeja A3' },
    { id: '300009', name: 'Invernadero 2', path: 'Invernadero 2' },
  ] as never))
  vi.spyOn(plantsApiService, 'list').mockResolvedValue(page([
    plant('1', 'CAT-GRUSS-01'), plant('2', 'CAT-GRUSS-02'), plant('3', 'CAT-GRUSS-03'),
  ] as never))
})

afterEach(() => vi.restoreAllMocks())

const create = (extra: Record<string, unknown> = {}) => tasks.create({
  type: 'riego', title: 'Regar', priority: 'normal', dueFrom: TODAY, locationId: '300001', ...extra,
} as never)

describe('listado', () => {
  it('por defecto, solo las pendientes, de la que acaba antes a la que acaba después', async () => {
    const result = await tasks.list({ today: TODAY })

    const rows = result.data!.content
    expect(rows.every((task) => task.status === 'pendiente')).toBe(true)
    expect(rows.map((task) => task.dueTo)).toEqual([...rows.map((task) => task.dueTo)].sort())
  })

  it('«vencida» se calcula: lo pendiente que terminó antes de hoy', async () => {
    const result = await tasks.list({ due: 'overdue', today: TODAY })

    expect(result.data!.content.length).toBeGreaterThan(0)
    expect(result.data!.content.every((task) => task.dueTo < TODAY)).toBe(true)
  })

  it('un periodo que contiene hoy está en «hoy» y no vencido', async () => {
    const today = await tasks.list({ due: 'today', today: TODAY })
    const overdue = await tasks.list({ due: 'overdue', today: TODAY })

    const period = today.data!.content.find((task) => task.dueFrom < TODAY && task.dueTo > TODAY)
    expect(period).toBeDefined()
    expect(overdue.data!.content.some((task) => task.id === period!.id)).toBe(false)
  })

  it('varios estados, tipo y prioridad como el API', async () => {
    const closed = await tasks.list({ status: ['completada', 'omitida', 'cancelada'], today: TODAY })
    expect(new Set(closed.data!.content.map((task) => task.status))).toEqual(new Set(['completada', 'omitida', 'cancelada']))

    const high = await tasks.list({ priority: ['alta'], type: ['riego'], today: TODAY })
    expect(high.data!.content.every((task) => task.priority === 'alta' && task.type === 'riego')).toBe(true)
  })

  it('el intervalo se solapa con el periodo, no solo lo contiene', async () => {
    const result = await tasks.list({ from: '2026-10-08', to: '2026-10-09', today: TODAY })

    // La tarea de cambio de maceta va de ayer a pasado mañana: toca esos días.
    expect(result.data!.content.some((task) => task.type === 'cambio_maceta')).toBe(true)
  })

  it('texto en el título, sin distinguir mayúsculas', async () => {
    const result = await tasks.list({ q: 'SOMBREO', today: TODAY })

    expect(result.data!.content.map((task) => task.title)).toEqual(['Instalar sombreo temporal'])
  })

  it('por localización, con y sin sublocalizaciones', async () => {
    const exact = await tasks.list({ location: '300001', today: TODAY })
    expect(exact.data!.content.every((task) => task.target.kind === 'location' && task.target.location.id === '300001')).toBe(true)

    const inside = await tasks.list({ location: '300001', includeDescendants: true, today: TODAY })
    const ids = inside.data!.content.map((task) => task.id)
    // La bandeja A3 está dentro del invernadero 1: sus tareas entran con los descendientes.
    expect(ids).toContain('t3')
    expect(exact.data!.content.map((task) => task.id)).not.toContain('t3')
  })

  it('por planta: las dirigidas a ella y las de la localización donde está', async () => {
    const created = await create({ locationId: undefined, plantIds: ['2'] })
    const result = await tasks.list({ plant: '2', today: TODAY })

    const ids = result.data!.content.map((task) => task.id)
    expect(ids).toContain(created.data!.id)
    // Una tarea del invernadero 1 también le afecta: la planta está en él.
    expect(ids).toContain('t6')
  })

  it('pagina con el envelope', async () => {
    const result = await tasks.list({ size: 3, today: TODAY })

    expect(result.data!.content).toHaveLength(3)
    expect(result.data!.totalElements).toBeGreaterThan(3)
    expect(result.data!.totalPages).toBeGreaterThan(1)
  })

  it('devuelve copias: quien las edite no altera el estado', async () => {
    const first = await tasks.list({ today: TODAY })
    first.data!.content[0]!.title = 'cambiada'

    expect((await tasks.list({ today: TODAY })).data!.content[0]!.title).not.toBe('cambiada')
  })
})

describe('alta y edición', () => {
  it('crear devuelve la tarea pendiente y el listado la trae después', async () => {
    const created = await create({ title: ' Regar el vivero ', dueTo: '2026-10-10' })

    expect(created.data).toMatchObject({ status: 'pendiente', origin: 'manual', title: 'Regar el vivero', dueTo: '2026-10-10' })
    const listed = await tasks.list({ q: 'vivero', today: TODAY })
    expect(listed.data!.totalElements).toBe(1)
  })

  it('sin fin, un día exacto', async () => {
    expect((await create()).data).toMatchObject({ dueFrom: TODAY, dueTo: TODAY })
  })

  it('rechaza lo que el API rechazaría', async () => {
    expect((await create({ title: '  ' })).error?.status).toBe(400)
    expect((await create({ dueTo: '2026-10-01' })).error?.status).toBe(400)
    expect((await create({ locationId: undefined })).error?.status).toBe(400)
    expect((await create({ plantIds: ['1'] })).error?.status).toBe(400)
    expect((await create({ locationId: '999' })).error?.status).toBe(400)
  })

  it('las plantas expresas aparecen en el detalle, no en el listado', async () => {
    const created = await create({ locationId: undefined, plantIds: ['1', '3'] })

    expect(created.data!.target).toMatchObject({ kind: 'plants', plantCount: 2 })
    expect((created.data!.target as { plants: unknown[] }).plants).toHaveLength(2)
    const listed = await tasks.list({ q: 'Regar', today: TODAY })
    expect((listed.data!.content[0]!.target as { plants?: unknown }).plants).toBeUndefined()
  })

  it('reemplazar cambia el destino; reprogramar solo el periodo', async () => {
    const created = (await create({ locationId: undefined, plantIds: ['1'] })).data!

    const updated = await tasks.update(created.id, { type: 'otra', title: 'Revisar', priority: 'alta', dueFrom: TODAY, locationId: '300002' })
    expect(updated.data!.target).toMatchObject({ kind: 'location' })

    const moved = await tasks.schedule(created.id, { dueFrom: '2026-10-20', dueTo: '2026-10-22' })
    expect(moved.data).toMatchObject({ dueFrom: '2026-10-20', dueTo: '2026-10-22', title: 'Revisar' })
  })

  it('una tarea cerrada no se edita ni se reprograma: 409', async () => {
    const closed = (await tasks.list({ status: ['completada'], today: TODAY })).data!.content[0]!

    expect((await tasks.update(closed.id, { type: 'otra', title: 'x', priority: 'normal', dueFrom: TODAY, locationId: '300001' })).error?.status).toBe(409)
    expect((await tasks.schedule(closed.id, { dueFrom: TODAY })).error?.status).toBe(409)
  })

  it('una tarea inexistente es 404', async () => {
    expect((await tasks.detail('nope')).error?.status).toBe(404)
  })
})

describe('alcance y cierre', () => {
  it('el alcance de una localización son sus plantas en curso, por código y paginadas', async () => {
    const created = (await create()).data!

    const first = await tasks.scope(created.id, 0, 2)

    expect(first.data!.content.map((p) => p.code)).toEqual(['CAT-GRUSS-01', 'CAT-GRUSS-02'])
    expect(first.data!.totalElements).toBe(3)
    expect(first.data!.content[0]).toMatchObject({ species: { scientificName: 'Echinocactus grusonii' } })
  })

  it('completar con exclusiones dice cuántas plantas afectó y pasa a «Completadas»', async () => {
    const created = (await create()).data!

    const done = await tasks.complete(created.id, { excludedPlantIds: ['3'] })

    expect(done.data).toMatchObject({ status: 'completada', completion: { affectedPlants: 2 } })
    expect((await tasks.list({ today: TODAY })).data!.content.some((task) => task.id === created.id)).toBe(false)
    expect((await tasks.list({ status: ['completada'], today: TODAY })).data!.content.some((task) => task.id === created.id)).toBe(true)
  })

  it('una exclusión ajena, un alcance vacío, una fecha futura y un registro vacío son 400', async () => {
    const created = (await create()).data!

    expect((await tasks.complete(created.id, { excludedPlantIds: ['999'] })).error?.status).toBe(400)
    expect((await tasks.complete(created.id, { excludedPlantIds: ['1', '2', '3'] })).error?.status).toBe(400)
    expect((await tasks.complete(created.id, { completedAt: '2999-01-01T00:00:00Z' })).error?.status).toBe(400)
    expect((await tasks.complete(created.id, { reading: {} })).error?.status).toBe(400)
    expect((await tasks.detail(created.id)).data!.status).toBe('pendiente')
  })

  it('completar dos veces es 409', async () => {
    const created = (await create()).data!
    await tasks.complete(created.id, {})

    expect((await tasks.complete(created.id, {})).error?.status).toBe(409)
  })

  it('omitir y cancelar conservan el motivo y no cuentan como completadas', async () => {
    const a = (await create()).data!
    const b = (await create()).data!

    expect((await tasks.skip(a.id, ' lluvia ')).data).toMatchObject({ status: 'omitida', closedReason: 'lluvia' })
    expect((await tasks.cancel(b.id)).data).toMatchObject({ status: 'cancelada', closedReason: null })
    expect((await tasks.cancel(a.id)).error?.status).toBe(409)
  })
})
