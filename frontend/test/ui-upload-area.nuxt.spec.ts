import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UiUploadArea from '../app/components/ui/UiUploadArea.vue'

/** Escenarios de la requirement "Zona de subida" (`design-system`). */

function fileList(...names: string[]): FileList {
  const files = names.map((name) => new File(['x'], name, { type: 'image/jpeg' }))
  return Object.assign(files, { item: (index: number) => files[index] ?? null }) as unknown as FileList
}

describe('UiUploadArea', () => {
  it('elegir ficheros los comunica y no transfiere nada', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const wrapper = mount(UiUploadArea, { props: { accept: 'image/*' } })

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: fileList('a.jpg', 'b.jpg') })
    await input.trigger('change')

    const emitted = wrapper.emitted('files')?.[0]?.[0] as File[]
    expect(emitted.map((file) => file.name)).toEqual(['a.jpg', 'b.jpg'])
    // Subir es T-19: aquí el componente termina su trabajo al comunicar los ficheros.
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('soltar ficheros encima los comunica igual que elegirlos', async () => {
    const wrapper = mount(UiUploadArea)

    await wrapper.find('[data-role="dropzone"]').trigger('drop', {
      dataTransfer: { files: fileList('soltado.jpg') },
    })

    const emitted = wrapper.emitted('files')?.[0]?.[0] as File[]
    expect(emitted.map((file) => file.name)).toEqual(['soltado.jpg'])
  })

  it('soltar sin ficheros no emite nada', async () => {
    const wrapper = mount(UiUploadArea)

    await wrapper.find('[data-role="dropzone"]').trigger('drop', {
      dataTransfer: { files: fileList() },
    })

    expect(wrapper.emitted('files')).toBeUndefined()
  })

  it('el control es alcanzable con el teclado y tiene nombre accesible', () => {
    const wrapper = mount(UiUploadArea, { props: { label: 'Añadir fotografías' } })

    const input = wrapper.find('input[type="file"]')
    // Un `input` de fichero es alcanzable por sí mismo; lo que no puede faltarle es el nombre.
    expect(input.attributes('id')).toBeTruthy()
    expect(wrapper.find(`label[for="${input.attributes('id')}"]`).text()).toContain('Añadir fotografías')
  })

  it('indica qué tipos admite', () => {
    const wrapper = mount(UiUploadArea, { props: { accept: 'image/jpeg,image/png', hint: 'JPG o PNG' } })

    expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('image/jpeg,image/png')
    expect(wrapper.text()).toContain('JPG o PNG')
  })
})
