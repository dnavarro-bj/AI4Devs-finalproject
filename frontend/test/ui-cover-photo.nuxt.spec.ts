import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiCoverPhoto from '../app/components/ui/UiCoverPhoto.vue'

/** Escenarios de la requirement «Portada con recuento» (`design-system`). */

const cover = (props: Record<string, unknown> = {}) =>
  mountSuspended(UiCoverPhoto, { props: { src: '/t.jpg', alt: 'Echinocactus grusonii adulto', count: 8, ...props } })

describe('UiCoverPhoto', () => {
  it('pinta la imagen con su texto alternativo', async () => {
    const wrapper = await cover()

    const img = wrapper.find('img')
    expect(img.attributes('src')).toBe('/t.jpg')
    expect(img.attributes('alt')).toBe('Echinocactus grusonii adulto')
  })

  it('dice el recuento en plural y en singular', async () => {
    expect((await cover({ count: 8 })).text()).toContain('8 fotos')
    expect((await cover({ count: 1 })).text()).toContain('1 foto')
    expect((await cover({ count: 1 })).text()).not.toContain('1 fotos')
  })

  it('el recuento es un botón cuando se puede activar y emite «count»', async () => {
    const wrapper = await cover({ countAction: true })

    const button = wrapper.find('button')
    expect(button.text()).toContain('8 fotos')
    await button.trigger('click')
    expect(wrapper.emitted('count')).toHaveLength(1)
  })

  it('sin acción el recuento es solo texto', async () => {
    expect((await cover()).find('button').exists()).toBe(false)
  })

  it('sin fotografía lo dice, sin imagen rota ni hueco en blanco', async () => {
    const wrapper = await cover({ src: undefined, alt: undefined, count: 0 })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sin fotografía')
    expect(wrapper.attributes('aria-label') ?? wrapper.find('[role="img"]').attributes('aria-label')).toContain('Sin fotografía')
    // Sin fotos no hay recuento que enseñar: ni «0 fotos» ni una cifra de ejemplo.
    expect(wrapper.text()).not.toMatch(/\d+ fotos?/)
  })

  it('tiene dos tamaños', async () => {
    expect((await cover({ size: 'sm' })).classes()).toContain('is-sm')
    expect((await cover({ size: 'lg' })).classes()).toContain('is-lg')
    expect((await cover()).classes()).toContain('is-lg')
  })

  it('un solo elemento raíz: los atributos del punto de uso caen en él', async () => {
    const wrapper = await mountSuspended(UiCoverPhoto, {
      props: { src: '/t.jpg', alt: 'x', count: 2 },
      attrs: { 'data-test': 'cover' },
    })

    expect(wrapper.attributes('data-test')).toBe('cover')
  })
})
