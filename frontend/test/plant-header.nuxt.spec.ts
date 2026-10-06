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

    // Contexto y fotografía son maqueta: la pantalla lo dice. El código y el estado, no: son reales.
    const marks = wrapper.findAll('[data-mock="true"]')
    expect(marks.length).toBeGreaterThanOrEqual(3)
    expect(wrapper.text().toLowerCase()).toContain('ejemplo')
  })

  it('el código de inventario no se trunca', async () => {
    const wrapper = await header()

    expect(wrapper.find('[data-test="plant-code"]').text()).toBe('CAT-GRUSS-01')
  })

  /** Escenario «Código real en la ficha y en la edición». */
  it('el código es el del API, no una constante, y no se marca como ejemplo', async () => {
    const wrapper = await header({ plant: { ...plantDetail(), code: 'CAT-MAMMI-12' } })

    const code = wrapper.find('[data-test="plant-code"]')
    expect(code.text()).toBe('CAT-MAMMI-12')
    expect(code.attributes('data-mock')).toBeUndefined()
  })

  it('una planta sin tags no rompe la cabecera', async () => {
    const wrapper = await header({ plant: { ...plantDetail(), tags: [] } })

    expect(wrapper.find('h1').exists()).toBe(true)
  })

  // --- Estado y germinación reales (`ficha-del-ejemplar`) ---

  it('muestra el estado real del ejemplar, sin marca de ejemplo', async () => {
    const wrapper = await header({ plant: { ...plantDetail(), status: 'cuarentena' } })

    const status = wrapper.find('[data-test="plant-status"]')
    expect(status.text()).toContain('En cuarentena')
    expect(status.attributes('data-mock')).toBeUndefined()
  })

  it('la germinación con mes dice el mes con dos cifras', async () => {
    const wrapper = await header({ plant: { ...plantDetail(), germinationYear: 2021, germinationMonth: 4 } })

    expect(wrapper.find('[data-test="germination"]').text()).toBe('Germinada 04/2021')
    expect(wrapper.find('[data-test="germination"]').attributes('data-mock')).toBeUndefined()
  })

  it('con solo el año dice el año y una edad aproximada, sin inventar un mes', async () => {
    const wrapper = await header({ plant: { ...plantDetail(), germinationYear: 2021 } })

    const text = wrapper.find('[data-test="germination"]').text()
    expect(text).toContain('Germinada en 2021')
    expect(text).toContain('~')
    expect(text).not.toContain('/')
  })

  it('sin germinación no muestra ninguna inventada', async () => {
    const wrapper = await header()

    expect(wrapper.find('[data-test="germination"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Germinada 04/2021')
  })

  it('un ejemplar archivado se distingue por texto y forma, no solo por el color', async () => {
    const wrapper = await header({ plant: { ...plantDetail(), status: 'vendida' } })

    expect(wrapper.find('[data-test="plant-status"]').text()).toContain('Vendida')
    expect(wrapper.find('[data-test="archived-mark"]').text()).toContain('Archivada')
  })

  it('un ejemplar en curso no lleva la marca de archivado', async () => {
    const wrapper = await header()

    expect(wrapper.find('[data-test="archived-mark"]').exists()).toBe(false)
  })

  it('ofrece cambiar el estado y comunica la intención', async () => {
    const wrapper = await header()

    await wrapper.find('[data-test="change-status"]').trigger('click')

    expect(wrapper.emitted('change-status')).toHaveLength(1)
  })
})
