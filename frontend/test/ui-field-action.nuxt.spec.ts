import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiFieldAction from '../app/components/ui/UiFieldAction.vue'

/** Escenarios de la requirement "Acción alineada con los campos" (`design-system`). */
describe('UiFieldAction', () => {
  it('reserva el hueco del rótulo para que el control quede a la altura de los demás', () => {
    const wrapper = mount(UiFieldAction, { slots: { default: '<button>Columnas</button>' } })

    // El hueco es un rótulo vacío con el estilo de los rótulos de campo, no un margen a medida:
    // así lo calcula la propia tipografía y no se descuadra si cambia.
    const spacer = wrapper.find('[data-role="label-spacer"]')
    expect(spacer.exists()).toBe(true)
    expect(spacer.attributes('aria-hidden')).toBe('true')
  })

  it('el hueco no se anuncia a las tecnologías de asistencia', () => {
    const wrapper = mount(UiFieldAction, { slots: { default: '<button>Columnas</button>' } })

    expect(wrapper.find('[data-role="label-spacer"]').text().trim()).toBe('')
  })

  it('con rótulo propio lo muestra en vez del hueco', () => {
    const wrapper = mount(UiFieldAction, {
      props: { label: 'Vista' },
      slots: { default: '<button>Columnas</button>' },
    })

    expect(wrapper.text()).toContain('Vista')
    expect(wrapper.find('[data-role="label-spacer"]').exists()).toBe(false)
  })

  it('deja pasar el control tal cual', () => {
    const wrapper = mount(UiFieldAction, { slots: { default: '<button>Columnas</button>' } })

    expect(wrapper.find('button').text()).toBe('Columnas')
  })
})
