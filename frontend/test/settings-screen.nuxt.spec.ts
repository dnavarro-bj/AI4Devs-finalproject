import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import SettingsPage from '../app/pages/settings/index.vue'
import { useToast } from '@shared/composables/useToast'

/**
 * Escenarios de la requirement «Configuración por ámbitos», que especifica la composición de la
 * pantalla `settings` del prototipo: navegación de ámbitos a un lado y el panel activo al otro.
 * Es **maqueta**: guardar no persiste nada.
 */
describe('configuración por ámbitos', () => {
  afterEach(() => useToast().clear())

  async function open() {
    const wrapper = await mountSuspended(SettingsPage)
    await settle()
    return wrapper
  }

  const goTo = async (wrapper: Awaited<ReturnType<typeof open>>, label: string) => {
    await wrapper.findAll('nav button').find((button) => button.text().includes(label))!.trigger('click')
  }

  it('compone la pantalla: guardado en la cabecera, ámbitos a un lado y un panel al otro', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="save-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="save-settings"]').exists()).toBe(true)
    const nav = wrapper.find('nav[aria-label="Secciones de configuración"]')
    expect(nav.findAll('button').map((button) => button.text())).toEqual([
      expect.stringContaining('Colección'),
      expect.stringContaining('Códigos'),
      expect.stringContaining('Alertas y avisos'),
      expect.stringContaining('Inteligencia artificial'),
      expect.stringContaining('Usuarios y acceso'),
    ])
  })

  it('muestra un ámbito a la vez y marca el elegido como actual', async () => {
    const wrapper = await open()
    expect(wrapper.findAll('[data-test="settings-panel"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="settings-panel"]').attributes('data-scope')).toBe('collection')

    await goTo(wrapper, 'Códigos')

    expect(wrapper.findAll('[data-test="settings-panel"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="settings-panel"]').attributes('data-scope')).toBe('codes')
    const current = wrapper.find('nav[aria-label="Secciones de configuración"] [aria-current="true"]')
    expect(current.text()).toContain('Códigos')
  })

  it('lo editado en un ámbito se conserva al cambiar de ámbito y volver', async () => {
    const wrapper = await open()

    await wrapper.find('input[data-test="collection-name"]').setValue('Mi vivero')
    await goTo(wrapper, 'Códigos')
    await goTo(wrapper, 'Colección')

    expect((wrapper.find('input[data-test="collection-name"]').element as HTMLInputElement).value).toBe('Mi vivero')
  })

  it('el estado de guardado pasa a «hay cambios sin guardar» al editar', async () => {
    const wrapper = await open()
    expect(wrapper.find('[data-test="save-state"]').text()).toContain('guardados')

    await wrapper.find('input[data-test="collection-name"]').setValue('Otro nombre')

    expect(wrapper.find('[data-test="save-state"]').text().toLowerCase()).toContain('sin guardar')
  })

  it('volver al valor original deja de contar como cambio: «sucio» se calcula', async () => {
    const wrapper = await open()
    const original = (wrapper.find('input[data-test="collection-name"]').element as HTMLInputElement).value

    await wrapper.find('input[data-test="collection-name"]').setValue('Otro nombre')
    await wrapper.find('input[data-test="collection-name"]').setValue(original)

    expect(wrapper.find('[data-test="save-state"]').text()).toContain('guardados')
  })

  it('la vista previa del código refleja al instante prefijo, dígitos y separador', async () => {
    const wrapper = await open()
    await goTo(wrapper, 'Códigos')
    expect(wrapper.find('[data-test="code-preview"]').text()).toBe('CAT-GRUSS-01')

    await wrapper.find('input[data-test="codes-prefix"]').setValue('VIV')
    await wrapper.find('select[data-test="codes-digits"]').setValue('3')
    await wrapper.find('select[data-test="codes-separator"]').setValue('/')

    expect(wrapper.find('[data-test="code-preview"]').text()).toBe('VIV/GRUSS/001')
  })

  it('guardar no persiste y lo dice', async () => {
    const wrapper = await open()
    await wrapper.find('input[data-test="collection-name"]').setValue('Otro nombre')

    await wrapper.find('[data-test="save-settings"]').trigger('click')

    expect(useToast().toasts.value.at(-1)!.message.toLowerCase()).toContain('no se conserva')
    expect(wrapper.find('[data-test="mock-notice"]').text().toLowerCase()).toContain('sin ticket')
  })

  it('el ámbito de IA declara qué datos se envían y no muestra ni pide la clave de acceso', async () => {
    const wrapper = await open()
    await goTo(wrapper, 'Inteligencia artificial')

    const panel = wrapper.find('[data-test="settings-panel"]')
    expect(panel.find('[data-test="ai-privacy"]').text()).toContain('rangos')
    expect(panel.find('input[type="password"]').exists()).toBe(false)
    expect(panel.text().toLowerCase()).not.toContain('sk-')
  })

  it('el ámbito de usuarios muestra al administrador y la invitación deshabilitada y marcada', async () => {
    const wrapper = await open()
    await goTo(wrapper, 'Usuarios y acceso')

    const panel = wrapper.find('[data-test="settings-panel"]')
    expect(panel.text()).toContain('Administrador')
    const invite = panel.find('[data-test="invite-user"]')
    expect(invite.attributes('disabled')).toBeDefined()
    expect(panel.text().toLowerCase()).toContain('más adelante')
  })
})
