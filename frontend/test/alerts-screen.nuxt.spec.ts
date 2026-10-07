import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import AlertsIndex from '../app/pages/alerts/index.vue'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { locationsApiService } from '@features/locations/services/locations.api.service'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useToast } from '@shared/composables/useToast'
import { ok, fail, domainError, ErrorCodes } from '@shared/types/api.types'
import { installAlertsFake, makeAlert, plantSubject, resetAlertsFake } from './support/alertsFake'

/**
 * Escenarios de la requirement «Bandeja de alertas», que especifica la composición de la pantalla
 * `alerts` del prototipo: una tarjeta por alerta con su categoría, severidad y ciclo de vida, no una
 * tabla. Las alertas son las del API (aquí, un doble en memoria con su forma); «hoy» es 2026-10-07.
 */
enableAutoUnmount(afterEach)

const TODAY = '2026-10-07'

const SEED = [
  makeAlert({
    id: '1', category: 'temperatura', severity: 'critica', status: 'nueva',
    reason: 'Temperatura por debajo del mínimo', lastDetectedAt: '2026-10-07T08:30:00Z', occurrences: 4,
  }),
  makeAlert({
    id: '2', source: 'sin_revisar', category: 'seguimiento', severity: 'media', status: 'nueva',
    reason: 'Sin observaciones durante 43 días', lastDetectedAt: '2026-10-06T06:00:00Z',
    plant: plantSubject('CAT-GRUSS-01', 'Echinocactus grusonii', '6'),
  }),
  makeAlert({
    id: '3', category: 'humedad', severity: 'media', status: 'revisada',
    reason: 'Humedad fuera del rango efectivo', lastDetectedAt: '2026-10-05T06:00:00Z',
    plant: plantSubject('CAT-ASTRO-12', 'Astrophytum asterias', '7'),
  }),
  makeAlert({
    id: '4', source: 'cuidado_vencido', category: 'riego', severity: 'baja', status: 'nueva',
    reason: 'Riego vencido desde hace 3 días', lastDetectedAt: '2026-10-04T06:00:00Z', plant: null,
    location: { id: '9', name: 'Bancada norte', path: 'Invernadero 1 / Bancada norte' },
  }),
  makeAlert({
    id: '5', severity: 'critica', status: 'resuelta', reason: 'Temperatura por encima del máximo',
    lastDetectedAt: '2026-09-28T06:00:00Z', closedAt: '2026-09-29T10:00:00Z', resolvedAt: '2026-09-29T10:00:00Z',
    resolutionComment: 'Se movió a la sombra', plant: plantSubject('CAT-ARIO-02', 'Ariocarpus fissuratus', '8'),
  }),
  makeAlert({
    id: '6', source: 'sin_revisar', category: 'seguimiento', severity: 'baja', status: 'descartada',
    reason: 'Sin observaciones durante 31 días', lastDetectedAt: '2026-09-20T06:00:00Z', closedAt: '2026-09-21T10:00:00Z',
    plant: plantSubject('CAT-SCHLUM-03', 'Schlumbergera truncata', '9'),
  }),
]

beforeEach(() => {
  useReferenceDate().value = TODAY
  resetAlertsFake(SEED)
  installAlertsFake()
  vi.spyOn(locationsApiService, 'list').mockResolvedValue(ok({
    content: [{ id: '9', name: 'Bancada norte', path: 'Invernadero 1 / Bancada norte', plantCountTotal: 3 }],
    totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 500,
  }) as never)
})

afterEach(() => {
  vi.restoreAllMocks()
  useToast().clear()
})

async function flush() {
  for (let i = 0; i < 4; i++) await settle()
}

async function open(route = '/alerts') {
  const wrapper = await mountSuspended(AlertsIndex, { route })
  await flush()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof open>>
const card = (wrapper: Wrapper, id: string) => wrapper.find(`[data-test="alert-card"][data-id="${id}"]`)
const states = (wrapper: Wrapper) => wrapper.findAll('[data-test="alert-card"]').map((node) => node.attributes('data-state'))

describe('bandeja de alertas', () => {
  it('muestra una tarjeta por alerta abierta y el recuento de la cabecera es el del API', async () => {
    const wrapper = await open()

    expect(wrapper.findAll('[data-test="alert-card"]')).toHaveLength(4)
    expect(wrapper.find('[data-test="page-context"]').text()).toContain('4 abiertas')
  })

  it('por defecto solo muestra las abiertas y la crítica va primero', async () => {
    const wrapper = await open()

    expect(states(wrapper).every((state) => state === 'nueva' || state === 'revisada')).toBe(true)
    expect(wrapper.findAll('[data-test="alert-card"]')[0]!.attributes('data-id')).toBe('1')
  })

  it('llegar con ?source= aplica el origen como filtro a la vista y quitable (así abre el Dashboard «sin revisar»)', async () => {
    const wrapper = await open('/alerts?source=sin_revisar&status=open')

    expect(alertsApiService.list).toHaveBeenCalledWith(expect.objectContaining({ source: 'sin_revisar' }))
    expect((wrapper.find('[data-test="filter-origin"]').element as HTMLSelectElement).value).toBe('sin_revisar')
    expect(states(wrapper)).toEqual(['nueva'])

    await wrapper.find('[data-test="filter-origin"]').setValue('')
    await flush()
    expect(wrapper.findAll('[data-test="alert-card"]').length).toBeGreaterThan(1)
  })

  it('un ?source= que no es un origen se ignora sin romper la bandeja', async () => {
    const wrapper = await open('/alerts?source=inventado')

    expect((wrapper.find('[data-test="filter-origin"]').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.findAll('[data-test="alert-card"]')).toHaveLength(4)
  })

  it('no hay ninguna marca de maqueta ni de ticket', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="mock-notice"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('T-23')
  })

  it('la severidad se lee en texto y la crítica tiene además una marca propia', async () => {
    const wrapper = await open()

    const critical = card(wrapper, '1')
    const medium = card(wrapper, '2')
    expect(critical.text()).toContain('Crítica')
    expect(medium.text()).toContain('Media')
    expect(critical.find('[data-test="alert-mark"]').text()).not.toBe(medium.find('[data-test="alert-mark"]').text())
  })

  it('cada tarjeta compone categoría, severidad, estado, motivo, planta con su especie, ruta y detección', async () => {
    const wrapper = await open()

    const first = card(wrapper, '1')
    expect(first.text()).toContain('Temperatura')
    expect(first.find('[data-test="alert-state"]').text()).toBe('Nueva')
    expect(first.find('h2').text()).toBe('Temperatura por debajo del mínimo')
    const link = first.find('a[href="/plants/5"]')
    expect(link.text()).toContain('CAT-FEROC-08')
    expect(link.find('em').text()).toBe('Ferocactus gracilis')
    expect(first.text()).toContain('Invernadero 2 / B1')
    expect(first.find('[data-test="alert-detected"]').exists()).toBe(true)
  })

  it('una alerta que se repitió dice cuántas veces y cuándo fue la última', async () => {
    const wrapper = await open()

    expect(card(wrapper, '1').find('[data-test="alert-detected"]').text()).toBe('Detectada 4 veces · última hoy')
    expect(card(wrapper, '2').find('[data-test="alert-detected"]').text()).toBe('Detectada ayer')
  })

  it('junto a «hoy» o «ayer» la tarjeta da la fecha completa de la última detección', async () => {
    const wrapper = await open()

    const when = card(wrapper, '1').find('[data-test="alert-detected-at"]')
    expect(when.exists()).toBe(true)
    expect(when.text()).toMatch(/^\d{1,2} de [a-záéíóú]+ de \d{4}, \d{2}:\d{2}$/)
    expect(when.element.tagName).toBe('TIME')
    expect(when.attributes('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('una alerta de localización muestra su nombre y su ruta y lleva a su ficha', async () => {
    const wrapper = await open()

    const zone = card(wrapper, '4')
    expect(zone.find('a[href="/locations/9"]').text()).toContain('Bancada norte')
    expect(zone.text()).toContain('Invernadero 1 / Bancada norte')
  })

  it('los cuatro filtros están habilitados, el de origen incluido', async () => {
    const wrapper = await open()

    for (const filter of ['state', 'severity', 'location', 'origin']) {
      const select = wrapper.find(`select[data-test="filter-${filter}"]`)
      expect(select.exists()).toBe(true)
      expect(select.attributes('disabled')).toBeUndefined()
    }
    const origins = wrapper.find('select[data-test="filter-origin"]').findAll('option').map((option) => option.text())
    expect(origins).toContain('Medición fuera de rango')
    expect(origins).toContain('Recomendación de IA')
  })

  it('las acciones dependen del estado: nueva, revisada y cerrada', async () => {
    const wrapper = await open()
    const has = (id: string, test: string) => card(wrapper, id).find(`[data-test="${test}"]`).exists()

    expect(['create-task', 'review-alert', 'resolve-alert', 'dismiss-alert'].map((test) => has('1', test))).toEqual([true, true, true, true])
    expect(['create-task', 'review-alert', 'resolve-alert', 'dismiss-alert'].map((test) => has('3', test))).toEqual([true, false, true, true])
  })

  it('una cerrada dice cómo se cerró y no ofrece acciones', async () => {
    const wrapper = await open()
    await wrapper.find('select[data-test="filter-state"]').setValue('all')
    await flush()

    const resolved = card(wrapper, '5')
    expect(resolved.find('[data-test="alert-closed"]').text()).toContain('Resuelta el 29 sept')
    expect(resolved.find('[data-test="alert-closed"]').text()).toContain('Se movió a la sombra')
    expect(resolved.findAll('button')).toHaveLength(0)
    expect(card(wrapper, '6').find('[data-test="alert-closed"]').text()).toContain('Descartada el 21 sept')
  })
})

describe('filtros', () => {
  it('filtrar por un estado viaja al servidor y solo muestra ese estado', async () => {
    const wrapper = await open()

    await wrapper.find('select[data-test="filter-state"]').setValue('resuelta')
    await flush()

    expect(alertsApiService.list).toHaveBeenCalledWith(expect.objectContaining({ status: ['resuelta'] }))
    expect(states(wrapper)).toEqual(['resuelta'])
    // La cabecera sigue contando lo abierto, aunque el filtro enseñe otra cosa.
    expect(wrapper.find('[data-test="page-context"]').text()).toContain('4 abiertas')
  })

  it('filtrar por severidad y por origen viaja al servidor', async () => {
    const wrapper = await open()

    await wrapper.find('select[data-test="filter-severity"]').setValue('critica')
    await wrapper.find('select[data-test="filter-origin"]').setValue('medicion')
    await flush()

    expect(alertsApiService.list).toHaveBeenCalledWith(expect.objectContaining({ severity: ['critica'], source: 'medicion' }))
    expect(wrapper.findAll('[data-test="alert-card"]').map((node) => node.attributes('data-id'))).toEqual(['1'])
  })

  it('un filtro sin resultados lo explica', async () => {
    const wrapper = await open()

    await wrapper.find('select[data-test="filter-severity"]').setValue('baja')
    await wrapper.find('select[data-test="filter-origin"]').setValue('manual')
    await flush()

    expect(wrapper.find('[data-test="no-match"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="alert-card"]')).toHaveLength(0)
  })

  it('una planta en la URL filtra la bandeja y lo dice', async () => {
    const wrapper = await open('/alerts?plant=6')

    expect(alertsApiService.list).toHaveBeenCalledWith(expect.objectContaining({ plant: '6' }))
    expect(wrapper.findAll('[data-test="alert-card"]').map((node) => node.attributes('data-id'))).toEqual(['2'])
    expect(wrapper.find('[data-test="scope-note"]').exists()).toBe(true)
  })

  it('una localización en la URL pide también sus descendientes', async () => {
    await open('/alerts?location=9')

    expect(alertsApiService.list).toHaveBeenCalledWith(expect.objectContaining({ location: '9', includeDescendants: true }))
  })
})

describe('acciones', () => {
  it('revisar pasa a revisada, ofrece ya solo resolver y descartar y no cambia el recuento', async () => {
    const wrapper = await open()

    await card(wrapper, '1').find('[data-test="review-alert"]').trigger('click')
    await flush()

    expect(card(wrapper, '1').find('[data-test="alert-state"]').text()).toBe('Revisada')
    expect(card(wrapper, '1').find('[data-test="review-alert"]').exists()).toBe(false)
    expect(card(wrapper, '1').find('[data-test="resolve-alert"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="page-context"]').text()).toContain('4 abiertas')
  })

  it('resolver con un comentario la cierra, sale de las abiertas y el recuento baja', async () => {
    const wrapper = await open()

    await card(wrapper, '1').find('[data-test="resolve-alert"]').trigger('click')
    await flush()
    await wrapper.find('[data-test="alert-close-comment"]').setValue('Cambiada de sitio')
    await wrapper.find('[data-test="alert-close-form"]').trigger('submit')
    await flush()

    expect(alertsApiService.transition).toHaveBeenCalledWith('1', 'resolve', 'Cambiada de sitio')
    expect(card(wrapper, '1').exists()).toBe(false)
    expect(wrapper.find('[data-test="page-context"]').text()).toContain('3 abiertas')
  })

  it('descartar queda como «Descartada» y se distingue de resolver', async () => {
    const wrapper = await open()

    await card(wrapper, '2').find('[data-test="dismiss-alert"]').trigger('click')
    await flush()
    expect(wrapper.find('[data-test="alert-close-submit"]').text()).toContain('Descartar alerta')
    await wrapper.find('[data-test="alert-close-form"]').trigger('submit')
    await flush()

    expect(alertsApiService.transition).toHaveBeenCalledWith('2', 'dismiss', undefined)
    await wrapper.find('select[data-test="filter-state"]').setValue('descartada')
    await flush()
    expect(card(wrapper, '2').find('[data-test="alert-state"]').text()).toBe('Descartada')
  })

  it('un 409 al resolver se explica en el diálogo y no pierde el comentario', async () => {
    vi.spyOn(alertsApiService, 'transition').mockResolvedValue(
      fail(domainError(ErrorCodes.CONFLICT, 'La alerta ya está cerrada', 409)),
    )
    const wrapper = await open()

    await card(wrapper, '1').find('[data-test="resolve-alert"]').trigger('click')
    await flush()
    await wrapper.find('[data-test="alert-close-comment"]').setValue('Texto importante')
    await wrapper.find('[data-test="alert-close-form"]').trigger('submit')
    await flush()

    expect(wrapper.find('[data-test="alert-close-error"]').element.textContent).toContain('ya está cerrada')
    expect((wrapper.find('[data-test="alert-close-comment"]').element as HTMLTextAreaElement).value).toBe('Texto importante')
  })
})

describe('crear una tarea desde una alerta', () => {
  it('abre el formulario con el destino, el título y la prioridad de la alerta y la deja como estaba', async () => {
    vi.spyOn(plantsApiService, 'list').mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 8 }) as never)
    const create = vi.spyOn(tasksApiService, 'create').mockResolvedValue(ok({ id: '77', title: 'x' }) as never)
    const wrapper = await open()

    await card(wrapper, '1').find('[data-test="create-task"]').trigger('click')
    await flush()

    expect((wrapper.find('[data-test="task-title"]').element as HTMLInputElement).value).toBe('Revisar temperatura de CAT-FEROC-08')
    expect((wrapper.find('[data-test="task-priority"]').element as HTMLSelectElement).value).toBe('alta')
    expect(wrapper.text()).toContain('CAT-FEROC-08')

    await wrapper.find('[data-test="task-form"]').trigger('submit')
    await flush()

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ originAlertId: '1', plantIds: ['5'], priority: 'alta' }))
    expect(card(wrapper, '1').find('[data-test="alert-state"]').text()).toBe('Nueva')
  })
})

describe('estados de la pantalla', () => {
  it('sin alertas abiertas lo dice', async () => {
    resetAlertsFake([])
    const wrapper = await open()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="page-context"]').text()).toContain('0 abiertas')
  })

  it('un fallo de carga lo explica con la opción de reintentar', async () => {
    const list = vi.spyOn(alertsApiService, 'list').mockResolvedValueOnce(
      fail(domainError(ErrorCodes.SERVER_ERROR, 'No se pudo cargar', 500)),
    )
    const wrapper = await open()

    expect(wrapper.find('[data-test="error"]').text()).toContain('No se pudo cargar')
    list.mockRestore()
    installAlertsFake()
    await wrapper.find('[data-test="retry"]').trigger('click')
    await flush()

    expect(wrapper.findAll('[data-test="alert-card"]')).toHaveLength(4)
  })

  it('pagina: «Cargar más» pide la página siguiente con los mismos filtros', async () => {
    resetAlertsFake(Array.from({ length: 25 }, (_, i) => makeAlert({ id: `${100 + i}`, lastDetectedAt: `2026-10-06T${String(i % 24).padStart(2, '0')}:00:00Z` })))
    const wrapper = await open()
    expect(wrapper.findAll('[data-test="alert-card"]')).toHaveLength(20)

    await wrapper.find('[data-test="load-more"]').trigger('click')
    await flush()

    expect(alertsApiService.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: ['nueva', 'revisada'] }))
    expect(wrapper.findAll('[data-test="alert-card"]')).toHaveLength(25)
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false)
  })
})
