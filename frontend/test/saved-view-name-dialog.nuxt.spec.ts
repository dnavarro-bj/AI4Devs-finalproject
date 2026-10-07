import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import SavedViewNameDialog from '../src/features/views/components/SavedViewNameDialog.vue'

/** Pedir un nombre para guardar o renombrar: un fallo no pierde lo escrito. */
describe('diálogo de nombre de una vista', () => {
  const open = async (submit: (name: string) => Promise<string | null>, initialName = '') => {
    const wrapper = await mountSuspended(SavedViewNameDialog, {
      props: { open: true, title: 'Guardar la vista actual', submitLabel: 'Guardar', initialName, submit },
    })
    await settle()
    return wrapper
  }

  const input = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.find('[data-test="view-name"]')

  it('un nombre en blanco no se envía y explica por qué', async () => {
    const submit = vi.fn().mockResolvedValue(null)
    const wrapper = await open(submit)

    await input(wrapper).setValue('   ')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(submit).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="name-required"]').exists()).toBe(true)
  })

  it('envía el nombre recortado y se cierra cuando sale bien', async () => {
    const submit = vi.fn().mockResolvedValue(null)
    const wrapper = await open(submit)

    await input(wrapper).setValue('  Cuarentena  ')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(submit).toHaveBeenCalledWith('Cuarentena')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('un nombre repetido se muestra en línea, sigue abierto y conserva lo escrito', async () => {
    const submit = vi.fn().mockResolvedValue('Ya existe una vista con ese nombre')
    const wrapper = await open(submit)

    await input(wrapper).setValue('Cuarentena')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="name-error"]').text()).toContain('Ya existe una vista con ese nombre')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect((input(wrapper).element as HTMLInputElement).value).toBe('Cuarentena')
  })

  it('al renombrar parte del nombre actual', async () => {
    const wrapper = await open(vi.fn().mockResolvedValue(null), 'Sensibles al frío')

    expect((input(wrapper).element as HTMLInputElement).value).toBe('Sensibles al frío')
  })

  it('cancelar cierra sin enviar', async () => {
    const submit = vi.fn()
    const wrapper = await open(submit)

    await wrapper.find('[data-test="cancel-name"]').trigger('click')

    expect(submit).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('mientras se envía no admite un segundo envío', async () => {
    let finish: (value: string | null) => void = () => {}
    const submit = vi.fn(() => new Promise<string | null>((resolve) => { finish = resolve }))
    const wrapper = await open(submit)

    await input(wrapper).setValue('Cuarentena')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    expect(wrapper.find('[data-test="confirm-name"]').attributes('aria-busy')).toBe('true')
    finish(null)
    await settle()

    expect(submit).toHaveBeenCalledTimes(1)
  })
})
