import type { GalleryImage } from '@ui/UiMediaGallery.vue'
import type { MediaPhoto, PhotoSummary, PhotoUrls, TimelinePhoto } from '../types/media.types'

/**
 * De la respuesta del API al `GalleryImage` del kit. Las rutas llegan **relativas** —el servidor no
 * conoce su propia URL pública— y aquí se completan con la base del API (ADR-013).
 */

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function absoluteUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`
}

export function absoluteUrls(base: string, urls: PhotoUrls): PhotoUrls {
  return {
    thumb: absoluteUrl(base, urls.thumb),
    medium: absoluteUrl(base, urls.medium),
    full: absoluteUrl(base, urls.full),
  }
}

/** «14 de agosto de 2026», en UTC: la fecha de una foto es un día, no un instante local. */
export function photoDate(iso: string): string {
  const date = new Date(iso)
  return `${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`
}

/** Las dos fechas de una foto, la de captura cuando existe y siempre la de subida. */
export function photoCaption(photo: Pick<MediaPhoto, 'capturedAt' | 'createdAt'>): string {
  const uploaded = `Subida el ${photoDate(photo.createdAt)}`
  return photo.capturedAt ? `Tomada el ${photoDate(photo.capturedAt)} · ${uploaded}` : uploaded
}

export function toGalleryImage(photo: MediaPhoto, base: string, options: { eventHref?: (eventId: string) => string } = {}): GalleryImage {
  const urls = absoluteUrls(base, photo.urls)
  return {
    id: photo.id,
    src: urls.medium,
    thumbSrc: urls.thumb,
    alt: photo.altText,
    caption: photoCaption(photo),
    primary: photo.primary,
    ...(photo.eventId && options.eventHref
      ? { link: { label: 'Ver el evento de la cronología', to: options.eventHref(photo.eventId) } }
      : {}),
  }
}

/** Una foto de un evento de la cronología, o la portada de una fila. */
export function toThumbImage(photo: PhotoSummary | TimelinePhoto, base: string): GalleryImage {
  const urls = absoluteUrls(base, photo.urls)
  const caption = 'capturedAt' in photo && photo.capturedAt ? `Tomada el ${photoDate(photo.capturedAt)}` : undefined
  return { id: photo.id, src: urls.medium, thumbSrc: urls.thumb, alt: photo.altText, ...(caption ? { caption } : {}) }
}
