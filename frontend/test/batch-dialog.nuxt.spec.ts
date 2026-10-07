import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import BatchDialog from '../src/features/batches/components/BatchDialog.vue'
import { batchesApiService } from '../src/features/batches/services/batches.api.service'
import { locationsApiService } from '../src/features/locations/services/locations.api.service'
import { soilMixesApiService } from '../src/features/soil-mixes/services/soilMixes.api.service'
import { useToast } from '../src/shared/composables/useToast'
import { domainError, fail, ok } from '../src/shared/types/api.types'
import type { BatchPlant, BatchScope } from '../src/features/batches/types/batch.types'

/**
 * Requirement «Diálogo de lote con el alcance declarado»: el número lo da el servidor, se pueden
 * excluir excepciones de una lista, los campos son los del alta individual y un error no pierde lo
 * escrito.
 */
enableAutoUnmount(afterEach)
afterEach(() => {
  vi.restoreAllMocks()
  useToast().clear()
})

const plants = (n: number): BatchPlant[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i + 1), code: `CAT-GRUSS-${String(i + 1).padStart(2, '0')}`, nickname: `Planta ${i + 1}`, detail: 'Echinocactus grusonii · Invernadero 1' }))

const batch = { id: '9', action: 'lectura', scopeKind: 'plantas', plantCount: 31, occurredAt: '2026-10-07T10:00:00Z' }

async function open(props: { action: 'reading' | 'intervention' | 'comment', scope: BatchScope | null, plants?: BatchPlant[], chooseAction?: boolean }) {
  const wrapper = await mountSuspended(BatchDialog, { props: { open: true, ...props } })
  for (let i = 0; i < 4; i++) await settle()
  return wrapper
}

const dialog = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.find('[data-test="batch-dialog"]')

describe('diálogo de lote', () => {
  it('dice el alcance con el número que devuelve el servidor', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(31))
    const wrapper = await open({ action: 'reading', scope: { kind: 'location', locationId: '300001' } })

    expect(preview).toHaveBeenCalledWith({ kind: 'location', locationId: '300001' }, [])
    expect(dialog(wrapper).find('[data-test="batch-count"]').text()).toContain('Se registrará en 31 plantas')
  })

  it('el título dice la acción', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(2))

    expect((await open({ action: 'reading', scope: { kind: 'location', locationId: '1' } })).text()).toContain('Registrar lectura')
    expect((await open({ action: 'intervention', scope: { kind: 'location', locationId: '1' } })).text()).toContain('Registrar intervención')
    expect((await open({ action: 'comment', scope: { kind: 'location', locationId: '1' } })).text()).toContain('Añadir comentario')
  })

  it('con una lista de plantas las muestra y deja excluir; el número se actualiza', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValueOnce(ok(3)).mockResolvedValueOnce(ok(2))
    const list = plants(3)
    const wrapper = await open({ action: 'reading', scope: { kind: 'plants', plantIds: ['1', '2', '3'] }, plants: list })

    expect(dialog(wrapper).findAll('[data-test="exclude-plant"]')).toHaveLength(3)
    await dialog(wrapper).findAll('[data-test="exclude-plant"]')[1]!.setValue(true)
    await settle()

    expect(preview).toHaveBeenLastCalledWith({ kind: 'plants', plantIds: ['1', '2', '3'] }, ['2'])
    expect(dialog(wrapper).find('[data-test="batch-count"]').text()).toContain('Se registrará en 2 plantas')
  })

  it('una lista grande se pagina y las exclusiones se conservan al cambiar de página', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(45))
    const list = plants(45)
    const wrapper = await open({ action: 'reading', scope: { kind: 'plants', plantIds: list.map((p) => p.id) }, plants: list })

    expect(dialog(wrapper).findAll('[data-test="exclude-plant"]')).toHaveLength(20)
    await dialog(wrapper).findAll('[data-test="exclude-plant"]')[0]!.setValue(true)
    await dialog(wrapper).find('[data-test="next-page"]').trigger('click')
    await settle()
    expect(dialog(wrapper).findAll('[data-test="exclude-plant"]')).toHaveLength(20)
    await dialog(wrapper).find('[data-test="previous-page"]').trigger('click')
    await settle()

    expect((dialog(wrapper).findAll('[data-test="exclude-plant"]')[0]!.element as HTMLInputElement).checked).toBe(true)
  })

  it('con el alcance de una consulta no hay lista y lo explica', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(486))
    const wrapper = await open({ action: 'reading', scope: { kind: 'query', query: 'status=cuarentena' } })

    expect(dialog(wrapper).find('[data-test="batch-count"]').text()).toContain('Se registrará en 486 plantas')
    expect(dialog(wrapper).find('[data-test="exclude-plant"]').exists()).toBe(false)
    expect(dialog(wrapper).find('[data-test="batch-query-note"]').text()).toContain('selecciona una a una')
  })

  it('una lectura de agua envía la lectura con el alcance y avisa del número real', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(31))
    const apply = vi.spyOn(batchesApiService, 'apply').mockResolvedValue(ok(batch))
    const wrapper = await open({ action: 'reading', scope: { kind: 'location', locationId: '300001' } })

    await dialog(wrapper).find('[data-test="waterAmountMl"]').setValue('200')
    await dialog(wrapper).find('[data-test="batch-form"]').trigger('submit')
    await settle()

    expect(apply).toHaveBeenCalledWith({
      scope: { kind: 'location', locationId: '300001' },
      excludedPlantIds: [],
      action: { kind: 'reading', reading: { waterAmountMl: 200 } },
    })
    expect(wrapper.emitted('done')![0]![0]).toEqual(batch)
    expect(useToast().toasts.value.map((toast) => toast.message)).toEqual(['Lectura registrada en 31 plantas'])
  })

  it('una lectura sin ningún valor se señala y no se envía', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(31))
    const apply = vi.spyOn(batchesApiService, 'apply').mockResolvedValue(ok(batch))
    const wrapper = await open({ action: 'reading', scope: { kind: 'location', locationId: '300001' } })

    await dialog(wrapper).find('[data-test="batch-form"]').trigger('submit')
    await settle()

    expect(dialog(wrapper).find('[data-test="batch-error"]').text()).toContain('al menos un valor')
    expect(apply).not.toHaveBeenCalled()
  })

  it('una intervención pide los campos de su tipo y no los de otros', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(12))
    vi.spyOn(soilMixesApiService, 'list').mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 500 }) as never)
    const apply = vi.spyOn(batchesApiService, 'apply').mockResolvedValue(ok({ ...batch, action: 'intervencion', plantCount: 12 }))
    const wrapper = await open({ action: 'intervention', scope: { kind: 'location', locationId: '300001' } })

    expect(dialog(wrapper).find('[data-test="intervention-pot-size"]').exists()).toBe(true)
    expect(dialog(wrapper).find('[data-test="intervention-product"]').exists()).toBe(false)

    await dialog(wrapper).find('[data-test="intervention-pot-size"]').setValue('12 cm')
    await dialog(wrapper).find('[data-test="batch-form"]').trigger('submit')
    await settle()

    expect(apply.mock.calls[0]![0].action).toEqual({
      kind: 'intervention',
      intervention: { type: 'trasplante', potSize: '12 cm', product: undefined, soilMixId: undefined, notes: undefined },
    })
  })

  it('un comentario en blanco se señala y uno escrito se envía recortado', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(31))
    const apply = vi.spyOn(batchesApiService, 'apply').mockResolvedValue(ok({ ...batch, action: 'comentario' }))
    const wrapper = await open({ action: 'comment', scope: { kind: 'location', locationId: '300001' } })

    await dialog(wrapper).find('[data-test="batch-form"]').trigger('submit')
    expect(dialog(wrapper).find('[data-test="comment-text-error"]').exists()).toBe(true)
    expect(apply).not.toHaveBeenCalled()

    await dialog(wrapper).find('[data-test="comment-text"]').setValue('  movidas por la ola de frío  ')
    await dialog(wrapper).find('[data-test="batch-form"]').trigger('submit')
    await settle()

    expect(apply.mock.calls[0]![0].action).toEqual({ kind: 'comment', comment: { text: 'movidas por la ola de frío' } })
  })

  it('un alcance vacío deshabilita confirmar y dice por qué', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(0))
    const wrapper = await open({ action: 'reading', scope: { kind: 'plants', plantIds: ['1'] }, plants: plants(1) })

    expect(dialog(wrapper).find('[data-test="batch-confirm"]').attributes('disabled')).toBeDefined()
    expect(dialog(wrapper).find('[data-test="batch-empty"]').text()).toContain('no afectaría a ninguna planta')
  })

  it('un alcance demasiado grande enseña el mensaje del servidor y no se puede confirmar', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(
      fail(domainError('VALIDATION', '3000 plantas superan el máximo de 2000: acota el alcance')),
    )
    const wrapper = await open({ action: 'reading', scope: { kind: 'query', query: '' } })

    expect(dialog(wrapper).find('[data-test="batch-error"]').text()).toContain('3000 plantas superan el máximo de 2000')
    expect(dialog(wrapper).find('[data-test="batch-confirm"]').attributes('disabled')).toBeDefined()
  })

  it('un error al guardar se explica y conserva lo escrito y las exclusiones', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValueOnce(ok(3)).mockResolvedValueOnce(ok(2))
    vi.spyOn(batchesApiService, 'apply').mockResolvedValue(fail(domainError('VALIDATION', 'Temperatura fuera de rango')))
    const list = plants(3)
    const wrapper = await open({ action: 'reading', scope: { kind: 'plants', plantIds: ['1', '2', '3'] }, plants: list })

    await dialog(wrapper).findAll('[data-test="exclude-plant"]')[0]!.setValue(true)
    await settle()
    await dialog(wrapper).find('[data-test="temperature"]').setValue('999')
    await dialog(wrapper).find('[data-test="batch-form"]').trigger('submit')
    await settle()

    expect(dialog(wrapper).find('[data-test="batch-error"]').text()).toBe('Temperatura fuera de rango')
    expect((dialog(wrapper).find('[data-test="temperature"]').element as HTMLInputElement).value).toBe('999')
    expect((dialog(wrapper).findAll('[data-test="exclude-plant"]')[0]!.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.emitted('done')).toBeUndefined()
  })

  it('sin alcance primero pide la localización y entonces dice cuántas plantas afecta', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(486))
    vi.spyOn(locationsApiService, 'list').mockResolvedValue(ok({
      content: [
        { id: '300001', name: 'Invernadero 1', path: 'Invernadero 1', plantCountTotal: 486 },
        { id: '300002', name: 'Bandeja A3', path: 'Invernadero 1 / Bandeja A3', plantCountTotal: 24 },
      ],
      totalElements: 2, totalPages: 1, pageNumber: 0, pageSize: 500,
    }) as never)
    const wrapper = await open({ action: 'reading', scope: null })

    expect(preview).not.toHaveBeenCalled()
    expect(dialog(wrapper).find('[data-test="batch-count"]').exists()).toBe(false)
    expect(dialog(wrapper).find('[data-test="batch-confirm"]').attributes('disabled')).toBeDefined()

    await dialog(wrapper).find('[data-test="batch-location"]').setValue('300001')
    await settle()

    expect(preview).toHaveBeenCalledWith({ kind: 'location', locationId: '300001', includeDescendants: true }, [])
    expect(dialog(wrapper).find('[data-test="batch-count"]').text()).toContain('Se registrará en 486 plantas')
  })

  it('con el alcance de una localización se puede decidir si cuentan las sublocalizaciones', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValueOnce(ok(486)).mockResolvedValueOnce(ok(24))
    const wrapper = await open({ action: 'reading', scope: { kind: 'location', locationId: '300001', includeDescendants: true } })

    await dialog(wrapper).find('[data-test="batch-descendants"]').setValue(false)
    await settle()

    expect(preview).toHaveBeenLastCalledWith({ kind: 'location', locationId: '300001', includeDescendants: false }, [])
    expect(dialog(wrapper).find('[data-test="batch-count"]').text()).toContain('Se registrará en 24 plantas')
  })

  it('sin elegir acción no ofrece el selector; eligiéndola, sí, y cambia los campos y el título', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(31))
    vi.spyOn(soilMixesApiService, 'list').mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 500 }) as never)

    const fixed = await open({ action: 'reading', scope: { kind: 'location', locationId: '1' } })
    expect(dialog(fixed).find('[data-test="batch-action-choice"]').exists()).toBe(false)

    const wrapper = await open({ action: 'reading', scope: { kind: 'location', locationId: '1' }, chooseAction: true })
    expect(dialog(wrapper).find('[data-test="waterAmountMl"]').exists()).toBe(true)

    await dialog(wrapper).find('[data-test="batch-action-choice"] input[value="comment"]').setValue(true)
    await settle()
    expect(dialog(wrapper).find('[data-test="comment-text"]').exists()).toBe(true)
    expect(dialog(wrapper).find('[data-test="waterAmountMl"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Añadir comentario')
  })

  it('al cambiar de acción se envía la nueva y no lo escrito para la anterior', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(31))
    const apply = vi.spyOn(batchesApiService, 'apply').mockResolvedValue(ok({ ...batch, action: 'comentario' }))
    const wrapper = await open({ action: 'reading', scope: { kind: 'location', locationId: '1' }, chooseAction: true })
    await dialog(wrapper).find('[data-test="waterAmountMl"]').setValue('200')

    await dialog(wrapper).find('[data-test="batch-action-choice"] input[value="comment"]').setValue(true)
    await settle()
    await dialog(wrapper).find('[data-test="comment-text"]').setValue('regadas')
    await dialog(wrapper).find('[data-test="batch-form"]').trigger('submit')
    await settle()

    expect(apply.mock.calls[0]![0].action).toEqual({ kind: 'comment', comment: { text: 'regadas' } })
  })

  it('cancelar emite close', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(3))
    const wrapper = await open({ action: 'reading', scope: { kind: 'location', locationId: '1' } })

    await dialog(wrapper).find('[data-test="batch-cancel"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
