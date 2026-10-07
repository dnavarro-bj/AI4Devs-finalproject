import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AlertCloseDialog from '../src/features/alerts/components/AlertCloseDialog.vue'
import AlertCreateDialog from '../src/features/alerts/components/AlertCreateDialog.vue'
import type { Alert } from '../src/features/alerts/types/alert.types'

/** Escenarios de «Bandeja de alertas»: resolver y descartar con comentario, y anotar una incidencia. */

const alert: Alert = {
  id: '1', source: 'medicion', category: 'temperatura', severity: 'critica', status: 'nueva',
  reason: 'Temperatura 4 °C por debajo del mínimo de 10 °C',
  detectedAt: '2026-10-06T00:00:00Z', lastDetectedAt: '2026-10-06T00:00:00Z', occurrences: 1,
  plant: { id: '5', code: 'CAT-FEROC-08', nickname: 'Pelona', speciesName: 'Ferocactus gracilis', locationName: 'B1', locationPath: 'Invernadero 2 / B1' },
}

describe('diálogo de resolver o descartar', () => {
  const open = (action: 'resolve' | 'dismiss', props: Record<string, unknown> = {}) =>
    mountSuspended(AlertCloseDialog, { props: { open: true, alert, action, ...props } })

  it('resolver se presenta como resolver y avisa de que registra la fecha', async () => {
    const wrapper = await open('resolve')

    expect(wrapper.find('[data-test="alert-close-submit"]').text()).toBe('Resolver alerta')
    expect(wrapper.find('[data-test="alert-close-impact"]').text()).toContain('resuelta')
  })

  it('descartar no se presenta como resolver', async () => {
    const wrapper = await open('dismiss')

    expect(wrapper.find('[data-test="alert-close-submit"]').text()).toBe('Descartar alerta')
    expect(wrapper.find('[data-test="alert-close-impact"]').text()).toContain('no cuenta como resuelta')
  })

  it('el comentario es opcional: se envía vacío o recortado', async () => {
    const wrapper = await open('resolve')

    await wrapper.find('[data-test="alert-close-form"]').trigger('submit')
    await wrapper.find('[data-test="alert-close-comment"]').setValue('  Cambiada de sitio  ')
    await wrapper.find('[data-test="alert-close-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual([undefined])
    expect(wrapper.emitted('submit')![1]).toEqual(['Cambiada de sitio'])
  })

  it('un error del API se explica sin perder el comentario escrito', async () => {
    const wrapper = await open('resolve')
    await wrapper.find('[data-test="alert-close-comment"]').setValue('Texto importante')

    await wrapper.setProps({ error: 'La alerta ya está cerrada' })

    expect(wrapper.find('[data-test="alert-close-error"]').text()).toContain('ya está cerrada')
    expect((wrapper.find('[data-test="alert-close-comment"]').element as HTMLTextAreaElement).value).toBe('Texto importante')
  })

  it('cada apertura parte de un comentario vacío', async () => {
    const wrapper = await open('resolve')
    await wrapper.find('[data-test="alert-close-comment"]').setValue('Antiguo')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect((wrapper.find('[data-test="alert-close-comment"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('el enfoque va al comentario al abrir', async () => {
    const wrapper = await open('dismiss')

    expect(wrapper.find('[data-test="alert-close-comment"]').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })
})

describe('diálogo de anotar una alerta', () => {
  const open = (props: Record<string, unknown> = {}) =>
    mountSuspended(AlertCreateDialog, { props: { open: true, subjectLabel: 'CAT-FEROC-08', ...props } })

  it('sin motivo se señala junto al campo y no envía nada', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="alert-create-form"]').trigger('submit')

    expect(wrapper.find('[data-test="alert-reason-error"]').exists()).toBe(true)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('envía categoría, severidad y motivo; la acción recomendada solo si se escribe', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="alert-category"]').setValue('humedad')
    await wrapper.find('[data-test="alert-severity"]').setValue('critica')
    await wrapper.find('[data-test="alert-reason"]').setValue('  Cochinilla en la base  ')
    await wrapper.find('[data-test="alert-create-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual([{ category: 'humedad', severity: 'critica', reason: 'Cochinilla en la base' }])

    await wrapper.find('[data-test="alert-action"]').setValue('Aislar la planta')
    await wrapper.find('[data-test="alert-create-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![1]).toEqual([
      { category: 'humedad', severity: 'critica', reason: 'Cochinilla en la base', recommendedAction: 'Aislar la planta' },
    ])
  })

  it('dice a qué se anota la alerta', async () => {
    const wrapper = await open()

    expect(wrapper.text()).toContain('CAT-FEROC-08')
  })

  it('un error del API se explica sin perder lo escrito', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="alert-reason"]').setValue('Motivo escrito')

    await wrapper.setProps({ error: 'La planta no existe' })

    expect(wrapper.find('[data-test="alert-create-error"]').text()).toContain('no existe')
    expect((wrapper.find('[data-test="alert-reason"]').element as HTMLTextAreaElement).value).toBe('Motivo escrito')
  })
})
