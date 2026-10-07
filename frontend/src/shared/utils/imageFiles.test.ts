import { describe, expect, it } from 'vitest'
import { IMAGE_ACCEPT, IMAGE_LIMITS, validateImageFiles } from './imageFiles'

function file(name: string, type: string, size = 1000) {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('validación previa de imágenes', () => {
  it('usa la misma tabla de límites que el servidor', () => {
    expect(IMAGE_LIMITS).toEqual({
      maxBytes: 10 * 1024 * 1024,
      maxFilesPerUpload: 10,
      maxPhotosPerOwner: 50,
    })
    expect(IMAGE_ACCEPT).toBe('image/jpeg,image/png,image/webp')
  })

  it('acepta JPEG, PNG y WebP', () => {
    const result = validateImageFiles([
      file('a.jpg', 'image/jpeg'), file('b.png', 'image/png'), file('c.webp', 'image/webp'),
    ])
    expect(result.accepted).toHaveLength(3)
    expect(result.rejected).toEqual([])
  })

  it('rechaza un tipo no admitido diciendo cuál y cuáles se admiten', () => {
    const result = validateImageFiles([file('a.gif', 'image/gif'), file('b.heic', 'image/heic')])
    expect(result.accepted).toEqual([])
    expect(result.rejected).toHaveLength(2)
    expect(result.rejected[0]!.message).toContain('a.gif')
    expect(result.rejected[0]!.message).toContain('JPEG, PNG o WebP')
  })

  it('rechaza un archivo de más de 10 MB con su nombre', () => {
    const result = validateImageFiles([file('grande.jpg', 'image/jpeg', IMAGE_LIMITS.maxBytes + 1)])
    expect(result.rejected[0]!.message).toContain('grande.jpg')
    expect(result.rejected[0]!.message).toContain('10 MB')
  })

  it('acepta exactamente el tamaño máximo', () => {
    expect(validateImageFiles([file('a.jpg', 'image/jpeg', IMAGE_LIMITS.maxBytes)]).accepted).toHaveLength(1)
  })

  it('rechaza lo que pasa de diez por subida', () => {
    const files = Array.from({ length: 12 }, (_, i) => file(`${i}.jpg`, 'image/jpeg'))
    const result = validateImageFiles(files)
    expect(result.accepted).toHaveLength(10)
    expect(result.rejected).toHaveLength(2)
    expect(result.rejected[0]!.message).toContain('10')
  })

  it('respeta el límite de 50 por dueño contando las que ya tiene', () => {
    const files = [file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg'), file('c.jpg', 'image/jpeg')]
    const result = validateImageFiles(files, { existing: 48 })
    expect(result.accepted).toHaveLength(2)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.message).toContain('50')
  })

  it('un archivo sin tipo declarado se decide por su extensión; el servidor manda después', () => {
    expect(validateImageFiles([file('a.jpeg', '')]).accepted).toHaveLength(1)
    expect(validateImageFiles([file('a.txt', '')]).rejected).toHaveLength(1)
  })
})
