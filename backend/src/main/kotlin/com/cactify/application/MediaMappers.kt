package com.cactify.application

import com.cactify.application.dto.PhotoUrlsResponse
import com.cactify.application.dto.PlantPhotoResponse
import com.cactify.application.dto.PrimaryPhotoResponse
import com.cactify.application.dto.SpeciesPhotoResponse
import com.cactify.application.dto.TimelinePhotoResponse
import com.cactify.domain.PlantMedia
import com.cactify.domain.SpeciesMedia
import com.cactify.domain.repos.PrimaryPhoto

/** Cómo cada fotografía se convierte en su respuesta. Siempre dentro de la transacción que la cargó. */
internal fun SpeciesMedia.toResponse() = SpeciesPhotoResponse(
  id = mediaId.toString(),
  altText = asset.altText,
  width = asset.width,
  height = asset.height,
  contentType = asset.contentType,
  capturedAt = asset.capturedAt,
  createdAt = asset.createdAt,
  urls = PhotoUrlsResponse.of(mediaId.toString()),
  position = position,
  primary = isPrimary,
  credit = credit,
)

internal fun PlantMedia.toResponse() = PlantPhotoResponse(
  id = mediaId.toString(),
  altText = asset.altText,
  width = asset.width,
  height = asset.height,
  contentType = asset.contentType,
  capturedAt = asset.capturedAt,
  createdAt = asset.createdAt,
  urls = PhotoUrlsResponse.of(mediaId.toString()),
  position = position,
  primary = isPrimary,
  purpose = purpose?.value,
  eventId = event?.id?.toString(),
)

internal fun PlantMedia.toTimelinePhoto() = TimelinePhotoResponse(
  id = mediaId.toString(),
  altText = asset.altText,
  width = asset.width,
  height = asset.height,
  capturedAt = asset.capturedAt,
  urls = PhotoUrlsResponse.of(mediaId.toString()),
)

internal fun PrimaryPhoto.toResponse() = PrimaryPhotoResponse(id.toString(), altText, PhotoUrlsResponse.of(id.toString()))
