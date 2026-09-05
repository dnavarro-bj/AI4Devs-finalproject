import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiFilterChip from '../app/components/ui/UiFilterChip.vue'

/** Escenario "Retirar un filtro": cierre visible, con nombre accesible y sin abrir ningún menú. */
describe('UiFilterChip', () => {
  it('muestra el criterio y ofrece retirarlo en un solo gesto', async () => {
    const wrapper = mount(UiFilterChip, { props: { label: 'Pleno sol' } })

    expect(wrapper.text()).toContain('Pleno sol')

    const remove = wrapper.find('button')
    expect(remove.text()).toContain('Quitar filtro')

    await remove.trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
