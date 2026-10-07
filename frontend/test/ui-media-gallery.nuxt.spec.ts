import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
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

  it('sin el modo de gestión no hay menú por imagen: el comportamiento de siempre', async () => {
    const wrapper = await gallery()

    expect(wrapper.find('.action-menu').exists()).toBe(false)
  })

  it('usa la miniatura en la rejilla y la imagen mediana al ampliar', async () => {
    const wrapper = await gallery({ images: [{ id: '1', src: '/m.jpg', thumbSrc: '/t.jpg', alt: 'Ápice' }] })

    expect(wrapper.find('[data-role="thumb"] img').attributes('src')).toBe('/t.jpg')
    await wrapper.find('[data-role="thumb"] button').trigger('click')
    expect(wrapper.find('[role="dialog"] img').attributes('src')).toBe('/m.jpg')
  })

  it('al ampliar ofrece el enlace al evento cuando la imagen lo trae', async () => {
    const wrapper = await gallery({
      images: [{ id: '1', src: '/m.jpg', alt: 'Ápice', link: { label: 'Ver el evento', to: '/plants/1#event-7' } }],
    })

    await wrapper.find('[data-role="thumb"] button').trigger('click')

    const link = wrapper.find('[role="dialog"] a')
    expect(link.text()).toBe('Ver el evento')
    expect(link.attributes('href')).toBe('/plants/1#event-7')
  })

  describe('modo de gestión', () => {
    const managed = (props: Record<string, unknown> = {}) => gallery({ manage: true, ...props })

    async function choose(wrapper: Awaited<ReturnType<typeof managed>>, index: number, label: string) {
      await wrapper.findAll('[data-role="thumb"]')[index]!.find('.action-menu__trigger').trigger('click')
      const item = wrapper.findAll('[role="menuitem"]').find((entry) => entry.text() === label)!
      await item.trigger('click')
    }

    it('cada imagen lleva su menú, con nombre accesible que la identifica', async () => {
      const wrapper = await managed()

      const triggers = wrapper.findAll('.action-menu__trigger')
      expect(triggers).toHaveLength(3)
      expect(triggers[1]!.attributes('aria-label')).toContain('Vista lateral')
    })

    it('el menú se abre y se recorre con el teclado', async () => {
      const wrapper = await managed()
      const trigger = wrapper.findAll('.action-menu__trigger')[0]!

      await trigger.trigger('keydown', { key: 'ArrowDown' })

      expect(trigger.attributes('aria-expanded')).toBe('true')
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    })

    it('emite «principal» con el identificador, y la principal ya no lo ofrece', async () => {
      const wrapper = await managed()

      await wrapper.findAll('.action-menu__trigger')[0]!.trigger('click')
      expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).not.toContain('Hacer principal')

      await choose(wrapper, 1, 'Hacer principal')
      expect(wrapper.emitted('primary')).toEqual([['2']])
    })

    it('emite «edit» y «remove» con el identificador', async () => {
      const wrapper = await managed()

      await choose(wrapper, 2, 'Editar texto y fecha')
      await choose(wrapper, 1, 'Borrar')

      expect(wrapper.emitted('edit')).toEqual([['3']])
      expect(wrapper.emitted('remove')).toEqual([['2']])
    })

    it('reordenar emite la lista entera de identificadores en el nuevo orden', async () => {
      const wrapper = await managed()

      await choose(wrapper, 1, 'Mover antes')
      expect(wrapper.emitted('reorder')![0]).toEqual([['2', '1', '3']])

      await choose(wrapper, 1, 'Mover después')
      expect(wrapper.emitted('reorder')![1]).toEqual([['1', '3', '2']])
    })

    it('la primera no puede ir antes ni la última después', async () => {
      const wrapper = await managed()

      await wrapper.findAll('.action-menu__trigger')[0]!.trigger('click')
      const before = wrapper.findAll('[role="menuitem"]').find((item) => item.text() === 'Mover antes')!
      expect(before.attributes('aria-disabled')).toBe('true')
    })

    it('tras reordenar el foco vuelve al menú de la imagen movida', async () => {
      const wrapper = await mountSuspended(UiMediaGallery, {
        props: { images: IMAGES, manage: true },
        attachTo: document.body,
      })

      await choose(wrapper as never, 1, 'Mover antes')
      await wrapper.setProps({ images: [IMAGES[1]!, IMAGES[0]!, IMAGES[2]!] })
      await nextTick()

      const moved = wrapper.find('[data-role="thumb"][data-image-id="2"] .action-menu__trigger').element
      expect(document.activeElement).toBe(moved)
      wrapper.unmount()
    })

    it('sin portada que elegir ni edición ni orden, solo queda la acción de quitar, con su nombre', async () => {
      const wrapper = await managed({ primaryable: false, editable: false, reorderable: false, removeLabel: 'Quitar del evento' })

      await wrapper.findAll('.action-menu__trigger')[1]!.trigger('click')

      expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['Quitar del evento'])
      await wrapper.find('[role="menuitem"]').trigger('click')
      expect(wrapper.emitted('remove')).toEqual([['2']])
    })

    it('una imagen subiendo o fallida lo dice con texto y no ofrece acciones', async () => {
      const wrapper = await managed({
        images: [
          { id: 'u1', src: '/a.jpg', alt: 'A subir', status: 'uploading', statusText: 'Subiendo…' },
          { id: 'u2', src: '/b.jpg', alt: 'Fallida', status: 'error', statusText: 'No es una imagen admitida' },
        ],
      })

      const items = wrapper.findAll('[data-role="thumb"]')
      expect(items[0]!.text()).toContain('Subiendo…')
      expect(items[1]!.text()).toContain('No es una imagen admitida')
      expect(items[1]!.attributes('data-status')).toBe('error')
      expect(wrapper.find('.action-menu__trigger').exists()).toBe(false)
    })
  })
})
