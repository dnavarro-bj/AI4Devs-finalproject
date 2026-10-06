import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import TransferPage from '../app/pages/import-export/index.vue'
import { useTransfer } from '@features/transfer/composables/useTransfer'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de la requirement «Importar y exportar», que especifica la composición de la pantalla
 * `transfer` del prototipo: asistente de importación, exportación y actividad reciente. Es una
 * **simulación declarada**: no sube, no descarga y no toca el inventario.
 */
describe('importar y exportar', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  async function open() {
    const wrapper = await mountSuspended(TransferPage)
    await settle()
    return wrapper
  }

  async function toReview() {
    const wrapper = await open()
    await wrapper.find('[data-test="use-sample"]').trigger('click')
    await settle()
    return wrapper
  }

  it('compone la pantalla: frescura de la copia, importar, exportar y actividad reciente', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="backup-freshness"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="import-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="export-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recent-activity"]').exists()).toBe(true)
  })

  it('la importación empieza por el paso del archivo, con el progreso visible', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="import-stepper"]').text()).toContain('Archivo')
    expect(wrapper.find('[data-test="import-stepper"] [aria-current="step"]').text()).toContain('Archivo')
    expect(wrapper.find('[data-test="validation-summary"]').exists()).toBe(false)
  })

  it('la validación dice cuántas filas están listas, con avisos y con errores', async () => {
    const wrapper = await toReview()

    const summary = wrapper.find('[data-test="validation-summary"]').text()
    expect(summary).toContain('231')
    expect(summary).toContain('12')
    expect(summary).toContain('5')
  })

  it('la tabla de revisión da el resultado de cada fila con su motivo', async () => {
    const wrapper = await toReview()

    const table = wrapper.find('[data-test="import-preview"]').text()
    expect(table).toContain('Código duplicado')
    expect(table).toContain('Ubicación no encontrada')
  })

  it('con errores la importación está bloqueada y dice por qué, sin descartar nada', async () => {
    const wrapper = await toReview()

    expect(wrapper.find('[data-test="apply-import"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="import-blocker"]').text()).toContain('5')
    expect(wrapper.find('[data-test="download-errors"]').exists()).toBe(true)
  })

  it('corregidos los errores se puede aplicar, y se llega al paso final', async () => {
    const wrapper = await toReview()

    await wrapper.find('[data-test="fix-import"]').trigger('click')
    expect(wrapper.find('[data-test="apply-import"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('[data-test="apply-import"]').trigger('click')
    expect(wrapper.find('[data-test="import-complete"]').text()).toContain('Importación completada')
  })

  it('cambiar de archivo vuelve al primer paso sin conservar la validación', async () => {
    const wrapper = await toReview()

    await wrapper.find('[data-test="reset-import"]').trigger('click')

    expect(wrapper.find('[data-test="validation-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="use-sample"]').exists()).toBe(true)
  })

  it('declara que es una simulación y no toca el API', async () => {
    const wrapper = await toReview()
    await wrapper.find('[data-test="fix-import"]').trigger('click')
    await wrapper.find('[data-test="apply-import"]').trigger('click')
    await wrapper.find('[data-test="generate-export"]').trigger('click')

    expect(wrapper.find('[data-test="simulation-notice"]').text().toLowerCase()).toContain('simulación')
    expect(api.get).not.toHaveBeenCalled()
    expect(api.post).not.toHaveBeenCalled()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('generar una exportación enseña el archivo simulado, y lo que espera a otros tickets va marcado', async () => {
    const wrapper = await open()

    const options = wrapper.find('[data-test="export-panel"]').text()
    expect(options).toContain('T-21')
    expect(options).toContain('T-15')

    await wrapper.find('[data-test="generate-export"]').trigger('click')
    expect(wrapper.find('[data-test="export-result"]').text()).toContain('.csv')
  })

  it('marca como sin ticket lo que ningún ticket del backlog recoge', async () => {
    const wrapper = await open()

    const notices = wrapper.findAll('[data-test="mock-notice"]').map((node) => node.text()).join(' ')
    expect(notices.toLowerCase()).toContain('sin ticket')
  })
})

/** La regla vive en la transición, no en que un botón esté deshabilitado: un botón se salta. */
describe('máquina de estados de la importación', () => {
  it('aplicar con errores pendientes no avanza, aunque se invoque', async () => {
    const transfer = useTransfer()
    await transfer.useSample()

    expect(transfer.errorCount.value).toBeGreaterThan(0)
    expect(transfer.apply()).toBe(false)
    expect(transfer.step.value).toBe('review')
  })

  it('sin errores, aplicar avanza al paso final', async () => {
    const transfer = useTransfer()
    await transfer.useSample()
    transfer.fixErrors()

    expect(transfer.apply()).toBe(true)
    expect(transfer.step.value).toBe('complete')
  })

  it('no se puede aplicar sin haber elegido archivo', () => {
    const transfer = useTransfer()

    expect(transfer.apply()).toBe(false)
    expect(transfer.step.value).toBe('file')
  })
})
