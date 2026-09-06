import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiMediaGallery from '../app/components/ui/UiMediaGallery.vue'

/** Escenarios de la requirement "Galería de imágenes" (`design-system`). */

const IMAGES = [
  { id: '1', src: '/a.jpg', alt: 'Ápice del ejemplar', primary: true },
  { id: '2', src: '/b.jpg', alt: 'Vista lateral', caption: 'Tras el trasplante' },
  { id: '3', src: '/c.jpg', alt: 'Raíces' },
]

const gallery = (props: Record<string, unknown> = {}) =>
  mountSuspended(UiMediaGallery, { props: { images: IMAGES, ...props } })

describe('UiMediaGallery', () => {
  it('cada imagen lleva su texto alternativo', async () => {
    const wrapper = await gallery()

    const alts = wrapper.findAll('[data-role="thumb"] img').map((img) => img.attributes('alt'))
    expect(alts).toEqual(['Ápice del ejemplar', 'Vista lateral', 'Raíces'])
  })

  it('la principal se distingue por texto, no solo por posición o color', async () => {
    const wrapper = await gallery()

    const primary = wrapper.find('[data-role="thumb"][data-primary="true"]')
    expect(primary.exists()).toBe(true)
    expect(primary.text().toLowerCase()).toContain('principal')
  })

  it('ampliar una imagen la muestra con su texto y ofrece salida', async () => {
    const wrapper = await gallery()

    await wrapper.findAll('[data-role="thumb"] button')[1]!.trigger('click')

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.find('img').attributes('alt')).toBe('Vista lateral')
    expect(dialog.text()).toContain('Tras el trasplante')
    expect(dialog.find('[aria-label="Cerrar"]').exists()).toBe(true)
  })

  it('sin imágenes explica que todavía no hay fotografías', async () => {
    const wrapper = await gallery({ images: [] })

    expect(wrapper.findAll('[data-role="thumb"]')).toHaveLength(0)
    expect(wrapper.text().toLowerCase()).toContain('fotografía')
  })
})
