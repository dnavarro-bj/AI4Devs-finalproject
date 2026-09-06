import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiField from '../app/components/ui/UiField.vue'

/**
 * Escenarios "Etiqueta asociada al control", "Campo en error", "Sufijo de unidad" y "Campo de solo
 * lectura".
 */
describe('UiField', () => {
  it('la etiqueta es visible y queda asociada al control', () => {
    const wrapper = mount(UiField, { props: { label: 'Nickname' } })

    const label = wrapper.find('label')
    const input = wrapper.find('input')
    expect(label.text()).toContain('Nickname')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('id')).toBeTruthy()
  })

  it('muestra la ayuda asociada al control', () => {
    const wrapper = mount(UiField, { props: { label: 'Humedad', help: 'Rango efectivo: 20–40%.' } })

    const help = wrapper.find('[data-role="help"]')
    expect(help.text()).toBe('Rango efectivo: 20–40%.')
    expect(wrapper.find('input').attributes('aria-describedby')).toBe(help.attributes('id'))
  })

  it('en error muestra cómo corregirlo, marca el control como inválido y conserva el valor', () => {
    const wrapper = mount(UiField, {
      props: { label: 'pH del sustrato', error: 'Introduce un valor entre 0 y 14.', modelValue: '15' },
    })

    const input = wrapper.find('input')
    expect(wrapper.text()).toContain('Introduce un valor entre 0 y 14.')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect((input.element as HTMLInputElement).value).toBe('15')
  })

  it('la unidad se muestra fuera del valor editable y no forma parte de lo que el campo emite', async () => {
    const wrapper = mount(UiField, { props: { label: 'Humedad', unit: '%', modelValue: '' } })

    expect(wrapper.text()).toContain('%')

    await wrapper.find('input').setValue('31')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['31'])
  })

  it('de solo lectura es legible y no editable', () => {
    const wrapper = mount(UiField, { props: { label: 'Especie', modelValue: 'Echinocactus', readonly: true } })

    expect(wrapper.find('input').attributes('readonly')).toBeDefined()
  })

  it('deshabilitado lo declara en el control', () => {
    const wrapper = mount(UiField, { props: { label: 'Especie', disabled: true } })

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  it('rinde un selector cuando se le piden opciones', () => {
    const wrapper = mount(UiField, {
      props: {
        label: 'Localización',
        as: 'select',
        options: [{ value: '1', label: 'Invernadero 1' }],
        placeholder: 'Elige una localización',
      },
    })

    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    expect(select.findAll('option').map((option) => option.text())).toEqual([
      'Elige una localización',
      'Invernadero 1',
    ])
  })

  it('los atributos del punto de uso caen en el control, no en el envoltorio', () => {
    const wrapper = mount(UiField, { props: { label: 'Nickname' }, attrs: { 'data-test': 'nickname' } })

    expect(wrapper.attributes('data-test')).toBeUndefined()
    expect(wrapper.find('input').attributes('data-test')).toBe('nickname')
  })
})

/**
 * Escenario "Campo en línea" de la requirement "Campos de formulario" (`design-system`), añadido
 * por `esqueleto-plantas`: la rejilla de mediciones lo necesita.
 */
describe('UiField en línea', () => {
  it('mantiene la etiqueta asociada al control', () => {
    const wrapper = mount(UiField, { props: { label: 'Humedad', layout: 'row', unit: '%' } })

    const input = wrapper.find('input')
    expect(wrapper.find('label').attributes('for')).toBe(input.attributes('id'))
  })

  it('el texto de ayuda sigue anunciándose', () => {
    const wrapper = mount(UiField, {
      props: { label: 'Humedad', layout: 'row', help: 'Recomendada 20–40 %' },
    })

    const help = wrapper.find('[data-role="help"]')
    expect(help.text()).toBe('Recomendada 20–40 %')
    expect(wrapper.find('input').attributes('aria-describedby')).toBe(help.attributes('id'))
  })

  it('se distingue del apilado en el marcado, para que la pantalla no lo imite con CSS', () => {
    expect(mount(UiField, { props: { label: 'x', layout: 'row' } }).classes()).toContain('field--row')
    expect(mount(UiField, { props: { label: 'x' } }).classes()).not.toContain('field--row')
  })
})
