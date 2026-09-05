import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiEmptyState from '../app/components/ui/UiEmptyState.vue'
import UiInlineError from '../app/components/ui/UiInlineError.vue'
import UiNotice from '../app/components/ui/UiNotice.vue'
import UiPanel from '../app/components/ui/UiPanel.vue'

/**
 * Escenarios de panel, aviso, estado vacío y error en línea de la capability `design-system`.
 */
describe('UiPanel', () => {
  it('alinea el título con una única acción contextual y contiene el contenido', () => {
    const wrapper = mount(UiPanel, {
      props: { title: 'Nueva lectura' },
      slots: { default: 'contenido', action: '<button>Ver historial</button>' },
    })

    expect(wrapper.find('header').text()).toContain('Nueva lectura')
    expect(wrapper.findAll('header button')).toHaveLength(1)
    expect(wrapper.text()).toContain('contenido')
  })

  it('sin título no pinta cabecera vacía', () => {
    const wrapper = mount(UiPanel, { slots: { default: 'contenido' } })

    expect(wrapper.find('header').exists()).toBe(false)
  })

  it('es una superficie con la clase del sistema', () => {
    const wrapper = mount(UiPanel, { slots: { default: 'contenido' } })

    expect(wrapper.classes()).toContain('panel')
  })
})

describe('UiNotice', () => {
  it('muestra severidad, título, explicación y acción, con la severidad también en texto', () => {
    const wrapper = mount(UiNotice, {
      props: { severity: 'warning', title: 'Revisión pendiente' },
      slots: { default: 'No se registra una observación desde hace 43 días.', action: '<button>Crear tarea</button>' },
    })

    expect(wrapper.text()).toContain('Revisión pendiente')
    expect(wrapper.text()).toContain('43 días')
    expect(wrapper.text()).toContain('Crear tarea')
    expect(wrapper.find('.sr-only').text().toLowerCase()).toContain('atención')
  })

  it('al descartarlo desaparece y no declara nada resuelto', async () => {
    const wrapper = mount(UiNotice, {
      props: { severity: 'warning', title: 'Revisión pendiente', dismissible: true },
    })

    await wrapper.find('[data-role="dismiss"]').trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
    expect(wrapper.emitted()).not.toHaveProperty('resolve')
  })
})

describe('UiEmptyState', () => {
  it('explica qué falta y ofrece exactamente una acción', () => {
    const wrapper = mount(UiEmptyState, {
      props: { title: 'Todavía no hay plantas aquí' },
      slots: { default: 'Añade un ejemplar para empezar.', action: '<button>Añadir planta</button>' },
    })

    expect(wrapper.text()).toContain('Todavía no hay plantas aquí')
    expect(wrapper.findAll('button')).toHaveLength(1)
  })
})

describe('UiInlineError', () => {
  it('identifica lo fallado, describe el siguiente paso y se anuncia como alerta', () => {
    const wrapper = mount(UiInlineError, {
      props: { title: 'No se pudo importar la fila 18' },
      slots: { default: 'Usa otro código o excluye la fila.' },
    })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('No se pudo importar la fila 18')
    expect(wrapper.text()).toContain('Usa otro código o excluye la fila.')
  })

  it('sin título el mensaje es el contenido', () => {
    const wrapper = mount(UiInlineError, { slots: { default: 'No se ha podido cargar el inventario.' } })

    expect(wrapper.text()).toBe('No se ha podido cargar el inventario.')
  })
})
