import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiMetricStrip from '../app/components/ui/UiMetricStrip.vue'

describe('UiMetricStrip', () => {
  const items = [
    { value: 43, label: 'Tareas pendientes', note: '5 vencidas', to: '/tasks' },
    { value: 4, label: 'Alertas abiertas', tone: 'danger' as const },
    { value: 18, label: 'Localizaciones', mock: true },
  ]

  it('presenta magnitudes relacionadas en una única franja', async () => {
    const wrapper = await mountSuspended(UiMetricStrip, {
      props: { items, label: 'Resumen operativo' },
    })

    expect(wrapper.attributes('aria-label')).toBe('Resumen operativo')
    expect(wrapper.text()).toContain('Tareas pendientes')
    expect(wrapper.findAll('.metric-strip > *')).toHaveLength(3)
  })

  it('conserva navegación, tono y marca de maqueta por elemento', async () => {
    const wrapper = await mountSuspended(UiMetricStrip, {
      props: { items, label: 'Resumen operativo' },
    })

    expect(wrapper.find('a').attributes('href')).toBe('/tasks')
    expect(wrapper.find('.is-danger').exists()).toBe(true)
    expect(wrapper.find('[data-mock="true"]').exists()).toBe(true)
  })
})
