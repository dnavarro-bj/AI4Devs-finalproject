# ADR-015 - Arquitectura del frontend orientada a features

**Estado:** Aceptado
**Fecha:** 2026-09-06
**Enmendado:** 2026-09-06 — ver [Enmienda (T-10)](#enmienda-t-10-2026-09-06-direcciones-de-la-aplicación)
**Origen:** T-25 (`arquitectura-frontend`), al terminar el armazón de T-10 y antes de construir las pantallas del bloque 0

## Contexto

El backend tiene su disciplina escrita desde T-01: [ADR-006](ADR-006-aislamiento-del-dominio.md) fija las capas `web → application → domain`, prohíbe que un controller inyecte un repositorio y obliga a que los servicios devuelvan DTOs. Está en verde y nadie la rompe porque está enunciada.

El frontend no tiene equivalente. Creció por acumulación —[T-05](../tickets/T-05-dashboard-frontend.md) las pantallas, [T-09](../tickets/T-09-ui-kit-del-frontend.md) el kit, [T-10](../tickets/T-10-armazon-y-navegacion-de-la-aplicacion.md) el armazón— y está organizado **por tipo de fichero**, no por dominio:

```
app/composables/   useApi, usePlants, useCareRecords, useCatalogs, useRecommendation
app/utils/         apiClient.ts       ← el HTTP
app/types/         api.ts             ← los DTOs de todo el API, en un fichero
app/stores/        plants.ts
app/components/    CareRecordForm, RecommendationPanel, SpeciesRanges + ui/
```

Dos problemas concretos, no estéticos:

1. **No hay capa de servicio.** `usePlants` llama al API *y* escribe en el store en la misma función. Es lo mismo que un controller de Spring inyectando el repositorio, que es exactamente lo que ADR-006 prohíbe al otro lado.
2. **Lo que cambia junto no vive junto.** Tocar «lecturas de cultivo» obliga a abrir `composables/`, `types/` y `components/`, y a leer código de otros dominios por el camino. Con 14 ficheros se aguanta; el bloque 1 añade siete tickets de pantallas.

El momento es este: el frontend nunca va a ser más pequeño que hoy, y T-13 y T-14 están a punto de añadir doce pantallas.

Existe además una referencia viva del patrón en otro proyecto de la casa (Nuxt 4, `src/features/` + `src/shared/`, `ServiceResponse`, aliases), ya rodada en producción. Se adopta esa forma en lugar de inventar una.

## Decisión

El frontend se organiza **por features**, con capas de orden estricto y errores como valor.

### Capas

```
Component → Composable → Service → HTTP
                ↘ Store (solo si es cross-feature)
```

Cada capa tiene una responsabilidad y una prohibición:

* **Service** (`services/`) — habla con el API: construye la petición, parsea la respuesta, mapea el DTO y normaliza el error. **Nunca** tiene estado de UI, ni `loading`, ni toca el store.
* **Composable** (`composables/`) — el caso de uso de la pantalla: estado de la feature, `loading` y `error`, orquestación de uno o varios services, lógica de formulario. **Nunca** hace HTTP directo.
* **Store** (`store/`) — solo existe si el estado es **global entre features**. Es caché reactiva, no lógica de negocio.
* **Componente** — presentación. **Nunca** llama al API ni lee el store.

Árbol de decisión de dónde poner algo:

* ¿Lo usa una sola feature? → composable.
* ¿Lo usan varias? → store en `shared/`.
* ¿Es comunicación con el backend? → service.

### Estructura

```
frontend/
├── app/                        Lo que Nuxt resuelve por convención
│   ├── assets/css/             tokens.css y base.css (ADR-014)
│   ├── components/ui/          El UI kit — no se mueve (ADR-014)
│   ├── layouts/  pages/        Armazón y rutas
│   └── app.vue  error.vue
└── src/
    ├── features/<dominio>/
    │   ├── components/         Componentes de ese dominio
    │   ├── composables/
    │   ├── services/
    │   ├── dto/                Lo que viaja por el cable
    │   ├── types/              El modelo de dominio de la pantalla
    │   ├── mappers/            Solo si DTO y modelo difieren de verdad
    │   └── store/              Solo si se justifica
    └── shared/
        ├── services/           httpClient, errorNormalizer
        ├── composables/        useBreadcrumbs, useToast
        ├── types/              api.types (ServiceResponse, PageResponse)
        ├── mocks/              Datos de ejemplo, con su bandera
        └── utils/
```

Aliases: `@features`, `@shared`, `@ui`.

Las páginas y layouts se quedan en `app/`: son convención de Nuxt y moverlas es pelear con el framework para no ganar nada.

### Los errores viajan como valor

Un service devuelve siempre un `ServiceResponse<T>`:

```typescript
{ success: boolean, data: T | null, error: DomainError | null }
```

y nunca lanza. El fallo queda **en la firma**, de modo que el composable no puede olvidarlo: no hay `try/catch` que falte, hay un `if (!result.success)` que el tipo obliga a mirar.

`ApiError` no desaparece: sigue siendo lo que lanza el cliente HTTP, y el service es quien lo captura y lo convierte en `DomainError` con un código. Es el mismo reparto que en el backend, donde la excepción de una integración la traduce el manejador global a un `502`.

### El modelo de la pantalla no es el DTO

DTO → modelo de dominio → lo que pinta el componente. Un DTO nunca llega a un componente.

**Los mappers se escriben donde la forma cambia, no por ritual.** El API de Cactify ya está bien diseñado —ids como cadena decimal ([ADR-008](ADR-008-identificadores-tipados.md)), `PageResponse` uniforme ([ADR-009](ADR-009-paginacion-obligatoria.md)), cuerpo de error uniforme—, así que en muchos casos el modelo coincide con el DTO y el mapper sería una copia campo a campo. Cuando coincide, se reexporta el tipo y no se escribe mapper.

### Los datos de ejemplo entran por el service

Las pantallas del bloque 0 se construyen sin backend. Esos datos viven en `shared/mocks/` tras una bandera, **los consume el service** y nunca un componente. Así conectar una pantalla al API real es cambiar la bandera y borrar el mock, no reescribir la pantalla.

### Nomenclatura

```
services/      plants.api.service.ts
composables/   usePlantsList.ts
store/         plants.store.ts
dto/           plant.response.dto.ts   plant.request.dto.ts
mappers/       plant.mapper.ts
types/         plant.types.ts
```

Los DTOs van en `camelCase`, como los sirve el API.

## Alternativas consideradas

* **Dejarlo por tipo de fichero y solo separar el HTTP.** Arregla el problema 1 y no el 2. Es la mitad del trabajo por menos de la mitad del beneficio, y habría que volver a tocarlo todo cuando el problema 2 duela.
* **Migrar solo lo nuevo y dejar lo viejo donde está.** Más barato hoy, pero deja dos organizaciones conviviendo durante todo el bloque 1, que es cuando más código se escribe. Quien llegue nuevo tendría que aprender las dos y adivinar cuál aplica.
* **Errores como excepción, con `ApiError` hasta el composable.** Cero reescritura, pero el error no aparece en ninguna firma: se olvida un `try/catch` y la pantalla se queda cargando para siempre. Ya pasó en T-05 y se arregló a mano en cada pantalla.
* **Mappers siempre, sin excepción.** Es lo que hace la referencia. Aquí produciría una docena de funciones que copian campo a campo, y el ruido acabaría escondiendo los mappers que sí hacen algo.
* **Adoptar la referencia entera**, con Tailwind, i18n por feature, moneda en centavos y multi-tenant. Se descarta lo que no aplica: el sistema de diseño es propio y funciona ([ADR-014](ADR-014-sistema-de-diseno-del-frontend.md)), la aplicación es solo en español, no hay dinero y no hay multi-empresa.

## Consecuencias

* **Un cambio funcional toca una carpeta.** Añadir un campo a la lectura de cultivo se hace dentro de `features/care-records/`, sin abrir código de otros dominios.
* **El límite es verificable, no un acuerdo.** Un test puede comprobar que ningún componente importa un service y que ningún service importa el store, igual que `design-tokens.spec.ts` vigila ADR-014.
* **Los tests se mueven junto a su feature**, siguiendo la referencia: `plants.api.service.test.ts` al lado del service. Los tests de las pantallas y del kit se quedan donde están.
* **Coste de entrada:** se reescriben los cinco composables, el store y el cliente HTTP, y sus tests. Es la deuda de haber crecido sin la regla escrita, y se paga una vez.
* **Hay más ficheros por feature.** Un dominio pequeño puede tener service, composable y types donde antes tenía un composable. Se acepta: es el mismo precio que ADR-006 paga en el backend, y por el mismo motivo.
* **Condiciona todos los tickets del frontend** desde el bloque 0 en adelante, no solo el que introduce la estructura.
* [ADR-014](ADR-014-sistema-de-diseno-del-frontend.md) **no se toca**: el kit sigue en `app/components/ui/`, con sus tokens, su elemento raíz único y su galería viva. Este ADR gobierna dónde vive la lógica; aquel, cómo se ve.
* **`app/fixtures/search.ts`**, que T-10 creó como excepción, pasa a ser un caso normal de `shared/mocks/`.

## Enmienda (T-10, 2026-09-06): direcciones de la aplicación

Promocionada desde el design de `armazon-navegacion`, ya archivado. La decisión gobierna cada pantalla que se cree a partir de aquí, así que no puede vivir solo en un design muerto.

### Contexto

Al declarar las quince rutas del wireframe había que elegir idioma, y no existía convención: convivían `/plants` y `/plants/nueva`, en inglés y en español, por acumulación y no por decisión.

### Decisión

**Todas las direcciones de la aplicación van en inglés**, recursos y acciones: `/plants`, `/plants/new`, `/species/[id]`, `/soil-mixes`, `/import-export`, `/settings`. Se renombró `/plants/nueva` a `/plants/new` al tomarla.

El **mapa de secciones vive en `app/navigation.ts`**, que es el único sitio donde se declara qué secciones existen, cómo se agrupan y en qué dirección viven. Añadir una sección es una línea ahí más su página; nadie escribe la navegación a mano en el layout. Los encabezados de agrupación agrupan y **no navegan**.

La galería del kit (`/ui-kit`) no figura en ese mapa: es superficie de desarrollo, no sección de producto ([ADR-014](ADR-014-sistema-de-diseno-del-frontend.md)).

### Alternativas consideradas

* **Recursos en inglés y acciones en español**, que es lo que había. No rompe nada, pero convierte en norma una mezcla que era un accidente, y obliga a decidir caso por caso en cada ruta nueva.
* **Todo en español**, acompañando a la interfaz, que sí está en español porque el usuario es un viverista hispanohablante. Se descarta porque el proyecto ya separa idioma de documentación de idioma de código —español el primero, inglés el segundo— y una URL es un identificador, no texto de interfaz. Habría obligado además a renombrar `/plants` y `/species`, ya en uso.
* **Mantener las dos formas y no decidir.** Es lo que estaba pasando; doce rutas nuevas lo habrían fijado para siempre.

### Consecuencias

* El renombrado fue un cambio observable, asumido porque la aplicación no tiene usuarios ni enlaces externos: hoy era barato y después no. No se dejó redirección de la ruta antigua — no hay nada a lo que dar continuidad y sería una redirección viva para siempre por un caso que no existe.
* Las direcciones quedan en inglés mientras la interfaz sigue en español. Es deliberado y conviene no "corregirlo" por coherencia aparente.
* `test/navigation-map.spec.ts` vigila el mapa: que estén las cuatro agrupaciones, que ninguna entrada repita dirección y que la galería no figure como producto. `test/pending-section.nuxt.spec.ts` comprueba que toda dirección declarada tiene su página.
