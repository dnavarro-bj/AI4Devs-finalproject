import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiListFooter from '../app/components/ui/UiListFooter.vue'

describe('UiListFooter', () => {
  it('explica el intervalo visible aunque solo haya una página', async () => {
    const wrapper = await mountSuspended(UiListFooter, {
      props: { page: 0, pageSize: 25, totalElements: 2, totalPages: 1 },
    })

    expect(wrapper.text()).toContain('1–2 de 2 resultados')
    expect(wrapper.find('[data-test="next-page"]').exists()).toBe(false)
  })

  it('calcula el intervalo de páginas posteriores y reenvía la navegación', async () => {
    const wrapper = await mountSuspended(UiListFooter, {
      props: { page: 1, pageSize: 25, totalElements: 52, totalPages: 3 },
    })

    expect(wrapper.text()).toContain('26–50 de 52 resultados')
    await wrapper.find('[data-test="next-page"]').trigger('click')
    expect(wrapper.emitted('update:page')?.at(-1)).toEqual([2])
  })
})
