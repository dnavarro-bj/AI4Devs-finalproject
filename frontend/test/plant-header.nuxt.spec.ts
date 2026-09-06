import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PlantHeader from '../src/features/plants/components/PlantHeader.vue'
import { plantDetail } from './helpers/fixtures'

/**
 * Escenarios "Ficha de una planta existente" y "Lo que todavía no existe se reconoce como ejemplo"
 * de la requirement "Ficha de una planta" (`plant-dashboard`).
 */
const header = (props: Record<string, unknown> = {}) =>
  mountSuspended(PlantHeader, { props: { plant: plantDetail(), ...props } })

describe('PlantHeader', () => {
  it('presenta la identidad real del ejemplar', async () => {
    const wrapper = await header()

    expect(wrapper.find('h1').text()).toBe('Bola verde')
    expect(wrapper.text()).toContain('Echinocactus grusonii')
    expect(wrapper.text()).toContain('Invernadero 1')
  })

  it('ofrece las tres acciones del wireframe', async () => {
    const wrapper = await header()

    expect(wrapper.find('[data-test="register-reading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="create-task"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="edit-plant"]').exists()).toBe(true)
  })

  it('registrar lectura comunica la intención: quien abre el diálogo es la ficha', async () => {
    const wrapper = await header()

    await wrapper.find('[data-test="register-reading"]').trigger('click')

    expect(wrapper.emitted('register-reading')).toHaveLength(1)
  })

  it('marca como ejemplo lo que el API todavía no sirve', async () => {
    const wrapper = await header()

    // Código, estado, contexto y fotografía son maqueta: la pantalla lo dice, no solo el código.
    const marks = wrapper.findAll('[data-mock="true"]')
    expect(marks.length).toBeGreaterThanOrEqual(3)
    expect(wrapper.text().toLowerCase()).toContain('ejemplo')
  })

  it('el código de inventario no se trunca', async () => {
    const wrapper = await header()

    expect(wrapper.find('[data-test="plant-code"]').text()).toBe('CAT-GRUSS-01')
  })

  it('una planta sin tags no rompe la cabecera', async () => {
    const wrapper = await header({ plant: { ...plantDetail(), tags: [] } })

    expect(wrapper.find('h1').exists()).toBe(true)
  })
})
