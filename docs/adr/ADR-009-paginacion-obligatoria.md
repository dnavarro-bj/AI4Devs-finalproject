# ADR-009 - Paginación obligatoria en los endpoints de índice

**Estado:** Aceptado
**Fecha:** 2026-09-01
**Origen:** change `api-crud-plantas` (T-02), decisión 9 del design

## Contexto

T-02 abre los primeros endpoints de listado del proyecto: el inventario de plantas y los catálogos de localizaciones y tags. En el MVP los volúmenes son pequeños —un vivero con unas decenas de plantas— y ninguno de ellos *necesita* paginar todavía.

El problema es que un listado sin límite es una consulta cuyo coste lo decide el dato y no el contrato: crece con la colección, sin techo y sin que nadie lo note hasta que duele. Y quitarlo después no es una optimización, es un cambio incompatible para todo cliente ya escrito. T-03 (lecturas de cultivo) y T-05 (dashboard) heredan el patrón que se fije aquí.

## Decisión

**Ningún endpoint de índice devuelve una colección sin límite.** Todo listado se sirve paginado, desde el primero y aunque su colección sea diminuta.

* **Entrada**: el controller recibe un `Pageable` resuelto por Spring (`?page=`, `?size=`), con **`@SortDefault`** fijando un orden estable —`createdAt` en el inventario, `name` en los catálogos—. Sin orden explícito, dos páginas consecutivas pueden repetir u omitir filas. El orden va en `@SortDefault` y **no** en `@PageableDefault`, porque este último fija también el tamaño de página y taparía el valor configurado.
* **Salida**: un envelope propio `PageResponse<T>` en `application/dto`, con `content`, `totalElements`, `totalPages`, `pageNumber` y `pageSize`. Se define propio en lugar de serializar el `Page` de Spring: la serialización de `PageImpl` no tiene contrato estable entre versiones y Spring Boot 3 avisa de ello.
* **Límites configurables**, con las propiedades nativas de Spring y sobreescribibles por variable de entorno también desde `iac/local`:

  ```yaml
  spring:
    data:
      web:
        pageable:
          default-page-size: ${PAGE_SIZE_DEFAULT:25}
          max-page-size: ${PAGE_SIZE_MAX:500}
  ```

* **Tamaño por encima del máximo**: se **recorta** al máximo configurado en lugar de rechazar la petición, y la respuesta declara en `pageSize` el tamaño realmente aplicado. El cliente nunca recibe más de lo que el servidor admite y se entera por el propio envelope.
* **La regla llega hasta los puertos**: los repositorios de `domain` declaran `findAll(pageable)` o `findAll(spec, pageable)` y **no exponen el `findAll()` sin paginar** que `JpaRepository` traería de serie. Lo que no existe en el puerto no se puede llamar por descuido desde un servicio.

`Page`, `Pageable` y `Specification` son tipos de Spring Data admitidos en `domain` por la enmienda de [ADR-006](ADR-006-aislamiento-del-dominio.md).

## Alternativas consideradas

* **Devolver la colección completa mientras el volumen sea pequeño y paginar cuando haga falta**: más simple hoy, pero convierte la paginación en un cambio incompatible para el frontend justo cuando ya hay prisa por rendimiento.
* **Serializar directamente el `Page` de Spring**: cero código, pero expone una forma que Spring no garantiza entre versiones y que además arrastra campos internos (`pageable`, `sort`, `first`, `last`) que nadie del contrato necesita.
* **Responder `400` a un `size` por encima del máximo**: más explícito, pero obliga al frontend a conocer el límite del servidor de antemano para no romperse.
* **Paginación por cursor**: más robusta frente a inserciones concurrentes durante el recorrido, y el TSID daría el cursor natural; a cambio no permite saltar a una página concreta ni mostrar el total. Queda como evolución posible: añadir un cursor no rompe el envelope actual.
* **Tamaños fijos en el código**: un valor menos que configurar, pero deja de poder ajustarse por entorno sin recompilar.

## Consecuencias

* El contrato de todos los listados es el mismo objeto, así que el frontend escribe una sola vez el código que lo consume.
* El coste de cualquier listado tiene techo y el techo es configuración, no despliegue.
* Los listados exigen un orden explícito; olvidarlo es un bug de paginación silencioso, y por eso el orden por defecto va en el controller y no se deja a la base de datos.
* `totalElements` obliga a Spring Data a lanzar una consulta de recuento además de la del contenido. Es el precio de poder decir cuántas páginas hay, y condiciona cómo se escriben las `Specification` (un `fetch` sin guardar rompe esa consulta de recuento).
* Un cliente que quiera "todo" ha de recorrer páginas; en el MVP, con `PAGE_SIZE_MAX=500`, cabe de sobra en una.
