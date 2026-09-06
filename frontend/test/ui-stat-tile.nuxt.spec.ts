import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiStatTile from '../app/components/ui/UiStatTile.vue'

/** Escenarios de la requirement "Métrica navegable" (`design-system`). */
describe('UiStatTile', () => {
  it('con destino es un enlace al conjunto que la cifra resume', async () => {
    const wrapper = await mountSuspended(UiStatTile, {
      props: { value: 12, label: 'Alertas importantes', to: '/alerts?severity=high' },
    })

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/alerts?severity=high')
    expect(link.text()).toContain('12')
    expect(link.text()).toContain('Alertas importantes')
  })

  it('sin destino se muestra como dato, no como control activable', async () => {
    const wrapper = await mountSuspended(UiStatTile, {
      props: { value: 312, label: 'Ejemplares' },
    })

    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toContain('312')
  })

  it('una métrica en cero se muestra: el cero es información', async () => {
    const wrapper = await mountSuspended(UiStatTile, {
      props: { value: 0, label: 'Tareas vencidas', to: '/tasks' },
    })

    expect(wrapper.text()).toContain('0')
  })

  it('muestra el contexto cuando se declara', async () => {
    const wrapper = await mountSuspended(UiStatTile, {
      props: { value: 4, label: 'Sin revisar', context: 'más de 30 días' },
    })

    expect(wrapper.text()).toContain('más de 30 días')
  })

  it('la severidad se comunica con texto además de con color', async () => {
    const wrapper = await mountSuspended(UiStatTile, {
      props: { value: 3, label: 'Alertas críticas', tone: 'danger' },
    })

    // No basta con una clase: la severidad tiene que poder leerse.
    expect(wrapper.text().toLowerCase()).toContain('crítico')
  })

  it('sin severidad no anuncia ninguna', async () => {
    const wrapper = await mountSuspended(UiStatTile, { props: { value: 3, label: 'Ejemplares' } })

    expect(wrapper.find('[data-test="tone-label"]').exists()).toBe(false)
  })
})
