import { describe, expect, it } from 'vitest'
import { absoluteUrl, photoCaption, toGalleryImage, toThumbImage } from './media.mapper'
import type { MediaPhoto } from '../types/media.types'

const photo: MediaPhoto = {
  id: '5', altText: 'Ápice con espinas nuevas', width: 4000, height: 3000, contentType: 'image/jpeg',
  capturedAt: '2026-08-14T00:00:00Z', createdAt: '2026-09-01T10:00:00Z', position: 0, primary: true,
  urls: { thumb: '/media/5/thumb', medium: '/media/5/medium', full: '/media/5/full' },
  purpose: 'detalle', eventId: null,
}

describe('mapper de fotografías', () => {
  it('completa la ruta relativa con la base del API, sin duplicar barras', () => {
    expect(absoluteUrl('http://api.test/', '/media/5/thumb')).toBe('http://api.test/media/5/thumb')
  })

  it('convierte la respuesta en la imagen de la galería: miniatura para la rejilla, mediana para ampliar', () => {
    const image = toGalleryImage(photo, 'http://api.test')
    expect(image).toMatchObject({
      id: '5',
      alt: 'Ápice con espinas nuevas',
      src: 'http://api.test/media/5/medium',
      thumbSrc: 'http://api.test/media/5/thumb',
      primary: true,
    })
  })

  it('el pie dice la fecha de captura y la de subida', () => {
    expect(photoCaption(photo)).toBe('Tomada el 14 de agosto de 2026 · Subida el 1 de septiembre de 2026')
  })

  it('sin fecha de captura solo dice la de subida', () => {
    expect(photoCaption({ capturedAt: null, createdAt: '2026-09-01T10:00:00Z' })).toBe('Subida el 1 de septiembre de 2026')
  })

  it('enlaza al evento cuando la foto cuelga de uno', () => {
    const image = toGalleryImage({ ...photo, eventId: '77' }, 'http://api.test', { eventHref: (id) => `#event-${id}` })
    expect(image.link).toEqual({ label: 'Ver el evento de la cronología', to: '#event-77' })
  })

  it('sin evento no hay enlace', () => {
    expect(toGalleryImage(photo, 'http://api.test', { eventHref: (id) => `#event-${id}` }).link).toBeUndefined()
  })

  it('una foto de la cronología o una portada también salen con ruta completa', () => {
    const image = toThumbImage({ id: '9', altText: 'Flor', urls: photo.urls }, 'http://api.test')
    expect(image.thumbSrc).toBe('http://api.test/media/5/thumb')
  })
})
