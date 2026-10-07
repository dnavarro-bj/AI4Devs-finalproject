import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { careRecord, plantDetail } from './helpers/fixtures'
import PlantDetailPage from '../app/pages/plants/[id]/index.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/** Escenarios de `plant-dashboard`: cronología real, entradas sin recargar, formularios, Floración. */

interface Entry { id: string, type: string, occurredAt: string, [key: string]: unknown }

const comment = (id: string, at: string, text = 'Marca en el lado oeste', extra: Record<string, unknown> = {}): Entry =>
  ({ id, type: 'comentario', occurredAt: at, comment: { text, ...extra } })
const bloom = (id: string, startedOn: string, over: Record<string, unknown> = {}): Entry =>
  ({ id, type: 'floracion', occurredAt: `${startedOn}T00:00:00Z`, bloom: { startedOn, status: 'finalizada', endedOn: startedOn, ...over } })

/** El servidor: pagina de `size` en `size`, aplica el filtro de tipo y devuelve lo mismo que el API. */
function serve(timeline: Entry[], { size = 25, plant = plantDetail() } = {}) {
  api.get.mockImplementation((path: string, params: { type?: string[], page?: number } = {}) => {
    const envelope = (content: unknown[], page = 0, total = content.length) => ({
      content, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)), pageNumber: page, pageSize: size,
    })
    if (path.endsWith('/timeline')) {
      const all = timeline.filter((entry) => !params.type?.length || params.type.includes(entry.type))
      const page = params.page ?? 0
      return Promise.resolve(envelope(all.slice(page * size, (page + 1) * size), page, all.length))
    }
    if (path === '/tasks' || path.endsWith('/care-records') || path.endsWith('/status-changes') || path.endsWith('/movements')) {
      return Promise.resolve(envelope([]))
    }
    return Promise.resolve(plant)
  })
}

const mountPage = async () => {
  const wrapper = await mountSuspended(PlantDetailPage)
  await settle()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountPage>>
const timelineCalls = () => api.get.mock.calls.filter(([path]) => String(path).endsWith('/timeline'))
const titles = (wrapper: Wrapper) => wrapper.findAll('[data-role="event"] h3').map((node) => node.text())
const openTab = async (wrapper: Wrapper, label: string) => {
  await wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes(label))!.trigger('click')
  await settle()
}

describe('cronología real de la ficha', () => {
  beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()))

  it('muestra los seis tipos juntos, sin ningún evento marcado como ejemplo', async () => {
    serve([
      { id: '6', type: 'floracion', occurredAt: '2026-09-06T00:00:00Z', bloom: { startedOn: '2026-09-06', status: 'en_flor' } },
      { id: '5', type: 'intervencion', occurredAt: '2026-09-05T10:00:00Z', intervention: { type: 'trasplante', potSize: '12 cm' } },
      comment('4', '2026-09-04T10:00:00Z'),
      { id: '3', type: 'movimiento', occurredAt: '2026-09-03T10:00:00Z', movement: { from: { id: '1', name: 'Cuarentena' }, to: { id: '2', name: 'Bandeja A3' } } },
      { id: '2', type: 'cambio_estado', occurredAt: '2026-09-02T10:00:00Z', statusChange: { from: 'activa', to: 'cuarentena', reason: 'Cochinilla' } },
      { id: '1', type: 'lectura', occurredAt: '2026-09-01T10:00:00Z', reading: careRecord({ id: '1', humidity: 31 }) },
    ])
    const wrapper = await mountPage()

    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(6)
    expect(titles(wrapper)).toEqual([
      'En flor', 'Trasplante', 'Comentario', 'Traslado a Bandeja A3', 'Activa → En cuarentena', '3 medidas registradas',
    ])
    expect(wrapper.find('[data-test="timeline"]').find('[data-mock="true"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('ejemplo · T-20')
  })

  it('cada tipo con su cuerpo: floración con intervalo, comentario con texto, movimiento con origen', async () => {
    serve([
      bloom('2', '2026-05-22', { endedOn: '2026-05-25', flowerCount: 2 }),
      comment('1', '2026-05-01T10:00:00Z', 'Pequeña marca'),
      { id: '3', type: 'movimiento', occurredAt: '2026-04-01T10:00:00Z', movement: { from: { id: '1', name: 'Cuarentena' }, to: { id: '2', name: 'A3' } } },
    ])
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="bloom-body"]').text()).toContain('4 días')
    expect(wrapper.find('[data-test="bloom-body"]').text()).toContain('Finalizada')
    expect(wrapper.find('[data-test="comment-body"]').text()).toBe('Pequeña marca')
    expect(wrapper.find('[data-test="movement-from"]').text()).toContain('Cuarentena')
  })

  it('un tipo desconocido se muestra igualmente', async () => {
    serve([{ id: '9', type: 'fenomeno', occurredAt: '2026-09-01T10:00:00Z' }])
    const wrapper = await mountPage()

    expect(titles(wrapper)).toEqual(['fenomeno'])
  })

  it('una tarea completada aparece con su título y su tipo, y no se puede corregir ni retirar', async () => {
    serve([
      { id: '7', type: 'tarea', occurredAt: '2026-09-07T10:00:00Z', task: { taskId: '9', type: 'riego', title: 'Regar la bandeja A3' } },
      comment('1', '2026-09-01T10:00:00Z'),
    ])
    const wrapper = await mountPage()

    expect(titles(wrapper)).toEqual(['Tarea completada', 'Comentario'])
    expect(wrapper.find('[data-test="task-body"]').text()).toBe('Regar la bandeja A3 · Riego')
    const entry = wrapper.find('[data-test="entry-7"]')
    expect(entry.find('[data-test="edit-entry"]').exists()).toBe(false)
    expect(entry.find('[data-test="remove-entry"]').exists()).toBe(false)
  })

  it('el filtro de la cronología ofrece «Tareas» y lo pide al servidor', async () => {
    serve([{ id: '7', type: 'tarea', occurredAt: '2026-09-07T10:00:00Z', task: { taskId: '9', type: 'riego', title: 'Regar' } }, comment('1', '2026-09-01T10:00:00Z')])
    const wrapper = await mountPage()

    const chip = wrapper.findAll('[data-test="timeline"] button').find((button) => button.text().includes('Tareas'))
    expect(chip).toBeDefined()
    await chip!.trigger('click')
    await settle()

    expect(timelineCalls().at(-1)![1]).toMatchObject({ type: ['tarea'], page: 0 })
    expect(titles(wrapper)).toEqual(['Tarea completada'])
  })

  it('filtrar pide al servidor el tipo y el recuento es el del filtro', async () => {
    serve([comment('3', '2026-09-03T00:00:00Z'), bloom('2', '2026-09-02'), bloom('1', '2026-09-01')])
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="timeline-total"]').text()).toBe('3 registros')

    await wrapper.find('[data-test="filter-floracion"]').trigger('click')
    await settle()

    expect(timelineCalls().at(-1)![1]).toMatchObject({ type: ['floracion'], page: 0 })
    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="timeline-total"]').text()).toBe('2 registros')
  })

  it('cargar anteriores conserva el filtro, no repite eventos y desaparece al llegar al final', async () => {
    serve([bloom('4', '2026-09-04'), comment('3', '2026-09-03T00:00:00Z'), bloom('2', '2026-09-02'), bloom('1', '2026-09-01')], { size: 2 })
    const wrapper = await mountPage()
    await wrapper.find('[data-test="filter-floracion"]').trigger('click')
    await settle()
    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(2)

    await wrapper.find('[data-test="load-more"]').trigger('click')
    await settle()

    expect(timelineCalls().at(-1)![1]).toMatchObject({ type: ['floracion'], page: 1 })
    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(3)
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false)
  })

  it('un evento de un lote lo dice', async () => {
    serve([{ ...comment('1', '2026-09-01T00:00:00Z'), batchId: '99' }])
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="batch-legend"]').text()).toContain('varias plantas')
  })

  it('sin eventos lo dice y ofrece añadir el primer comentario', async () => {
    serve([])
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="timeline-empty"]').exists()).toBe(true)
    await wrapper.find('[data-test="add-first-comment"]').trigger('click')
    expect(wrapper.find('[data-test="comment-form"]').exists()).toBe(true)
  })

  it('si la cronología falla, la ficha sigue mostrando la planta', async () => {
    api.get.mockImplementation((path: string) => String(path).endsWith('/timeline')
      ? Promise.reject(new ApiError(500, 'Fallo del servidor'))
      : Promise.resolve(String(path).match(/^\/tasks$|care-records|status-changes|movements/)
        ? { content: [], totalElements: 0, totalPages: 1, pageNumber: 0, pageSize: 25 }
        : plantDetail()))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Bola verde')
    expect(wrapper.find('[data-test="timeline-error"]').text()).toContain('Fallo del servidor')
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
  })
})

describe('entradas sin recargar y formularios', () => {
  beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()))

  it('anotar un comentario lo coloca en la cronología sin recargarla', async () => {
    serve([comment('1', '2026-09-01T00:00:00Z', 'Antiguo')])
    api.post.mockResolvedValue(comment('2', '2026-09-05T00:00:00Z', 'Nuevo'))
    const wrapper = await mountPage()
    // La cronología completa (sin tipo): la pestaña de floraciones se actualiza aparte.
    const full = () => timelineCalls().filter(([, params]) => !params.type)
    const before = full().length

    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-comment"]').trigger('click')
    await wrapper.find('[data-test="comment-text"]').setValue('Nuevo')
    await wrapper.find('[data-test="comment-form"]').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/plants/882687672222443468/comments', { text: 'Nuevo' })
    expect(wrapper.findAll('[data-test="comment-body"]').map((node) => node.text())).toEqual(['Nuevo', 'Antiguo'])
    expect(wrapper.find('[data-test="comment-form"]').exists()).toBe(false)
    expect(full().length).toBe(before)
  })

  it('con un filtro activo, un comentario nuevo no se cuela en la lista filtrada', async () => {
    serve([bloom('1', '2026-09-01')])
    api.post.mockResolvedValue(comment('2', '2026-09-05T00:00:00Z'))
    const wrapper = await mountPage()
    await wrapper.find('[data-test="filter-floracion"]').trigger('click')
    await settle()

    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-comment"]').trigger('click')
    await wrapper.find('[data-test="comment-text"]').setValue('Otro')
    await wrapper.find('[data-test="comment-form"]').trigger('submit')
    await settle()

    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="comment-body"]').exists()).toBe(false)
  })

  it('cambiar el estado recarga la primera página y el cambio aparece', async () => {
    serve([])
    api.put.mockResolvedValue(plantDetail({ status: 'cuarentena' }))
    const wrapper = await mountPage()
    serve([{ id: '7', type: 'cambio_estado', occurredAt: '2026-09-06T10:00:00Z', statusChange: { from: 'activa', to: 'cuarentena' } }])

    await wrapper.find('[data-test="change-status"]').trigger('click')
    await wrapper.find('[data-test="new-status"]').setValue('cuarentena')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(titles(wrapper)).toEqual(['Activa → En cuarentena'])
  })

  it('corregir un comentario muestra el texto nuevo y «editado»', async () => {
    serve([comment('1', '2026-09-01T00:00:00Z', 'Antes')])
    api.put.mockResolvedValue(comment('1', '2026-09-01T00:00:00Z', 'Después', { editedAt: '2026-09-07T10:00:00Z' }))
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="comment-edited"]').exists()).toBe(false)

    await wrapper.find('[data-test="edit-entry"]').trigger('click')
    await wrapper.find('[data-test="comment-text"]').setValue('Después')
    await wrapper.find('[data-test="comment-form"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/plants/882687672222443468/comments/1', { text: 'Después' })
    expect(wrapper.find('[data-test="comment-body"]').text()).toBe('Después')
    expect(wrapper.find('[data-test="comment-edited"]').text()).toContain('editado')
  })

  it('retirar pide confirmación: cancelar no cambia nada y confirmar lo quita', async () => {
    serve([comment('1', '2026-09-01T00:00:00Z')])
    api.delete.mockResolvedValue(undefined)
    const wrapper = await mountPage()

    await wrapper.find('[data-test="remove-entry"]').trigger('click')
    await wrapper.find('[data-test="cancel-remove"]').trigger('click')
    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(1)

    await wrapper.find('[data-test="remove-entry"]').trigger('click')
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/plants/882687672222443468/comments/1')
    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(0)
  })

  it('un rechazo del API se explica y el diálogo conserva lo escrito', async () => {
    serve([comment('1', '2026-09-01T00:00:00Z')])
    api.post.mockRejectedValue(new ApiError(400, 'La fecha del comentario no puede estar en el futuro'))
    const wrapper = await mountPage()

    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-comment"]').trigger('click')
    await wrapper.find('[data-test="comment-text"]').setValue('No se pierde')
    await wrapper.find('[data-test="comment-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="timeline-dialog-error"]').text()).toContain('futuro')
    expect((wrapper.find('[data-test="comment-text"]').element as HTMLTextAreaElement).value).toBe('No se pierde')
  })
})

describe('pestaña Floración y última floración', () => {
  beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()))

  const glanceBloom = (wrapper: Wrapper) =>
    wrapper.findAll('[data-role="summary-item"]').find((item) => item.text().includes('Última floración'))!

  it('lista las floraciones de la más reciente a la más antigua y la pestaña lleva el recuento', async () => {
    serve([bloom('3', '2026-09-01'), bloom('2', '2026-05-22'), bloom('1', '2025-05-01')])
    const wrapper = await mountPage()

    expect(wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes('Floración'))!.text()).toContain('3')
    await openTab(wrapper, 'Floración')

    const rows = wrapper.findAll('[data-role="bloom"]').map((row) => row.text())
    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain('sept')
    expect(rows[2]).toContain('2025')
  })

  it('«última floración» es real: su mes y cuánto duró, sin marca de ejemplo', async () => {
    serve([bloom('1', '2026-05-22', { endedOn: '2026-05-25' })])
    const wrapper = await mountPage()

    const item = glanceBloom(wrapper)
    expect(item.text()).toContain('Mayo de 2026')
    expect(item.text()).toContain('Duró 4 días')
    expect(item.attributes('data-mock')).toBeUndefined()
  })

  it('una floración abierta se dice en curso', async () => {
    serve([{ id: '1', type: 'floracion', occurredAt: '2026-09-01T00:00:00Z', bloom: { startedOn: '2026-09-01', status: 'en_flor' } }])
    const wrapper = await mountPage()

    expect(glanceBloom(wrapper).text()).toContain('En curso')
  })

  it('sin floraciones lo dice y la pestaña ofrece registrar la primera', async () => {
    serve([comment('1', '2026-09-01T00:00:00Z')])
    const wrapper = await mountPage()

    expect(glanceBloom(wrapper).text()).toContain('Sin floraciones registradas')
    await openTab(wrapper, 'Floración')
    expect(wrapper.find('[data-test="blooms-empty"]').exists()).toBe(true)

    await wrapper.find('[data-test="add-first-bloom"]').trigger('click')
    expect(wrapper.find('[data-test="bloom-form"]').exists()).toBe(true)
  })

  it('cerrar una floración abierta la corrige a «finalizada» con su fin', async () => {
    serve([{ id: '1', type: 'floracion', occurredAt: '2026-09-01T00:00:00Z', bloom: { startedOn: '2026-09-01', status: 'en_flor' } }])
    api.put.mockResolvedValue(bloom('1', '2026-09-01', { endedOn: '2026-09-04' }))
    const wrapper = await mountPage()
    await openTab(wrapper, 'Floración')

    await wrapper.find('[data-test="close-bloom"]').trigger('click')
    await wrapper.find('[data-test="bloom-ended"]').setValue('2026-09-04')
    await wrapper.find('[data-test="bloom-form"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/plants/882687672222443468/blooms/1', { startedOn: '2026-09-01', status: 'finalizada', endedOn: '2026-09-04' })
  })

  it('no mezcla la floración esperada de la especie', async () => {
    serve([])
    const wrapper = await mountPage()
    await openTab(wrapper, 'Floración')

    expect(wrapper.find('[data-test="bloom-panel"]').text()).not.toMatch(/esperada/i)
  })
})

/** Requirement «La cronología dice cuándo un registro vino de un lote» (`plant-dashboard`). */
describe('registros de un lote en la cronología', () => {
  beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()))

  const legend = (wrapper: Wrapper, id: string) => wrapper.find(`[data-test="entry-${id}"] [data-test="batch-legend"]`)

  it('una lectura, una intervención y un comentario de un lote lo dicen con el tamaño de la operación', async () => {
    serve([
      { id: '3', type: 'comentario', occurredAt: '2026-09-03T10:00:00Z', batchId: '9', batchSize: 31, comment: { text: 'Movidas por el frío' } },
      { id: '2', type: 'intervencion', occurredAt: '2026-09-02T10:00:00Z', batchId: '8', batchSize: 12, intervention: { type: 'poda' } },
      { id: '1', type: 'lectura', occurredAt: '2026-09-01T10:00:00Z', batchId: '7', batchSize: 24, reading: careRecord({ id: '1', waterAmountMl: 200 }) },
    ])
    const wrapper = await mountPage()

    expect(legend(wrapper, '3').text()).toBe('En un lote de 31 plantas')
    expect(legend(wrapper, '2').text()).toBe('En un lote de 12 plantas')
    expect(legend(wrapper, '1').text()).toBe('En un lote de 24 plantas')
  })

  it('un registro individual no menciona ningún lote', async () => {
    serve([
      comment('2', '2026-09-02T10:00:00Z'),
      { id: '1', type: 'lectura', occurredAt: '2026-09-01T10:00:00Z', reading: careRecord({ id: '1', humidity: 31 }) },
    ])
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="batch-legend"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('En un lote')
  })

  it('un lote de una sola planta habla en singular', async () => {
    serve([{ id: '1', type: 'comentario', occurredAt: '2026-09-01T10:00:00Z', batchId: '9', batchSize: 1, comment: { text: 'a' } }])
    const wrapper = await mountPage()

    expect(legend(wrapper, '1').text()).toBe('En un lote de 1 planta')
  })
})
