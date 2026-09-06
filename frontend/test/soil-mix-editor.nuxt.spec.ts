import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SoilMixForm from '@features/soil-mixes/components/SoilMixForm.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de la requirement «Alta y corrección de una mezcla».
 *
 * Se prueba el formulario compartido, que es donde vive la validación: las dos rutas que lo montan
 * solo aportan de dónde salen los valores iniciales y a dónde se va al guardar.
 */
describe('editor de una mezcla de sustrato', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const fill = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>, values: Record<string, string>) => {
    for (const [test, value] of Object.entries(values)) {
      // `data-test` cae en el **control**: `UiField` no hereda los atributos en su envoltorio.
      await wrapper.find(`[data-test="${test}"]`).setValue(value)
    }
  }

  it('envía la receta completa cuando la composición cuadra', async () => {
    const wrapper = await mountSuspended(SoilMixForm)

    await fill(wrapper, {
      name: 'Sustrato mineral',
      organic: '20',
      mineral: '80',
      'ph-min': '5.5',
      'ph-max': '6.5',
      description: 'akadama, pómez',
    })
    await wrapper.find('[data-test="soil-mix-form"]').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      name: 'Sustrato mineral',
      organicPercentage: 20,
      mineralPercentage: 80,
      phMin: 5.5,
      phMax: 6.5,
      description: 'akadama, pómez',
    })
  })

  /** La comprobación es de rango, así que se hace en el borde y evita un viaje de ida y vuelta. */
  it('una composición que no suma 100 se señala, diciendo cuánto falta, y no se envía', async () => {
    const wrapper = await mountSuspended(SoilMixForm)

    await fill(wrapper, { name: 'Mezcla imposible', organic: '30', mineral: '40' })
    await wrapper.find('[data-test="soil-mix-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="mismatch"]').text()).toContain('30')
  })

  it('un rango de pH invertido se señala y no se envía', async () => {
    const wrapper = await mountSuspended(SoilMixForm)

    await fill(wrapper, {
      name: 'Mezcla invertida',
      organic: '20',
      mineral: '80',
      'ph-min': '7',
      'ph-max': '6',
    })
    await wrapper.find('[data-test="soil-mix-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="ph-error"]').text()).toContain('no puede superar')
  })

  it('un nombre en blanco se señala junto a su campo', async () => {
    const wrapper = await mountSuspended(SoilMixForm)

    await fill(wrapper, { name: '   ', organic: '20', mineral: '80' })
    await wrapper.find('[data-test="soil-mix-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="name-error"]').exists()).toBe(true)
  })

  it('la corrección llega prellenada con lo que la mezcla tenía', async () => {
    const wrapper = await mountSuspended(SoilMixForm, {
      props: {
        initial: {
          name: 'Sustrato equilibrado',
          organicPercentage: 40,
          mineralPercentage: 60,
          phMin: 6,
          phMax: 7,
          description: 'turba, arena gruesa',
        },
      },
    })

    expect((wrapper.find('[data-test="name"]').element as HTMLInputElement).value)
      .toBe('Sustrato equilibrado')
    expect((wrapper.find('[data-test="organic"]').element as HTMLInputElement).value).toBe('40')
  })

  /** Vaciar la descripción es un cambio legítimo: no puede colarse como texto vacío. */
  it('una receta vacía viaja como ausente, no como cadena vacía', async () => {
    const wrapper = await mountSuspended(SoilMixForm)

    await fill(wrapper, { name: 'Sin receta', organic: '20', mineral: '80', description: '  ' })
    await wrapper.find('[data-test="soil-mix-form"]').trigger('submit')

    expect((wrapper.emitted('submit')?.[0]?.[0] as { description: string | null }).description).toBeNull()
  })

  it('la composición se ve además de leerse, y avisa mientras se rellena', async () => {
    const wrapper = await mountSuspended(SoilMixForm)

    await fill(wrapper, { organic: '25', mineral: '25' })

    // Sin haber enviado nada: el aviso aparece mientras se escribe.
    expect(wrapper.find('[data-test="mismatch"]').exists()).toBe(true)
  })

  it('el error del API se muestra tal cual, sin traducirlo a un mensaje propio', async () => {
    const wrapper = await mountSuspended(SoilMixForm, {
      props: { submitError: 'Los porcentajes de la mezcla deben sumar 100, y suman 70' },
    })

    expect(wrapper.find('[data-test="submit-error"]').text()).toContain('suman 70')
  })
})
