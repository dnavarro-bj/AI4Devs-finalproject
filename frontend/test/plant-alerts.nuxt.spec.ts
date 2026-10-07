import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail } from './helpers/fixtures'
import PlantDetailPage from '../app/pages/plants/[id]/index.vue'
import type { PlantDetail } from '../src/features/plants/types/plant.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/** Escenarios de «La ficha del ejemplar muestra sus alertas» (`plant-dashboard`). */

const openAlert = (id: string, severity: string, reason: string, extra: Record<string, unknown> = {}) => ({
  id, severity, status: 'nueva', category: 'temperatura', source: 'medicion', reason,
  lastDetectedAt: '2026-10-06T08:00:00Z', occurrences: 1, ...extra,
})

function serve(plant: Record<string, unknown>, timeline: unknown[] = []) {
  const envelope = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 10 })
  api.get.mockImplementation((path: string) => {
    if (String(path).endsWith('/timeline')) return Promise.resolve(envelope(timeline))
    if (path === '/tasks' || /care-records|status-changes|movements/.test(path)) return Promise.resolve(envelope([]))
    return Promise.resolve(plant)
  })
}

const withAlerts = (openAlerts: unknown[]) => ({ ...plantDetail(), openAlerts }) as unknown as PlantDetail

const mountPage = async () => {
  const wrapper = await mountSuspended(PlantDetailPage)
  await settle()
  return wrapper
}

describe('alertas en la ficha del ejemplar', () => {
  beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()))

  it('el aviso es la alerta abierta más grave, con su motivo y su acción, y sin marca de ejemplo', async () => {
    serve(withAlerts([
      openAlert('1', 'critica', 'Temperatura 4 °C por debajo del mínimo', { recommendedAction: 'Pasar la planta a interior' }),
    ]) as never)
    const wrapper = await mountPage()

    const notice = wrapper.find('[data-test="plant-alerts"]')
    expect(notice.text()).toContain('Temperatura 4 °C por debajo del mínimo')
    expect(notice.text()).toContain('Pasar la planta a interior')
    expect(notice.text()).not.toContain('ejemplo')
    expect(notice.find('[data-mock="true"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('T-23')
  })

  it('con varias alertas destaca la más grave, cuenta las demás y enlaza a la bandeja del ejemplar', async () => {
    serve(withAlerts([
      openAlert('1', 'critica', 'Muy grave'),
      openAlert('2', 'media', 'Media'),
      openAlert('3', 'baja', 'Baja'),
    ]) as never)
    const wrapper = await mountPage()

    const notice = wrapper.find('[data-test="plant-alerts"]')
    expect(notice.text()).toContain('Muy grave')
    expect(notice.text()).toContain('2 alertas más')
    expect(notice.find('a').attributes('href')).toBe('/alerts?plant=882687672222443468')
  })

  it('sin alertas abiertas lo dice en lugar de omitir el bloque', async () => {
    serve(withAlerts([]) as never)
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="plant-alerts-none"]').text()).toContain('ninguna alerta')
  })

  it('las alertas entran en la cronología con su transición y el filtro «Alertas» las deja solas', async () => {
    serve(withAlerts([]) as never, [
      { id: '9', type: 'alerta', occurredAt: '2026-10-06T08:00:00Z', alert: { alertId: '1', category: 'temperatura', severity: 'critica', reason: 'Temperatura baja', to: 'nueva' } },
      { id: '10', type: 'alerta', occurredAt: '2026-10-07T08:00:00Z', alert: { alertId: '1', category: 'temperatura', severity: 'critica', reason: 'Temperatura baja', from: 'nueva', to: 'resuelta', comment: 'Cambiada de sitio' } },
    ])
    const wrapper = await mountPage()

    const titles = wrapper.findAll('[data-role="event"] h3').map((node) => node.text())
    expect(titles).toEqual(['Alerta resuelta · Temperatura', 'Alerta abierta · Temperatura'])
    expect(wrapper.find('[data-test="alert-entry-10"]').text()).toContain('Cambiada de sitio')
    expect(wrapper.find('[data-test="entry-10"]').find('[data-test="edit-entry"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="filter-alerta"]').exists()).toBe(true)
  })

  it('anotar una alerta desde la ficha la envía con el ejemplar y actualiza el aviso sin recargar', async () => {
    serve(withAlerts([]) as never)
    const created = openAlert('7', 'media', 'Cochinilla en la base', { source: 'manual', category: 'otra' })
    api.post.mockImplementation((path: string) => {
      if (path === '/alerts') {
        serve(withAlerts([created]) as never)
        return Promise.resolve({ ...created, plant: { id: '882687672222443468' } })
      }
      return Promise.resolve({})
    })
    const wrapper = await mountPage()

    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-alert"]').trigger('click')
    await wrapper.find('[data-test="alert-reason"]').setValue('Cochinilla en la base')
    await wrapper.find('[data-test="alert-create-form"]').trigger('submit')
    await settle(); await settle()

    expect(api.post).toHaveBeenCalledWith('/alerts', expect.objectContaining({
      plantId: '882687672222443468', reason: 'Cochinilla en la base', severity: 'media', category: 'otra',
    }))
    expect(wrapper.find('[data-test="plant-alerts"]').text()).toContain('Cochinilla en la base')
    expect(wrapper.find('[data-test="alert-create-form"]').exists()).toBe(false)
  })

  it('un error al anotar se explica y no pierde lo escrito', async () => {
    serve(withAlerts([]) as never)
    api.post.mockRejectedValue(new (await import('@shared/services/httpClient')).ApiError(400, 'El motivo es obligatorio'))
    const wrapper = await mountPage()

    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-alert"]').trigger('click')
    await wrapper.find('[data-test="alert-reason"]').setValue('Texto escrito')
    await wrapper.find('[data-test="alert-create-form"]').trigger('submit')
    await settle(); await settle()

    expect(wrapper.find('[data-test="alert-create-error"]').text()).toContain('obligatorio')
    expect((wrapper.find('[data-test="alert-reason"]').element as HTMLTextAreaElement).value).toBe('Texto escrito')
  })
})
