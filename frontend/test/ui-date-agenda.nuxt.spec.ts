import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiDateAgenda from '../app/components/ui/UiDateAgenda.vue'

describe('UiDateAgenda', () => {
  it('agrupa por fecha y presenta un raíl determinista sin consultar el reloj', async () => {
    const wrapper = await mountSuspended(UiDateAgenda, {
      props: {
        today: '2026-09-03',
        entries: [
          { id: '1', due: '2026-09-03' },
          { id: '2', due: '2026-09-03' },
          { id: '3', due: '2026-09-04' },
        ],
      },
      slots: { entry: '<span>Trabajo</span>' },
    })

    const groups = wrapper.findAll('[data-role="date-group"]')
    expect(groups).toHaveLength(2)
    expect(groups[0]!.text()).toContain('Hoy')
    expect(groups[0]!.text()).toContain('03')
    expect(groups[1]!.text().toLowerCase()).toContain('vie')
    expect(groups[1]!.text().toLowerCase()).toContain('sep')
  })
})
