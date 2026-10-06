import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiZoneCard from '../app/components/ui/UiZoneCard.vue'

describe('UiZoneCard', () => {
  it('resume identidad, estado y carga de una zona navegable', async () => {
    const wrapper = await mountSuspended(UiZoneCard, {
      props: {
        title: 'Invernadero 1',
        summary: '486 plantas',
        to: '/locations/1',
        mark: '⌂',
        status: 'En uso',
        statusTone: 'ok',
        progress: 78,
        progressLabel: '78 % de capacidad',
      },
    })

    expect(wrapper.attributes('href')).toBe('/locations/1')
    expect(wrapper.text()).toContain('Invernadero 1')
    expect(wrapper.text()).toContain('En uso')
    expect(wrapper.find('.progress').classes()).toContain('is-stacked')
  })
})
