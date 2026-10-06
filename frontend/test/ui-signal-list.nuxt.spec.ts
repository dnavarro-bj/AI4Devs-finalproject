import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiSignalList from '../app/components/ui/UiSignalList.vue'

describe('UiSignalList', () => {
  it('presenta señales compactas con destino, contexto, tiempo y severidad legible', async () => {
    const wrapper = await mountSuspended(UiSignalList, {
      props: {
        label: 'Alertas abiertas',
        items: [{ id: '1', title: 'Temperatura crítica', detail: 'CAT-01 · Invernadero', trailing: 'Hace 5 min', to: '/plants/1', tone: 'danger' }],
      },
    })

    expect(wrapper.attributes('aria-label')).toBe('Alertas abiertas')
    expect(wrapper.find('a').attributes('href')).toBe('/plants/1')
    expect(wrapper.text()).toContain('Temperatura crítica')
    expect(wrapper.text()).toContain('Hace 5 min')
    expect(wrapper.text()).toContain('Crítico')
  })
})
