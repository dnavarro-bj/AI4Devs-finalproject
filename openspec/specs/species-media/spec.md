# species-media Specification

## Purpose
TBD - created by archiving change fotografias. Update Purpose after archive.

## Requirements

### Requirement: Galería de referencia de una especie

Una especie SHALL admitir una **galería de fotografías de referencia** con `POST /species/{id}/photos` (la subida de la capability `media`) y `GET /species/{id}/photos`, **paginado** (ADR-009) y ordenado por su **orden manual**. Cada fotografía SHALL tener **texto alternativo obligatorio**, orden, **autoría o procedencia opcional**, fecha de captura opcional y fecha de subida. Si la subida no trae `altText`, el servidor SHALL poner uno por defecto con el nombre de la especie, que se puede corregir. Las fotografías de una especie NO SHALL mezclarse con las de ningún ejemplar. Una especie inexistente SHALL responder `404`. Una especie con **50 fotografías** NO SHALL admitir más (`409`).

#### Scenario: La primera fotografía es la principal

- **WHEN** se sube la primera fotografía de una especie
- **THEN** queda marcada como principal

#### Scenario: Texto alternativo por defecto

- **WHEN** se sube una fotografía sin `altText`
- **THEN** la entrada trae un texto alternativo con el nombre de la especie

#### Scenario: Texto alternativo propio y autoría

- **WHEN** se sube una fotografía con `altText` «Flor amarilla de mayo» y `credit` «Colección propia»
- **THEN** la entrada los trae

#### Scenario: Listar la galería

- **WHEN** se consulta `GET /species/{id}/photos`
- **THEN** la respuesta es una página con el envelope `PageResponse`, en el orden manual, y las fotografías de ningún ejemplar aparecen

#### Scenario: Especie inexistente

- **WHEN** se sube o se consulta la galería de una especie que no existe
- **THEN** la respuesta es `404`

#### Scenario: Límite por especie

- **WHEN** una especie ya tiene 50 fotografías y se sube otra
- **THEN** la respuesta es `409` y no se guarda nada

### Requirement: Corregir, elegir portada, reordenar y borrar en la especie

`PUT /species/{id}/photos/{mediaId}` SHALL corregir el texto alternativo (no en blanco), la autoría y la fecha de captura, y SHALL permitir `primary: true` para **elegir la portada**: la anterior deja de serlo en la misma transacción y **una especie tiene como mucho una principal**, defendido por un índice único parcial. `primary: false` SHALL responder `400`: una galería con fotografías siempre tiene portada. `PUT /species/{id}/photos/order` SHALL recibir **todos** los identificadores de la galería en su nuevo orden y responder `400` si falta o sobra alguno. `DELETE …/{mediaId}` SHALL borrar la fotografía (capability `media`); si era la **principal**, **la siguiente por orden** pasa a serlo. Una fotografía de otra especie SHALL responder `404`.

#### Scenario: Elegir la portada

- **WHEN** se marca como principal una fotografía distinta de la actual
- **THEN** la nueva es la única principal y la anterior ya no lo es

#### Scenario: No se puede quitar la portada sin sustituta

- **WHEN** se envía `primary: false`
- **THEN** la respuesta es `400` y nada cambia

#### Scenario: Reordenar

- **WHEN** se envía el orden `[c, a, b]` con las tres fotografías de la galería
- **THEN** el listado sale en ese orden

#### Scenario: Orden incompleto

- **WHEN** el orden enviado omite una fotografía o trae una ajena
- **THEN** la respuesta es `400` y el orden no cambia

#### Scenario: Borrar la portada

- **WHEN** se borra la fotografía principal de una galería de tres
- **THEN** la que seguía en el orden pasa a ser la principal

#### Scenario: Borrar la última

- **WHEN** se borra la única fotografía
- **THEN** la galería queda vacía y la especie no tiene principal

#### Scenario: Texto alternativo en blanco

- **WHEN** se corrige una fotografía con un texto alternativo vacío
- **THEN** la respuesta es `400` y conserva el que tenía

#### Scenario: Fotografía de otra especie

- **WHEN** se corrige o se borra por la URL de una especie una fotografía de otra
- **THEN** la respuesta es `404` y no cambia
