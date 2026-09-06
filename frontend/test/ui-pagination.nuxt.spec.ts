import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiPagination from '../app/components/ui/UiPagination.vue'

/** Escenarios de la requirement "Paginación" (`design-system`). */

/** `page` es 0-based, como el envelope del API (ADR-009); lo que se muestra cuenta desde uno. */
async function pager(props: { page: number, totalPages: number, loading?: boolean }) {
  return mountSuspended(UiPagination, { props })
}

describe('UiPagination', () => {
  it('no se muestra cuando el contenido cabe en una sola página', async () => {
    const wrapper = await pager({ page: 0, totalPages: 1 })

    expect(wrapper.find('[data-test="page-indicator"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="next-page"]').exists()).toBe(false)
  })

  it('indica la página actual y el total, contando desde uno', async () => {
    const wrapper = await pager({ page: 2, totalPages: 7 })

    expect(wrapper.find('[data-test="page-indicator"]').text()).toBe('Página 3 de 7')
  })

  it('en la primera página no se puede retroceder', async () => {
    const wrapper = await pager({ page: 0, totalPages: 5 })

    expect(wrapper.find('[data-test="previous-page"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="next-page"]').attributes('disabled')).toBeUndefined()
  })

  it('en la última página no se puede avanzar', async () => {
    const wrapper = await pager({ page: 4, totalPages: 5 })

    expect(wrapper.find('[data-test="next-page"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="previous-page"]').attributes('disabled')).toBeUndefined()
  })

  it('mientras una página carga no admite ninguna activación: los saltos no se encolan', async () => {
    const wrapper = await pager({ page: 2, totalPages: 5, loading: true })

    expect(wrapper.find('[data-test="previous-page"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="next-page"]').attributes('disabled')).toBeDefined()
  })

  it('emite la página pedida, no un incremento', async () => {
    const wrapper = await pager({ page: 2, totalPages: 5 })

    await wrapper.find('[data-test="next-page"]').trigger('click')
    await wrapper.find('[data-test="previous-page"]').trigger('click')

    expect(wrapper.emitted('update:page')).toEqual([[3], [1]])
  })

  it('la navegación tiene nombre accesible', async () => {
    const wrapper = await pager({ page: 0, totalPages: 5 })

    expect(wrapper.find('nav').attributes('aria-label')).toBeTruthy()
  })
})
