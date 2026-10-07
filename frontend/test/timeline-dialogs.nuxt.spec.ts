import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TimelineCommentDialog from '../src/features/timeline/components/TimelineCommentDialog.vue'
import TimelineInterventionDialog from '../src/features/timeline/components/TimelineInterventionDialog.vue'
import TimelineBloomDialog from '../src/features/timeline/components/TimelineBloomDialog.vue'
import TimelineRemoveDialog from '../src/features/timeline/components/TimelineRemoveDialog.vue'
import type { TimelineEntry } from '../src/features/timeline/types/timeline.types'

/** Escenarios de «Comentarios, intervenciones y floraciones desde la ficha» (`plant-dashboard`). */

const MIXES = [{ id: '70', name: 'Mezcla mineral' }]

describe('diálogo de comentario', () => {
  it('un comentario vacío se señala junto al campo y no envía nada', async () => {
    const wrapper = await mountSuspended(TimelineCommentDialog, { props: { open: true } })

    await wrapper.find('[data-test="comment-form"]').trigger('submit')

    expect(wrapper.find('[data-test="comment-text-error"]').exists()).toBe(true)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('envía el texto recortado', async () => {
    const wrapper = await mountSuspended(TimelineCommentDialog, { props: { open: true } })

    await wrapper.find('[data-test="comment-text"]').setValue('  Marca en el lado oeste  ')
    await wrapper.find('[data-test="comment-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual([{ text: 'Marca en el lado oeste', occurredAt: undefined }])
  })

  it('corregir precarga el texto y solo envía el texto', async () => {
    const entry: TimelineEntry = { id: '5', type: 'comentario', occurredAt: '2026-09-01T10:00:00Z', comment: { text: 'Antes' } }
    const wrapper = await mountSuspended(TimelineCommentDialog, { props: { open: true, entry } })

    expect((wrapper.find('[data-test="comment-text"]').element as HTMLTextAreaElement).value).toBe('Antes')
    expect(wrapper.find('[data-test="comment-date"]').exists()).toBe(false)

    await wrapper.find('[data-test="comment-text"]').setValue('Después')
    await wrapper.find('[data-test="comment-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual([{ text: 'Después' }])
  })

  it('un error del API se explica sin perder lo escrito', async () => {
    const wrapper = await mountSuspended(TimelineCommentDialog, { props: { open: true } })
    await wrapper.find('[data-test="comment-text"]').setValue('Texto importante')

    await wrapper.setProps({ error: 'La fecha no puede estar en el futuro' })

    expect(wrapper.find('[data-test="timeline-dialog-error"]').text()).toContain('futuro')
    expect((wrapper.find('[data-test="comment-text"]').element as HTMLTextAreaElement).value).toBe('Texto importante')
  })
})

describe('diálogo de intervención', () => {
  const open = (props: Record<string, unknown> = {}) =>
    mountSuspended(TimelineInterventionDialog, { props: { open: true, soilMixes: MIXES, ...props } })

  const has = (wrapper: Awaited<ReturnType<typeof open>>, test: string) => wrapper.find(`[data-test="${test}"]`).exists()

  it('muestra solo los campos del tipo elegido', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="intervention-type"]').setValue('trasplante')
    expect(has(wrapper, 'intervention-pot-size')).toBe(true)
    expect(has(wrapper, 'intervention-product')).toBe(false)

    await wrapper.find('[data-test="intervention-type"]').setValue('poda')
    expect(has(wrapper, 'intervention-pot-size')).toBe(false)
    expect(has(wrapper, 'intervention-product')).toBe(false)

    await wrapper.find('[data-test="intervention-type"]').setValue('fertilizacion')
    expect(has(wrapper, 'intervention-product')).toBe(true)

    await wrapper.find('[data-test="intervention-type"]').setValue('sustrato')
    expect(has(wrapper, 'intervention-soil-mix')).toBe(true)
  })

  it('no envía el dato de un tipo que ya no está elegido', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="intervention-pot-size"]').setValue('12 cm')

    await wrapper.find('[data-test="intervention-type"]').setValue('poda')
    await wrapper.find('[data-test="intervention-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]![0]).toMatchObject({ type: 'poda', potSize: undefined, product: undefined })
  })

  it('un cambio de sustrato exige la mezcla', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="intervention-type"]').setValue('sustrato')

    await wrapper.find('[data-test="intervention-form"]').trigger('submit')
    expect(wrapper.find('[data-test="intervention-mix-error"]').exists()).toBe(true)
    expect(wrapper.emitted('submit')).toBeUndefined()

    await wrapper.find('[data-test="intervention-soil-mix"]').setValue('70')
    await wrapper.find('[data-test="intervention-form"]').trigger('submit')
    expect(wrapper.emitted('submit')![0]![0]).toMatchObject({ type: 'sustrato', soilMixId: '70' })
  })

  it('corregir precarga el tipo y sus datos', async () => {
    const entry: TimelineEntry = {
      id: '8', type: 'intervencion', occurredAt: '2026-09-01T10:00:00Z',
      intervention: { type: 'tratamiento', product: 'Jabón potásico', notes: 'Cochinilla' },
    }
    const wrapper = await open({ entry })

    expect((wrapper.find('[data-test="intervention-product"]').element as HTMLInputElement).value).toBe('Jabón potásico')
    expect((wrapper.find('[data-test="intervention-notes"]').element as HTMLTextAreaElement).value).toBe('Cochinilla')
  })

  it('un error del API se explica sin perder lo escrito', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="intervention-pot-size"]').setValue('12 cm')

    await wrapper.setProps({ error: 'La mezcla no existe' })

    expect(wrapper.find('[data-test="timeline-dialog-error"]').exists()).toBe(true)
    expect((wrapper.find('[data-test="intervention-pot-size"]').element as HTMLInputElement).value).toBe('12 cm')
  })
})

describe('diálogo de floración', () => {
  const open = (props: Record<string, unknown> = {}) =>
    mountSuspended(TimelineBloomDialog, { props: { open: true, ...props } })

  it('el fin solo aparece con el estado «Finalizada»', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="bloom-ended"]').exists()).toBe(false)

    await wrapper.find('[data-test="bloom-status"]').setValue('finalizada')
    expect(wrapper.find('[data-test="bloom-ended"]').exists()).toBe(true)

    await wrapper.find('[data-test="bloom-status"]').setValue('en_flor')
    expect(wrapper.find('[data-test="bloom-ended"]').exists()).toBe(false)
  })

  it('exige el inicio, y el fin si está finalizada', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="bloom-form"]').trigger('submit')
    expect(wrapper.find('[data-test="bloom-started-error"]').exists()).toBe(true)

    await wrapper.find('[data-test="bloom-started"]').setValue('2026-05-22')
    await wrapper.find('[data-test="bloom-status"]').setValue('finalizada')
    await wrapper.find('[data-test="bloom-form"]').trigger('submit')
    expect(wrapper.find('[data-test="bloom-ended-error"]').exists()).toBe(true)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('envía una floración abierta sin fin', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="bloom-started"]').setValue('2026-05-22')
    await wrapper.find('[data-test="bloom-flowers"]').setValue('3')

    await wrapper.find('[data-test="bloom-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual([
      { startedOn: '2026-05-22', status: 'en_flor', endedOn: undefined, flowerCount: 3, notes: undefined },
    ])
  })

  it('cerrar una floración abierta parte del estado finalizada', async () => {
    const entry: TimelineEntry = { id: '3', type: 'floracion', occurredAt: '2026-05-22T00:00:00Z', bloom: { startedOn: '2026-05-22', status: 'en_flor' } }
    const wrapper = await open({ entry, closing: true })

    expect((wrapper.find('[data-test="bloom-status"]').element as HTMLSelectElement).value).toBe('finalizada')
    await wrapper.find('[data-test="bloom-ended"]').setValue('2026-05-25')
    await wrapper.find('[data-test="bloom-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]![0]).toMatchObject({ startedOn: '2026-05-22', status: 'finalizada', endedOn: '2026-05-25' })
  })

  it('un error del API se explica sin perder lo escrito', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="bloom-started"]').setValue('2026-05-22')

    await wrapper.setProps({ error: 'Rechazada' })

    expect(wrapper.find('[data-test="timeline-dialog-error"]').exists()).toBe(true)
    expect((wrapper.find('[data-test="bloom-started"]').element as HTMLInputElement).value).toBe('2026-05-22')
  })
})

describe('retirar un evento', () => {
  it('pide confirmación: cancelar no confirma y confirmar emite', async () => {
    const wrapper = await mountSuspended(TimelineRemoveDialog, { props: { open: true, what: 'el comentario' } })

    await wrapper.find('[data-test="cancel-remove"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()

    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})
