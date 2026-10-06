import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import AlertsIndex from '../app/pages/alerts/index.vue'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import { useToast } from '@shared/composables/useToast'
import { ok } from '@shared/types/api.types'

/**
 * Escenarios de la requirement «Bandeja de alertas», que especifica la composición de la pantalla
 * `alerts` del prototipo: una tarjeta por alerta con su severidad y su ciclo de vida, no una tabla.
 */
describe('bandeja de alertas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useToast().clear()
  })

  async function open() {
    const wrapper = await mountSuspended(AlertsIndex)
    await settle()
    return wrapper
  }

  it('muestra una tarjeta por alerta abierta y el recuento de la cabecera coincide', async () => {
    const wrapper = await open()

    const cards = wrapper.findAll('[data-test="alert-card"]')
    expect(cards.length).toBeGreaterThan(0)
    expect(wrapper.find('[data-test="page-context"]').text()).toContain(`${cards.length} abiertas`)
  })

  it('por defecto solo muestra las abiertas: las resueltas y descartadas no aparecen', async () => {
    const wrapper = await open()

    const states = wrapper.findAll('[data-test="alert-card"]').map((card) => card.attributes('data-state'))
    expect(states.every((state) => state === 'new' || state === 'reviewed')).toBe(true)
  })

  it('la severidad se lee en texto y la crítica tiene además una marca propia', async () => {
    const wrapper = await open()

    const critical = wrapper.find('[data-test="alert-card"][data-severity="critical"]')
    const medium = wrapper.find('[data-test="alert-card"][data-severity="medium"]')
    expect(critical.text()).toContain('Crítica')
    expect(medium.text()).toContain('Media')
    expect(critical.find('[data-test="alert-mark"]').text()).not.toBe(medium.find('[data-test="alert-mark"]').text())
  })

  it('el estado del ciclo de vida también se lee en texto', async () => {
    const wrapper = await open()

    const labels = wrapper.findAll('[data-test="alert-state"]').map((node) => node.text())
    expect(labels).toContain('Nueva')
    expect(labels).toContain('Revisada')
  })

  it('filtrar por un estado solo muestra las alertas en ese estado', async () => {
    const wrapper = await open()

    await wrapper.find('select[data-test="filter-state"]').setValue('resolved')

    const states = wrapper.findAll('[data-test="alert-card"]').map((card) => card.attributes('data-state'))
    expect(states.length).toBeGreaterThan(0)
    expect(states.every((state) => state === 'resolved')).toBe(true)
  })

  it('un filtro sin resultados lo explica', async () => {
    vi.spyOn(alertsApiService, 'list').mockResolvedValue(ok([]))
    const wrapper = await open()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
  })

  it('revisar, descartar o crear tarea dicen qué ticket lo habilita y no cambian el estado', async () => {
    const wrapper = await open()
    const before = wrapper.findAll('[data-test="alert-state"]').map((node) => node.text())

    for (const action of ['review-alert', 'dismiss-alert', 'create-task']) {
      await wrapper.find(`[data-test="${action}"]`).trigger('click')
      expect(useToast().toasts.value.at(-1)!.message).toContain('T-23')
    }

    expect(wrapper.findAll('[data-test="alert-state"]').map((node) => node.text())).toEqual(before)
  })

  it('la planta afectada lleva a su ficha', async () => {
    const wrapper = await open()

    const link = wrapper.find('[data-test="alert-card"] a[href^="/plants/"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('CAT-')
  })

  it('declara que las alertas son datos de ejemplo y que el filtro de origen espera a T-23', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="mock-notice"]').text()).toContain('T-23')
    const origin = wrapper.find('select[data-test="filter-origin"]')
    expect(origin.attributes('disabled')).toBeDefined()
  })
})
