# Tickets de trabajo

Un archivo por ticket, `T-NN-titulo-corto.md`.

## Relación con las historias de usuario

Las [historias](../user-stories/README.md) registran **qué debe poder hacer el usuario**. No definen la forma de trabajar ni el alcance de una entrega, así que la correspondencia con los tickets no es uno a uno:

* Un ticket puede cubrir **varias historias** a la vez, porque el bloque de trabajo real las atraviesa.
* Una historia puede repartirse entre **varios tickets** en fases distintas.
* Hay tickets **sin historia**: los estructurales (armazón, componentes del kit) y los que salen del [documento de producto](../producto/definicion-funcional-y-ux.md) antes de que su historia esté escrita. Cuando es el caso, el ticket lo dice y cita la sección del documento de la que sale.

El ticket es la unidad de trabajo y de change de OpenSpec; la historia es la justificación.

## Orden de trabajo

Tres bloques, en este orden y por este motivo:

1. **Bloque 0 — esqueleto de la web.** La aplicación entera montada sobre el [UI kit](../ui-kit/README.md), con las quince pantallas del [wireframe](../wireframes/README.md) y datos de ejemplo. **El kit tiene prioridad sobre todo el backend**: todo patrón que se pueda sacar a componente genérico y reutilizable se saca aquí, con su test y su muestra en `/ui-kit` ([ADR-014](../adr/ADR-014-sistema-de-diseno-del-frontend.md)). Construir las pantallas es lo que revela lo que al kit le falta; adivinarlo antes sale peor, y descubrirlo después de tener el backend sale más caro todavía.
2. **Bloque 1 — gestión de plantas.** Tener los cactus bien organizados: identidad, ficha, especie, espacio, fotografías, historial y escala. Cada ticket es una rebanada vertical que conecta con datos reales la pantalla que el bloque 0 dejó esqueletada.
3. **Bloque 2 — organización del trabajo.** Tareas, alertas y Dashboard operativo. Depende del bloque 1 y no al revés: una tarea se dirige a plantas y a localizaciones jerárquicas, y al completarse escribe en la cronología del ejemplar.

El modelo de datos de cada bloque está en [docs/diagramas/](../diagramas/README.md).

## MVP — hecho

| ID | Ticket | Área | Historias | Estado |
|----|--------|------|-----------|--------|
| [T-01](T-01-modelo-de-datos-de-plantas-y-lecturas.md) | Modelo de datos de plantas y lecturas | Backend | Soporte | Archivado |
| [T-02](T-02-api-crud-de-plantas.md) | API CRUD de plantas | Backend | [0.1](../user-stories/0.1-registrar-cactus.md), [0.9](../user-stories/0.9-registrar-localizacion.md), [0.10](../user-stories/0.10-etiquetar-cactus-con-tags.md), [0.11](../user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md) | Archivado |
| [T-03](T-03-api-de-lecturas-ambientales.md) | API de lecturas ambientales | Backend | [0.2](../user-stories/0.2-registrar-condiciones-de-cultivo.md) | Archivado |
| [T-04](T-04-servicio-de-recomendaciones-con-ia.md) | Servicio de recomendaciones con IA | Backend | [0.4](../user-stories/0.4-obtener-analisis-de-ia.md) | Archivado |
| [T-08](T-08-api-del-catalogo-de-especies.md) | API del catálogo de especies | Backend | [0.3](../user-stories/0.3-consultar-recomendaciones-por-especie.md), [0.6](../user-stories/0.6-registrar-especie-y-cuidados-recomendados.md) | Archivado |
| [T-05](T-05-dashboard-frontend.md) | Dashboard frontend | Frontend | [0.1](../user-stories/0.1-registrar-cactus.md)–[0.4](../user-stories/0.4-obtener-analisis-de-ia.md) | Archivado |
| [T-09](T-09-ui-kit-del-frontend.md) | UI kit del frontend | Frontend | Soporte | Archivado |

## Bloque 0 — esqueleto de la web

| ID | Ticket | Área |
|----|--------|------|
| [T-10](T-10-armazon-y-navegacion-de-la-aplicacion.md) | Armazón y navegación de la aplicación | Frontend |
| [T-25](T-25-arquitectura-del-frontend.md) | Arquitectura del frontend orientada a features | Frontend |
| [T-11](T-11-kit-de-datos-a-escala.md) | Kit: datos a escala | Frontend (kit) |
| [T-12](T-12-kit-de-cronologia-calendario-y-multimedia.md) | Kit: cronología, calendario y multimedia | Frontend (kit) |
| [T-13](T-13-esqueleto-de-las-pantallas-de-gestion.md) | Esqueleto de las pantallas de gestión — se implementa en dos changes: `esqueleto-plantas` y el de catálogos | Frontend |
| [T-14](T-14-esqueleto-de-las-pantallas-de-trabajo.md) | Esqueleto de las pantallas de trabajo | Frontend |

## Bloque 1 — gestión de plantas

| ID | Ticket | Área |
|----|--------|------|
| [T-15](T-15-codigos-de-inventario.md) | Códigos de inventario de especie y ejemplar | Backend + Frontend |
| [T-26](T-26-api-de-edicion-de-planta.md) | API de edición de planta | Backend |
| [T-16](T-16-ficha-del-ejemplar-ampliada.md) | Ficha del ejemplar ampliada y herencia de cuidados | Backend + Frontend |
| [T-17](T-17-especie-ampliada.md) | Especie ampliada: exposición, entorno, crecimiento y floración | Backend + Frontend |
| [T-18](T-18-localizaciones-jerarquicas.md) | Localizaciones jerárquicas y movimientos | Backend + Frontend |
| [T-19](T-19-fotografias.md) | Fotografías de especies y ejemplares | Backend + Frontend |
| [T-20](T-20-cronologia-unificada.md) | Cronología unificada del ejemplar | Backend + Frontend |
| [T-21](T-21-inventario-a-escala.md) | Inventario a escala: búsqueda, filtros y vistas guardadas | Backend + Frontend |

## Bloque 2 — organización del trabajo

| ID | Ticket | Área |
|----|--------|------|
| [T-22](T-22-tareas.md) | Tareas: creación, agenda y finalización | Backend + Frontend |
| [T-23](T-23-alertas.md) | Alertas con ciclo de vida | Backend + Frontend |
| [T-24](T-24-dashboard-operativo-y-trabajo-por-lote.md) | Dashboard operativo y trabajo por lote | Backend + Frontend |

## Cierre

| ID | Ticket | Área |
|----|--------|------|
| [T-07](T-07-test-e2e-del-flujo-principal.md) | Test E2E del flujo principal | Testing |

Va al final: escrito hoy, contra el MVP, habría que rehacerlo entero.

## Retirados

| ID | Ticket | Motivo |
|----|--------|--------|
| [T-06](T-06-historial-y-alertas.md) | Historial y alertas | Se queda corto frente al documento de producto: el historial pasa a ser una cronología unificada de eventos ([T-20](T-20-cronologia-unificada.md)) y la alerta, una entidad con ciclo de vida propio ([T-23](T-23-alertas.md)). Se conserva el archivo como registro de por dónde iba el MVP |

> Los tickets de las historias fuera de alcance ([docs/user-stories](../user-stories/README.md), serie `F.x`) no se documentan todavía. Ojo: F.1, F.2 y F.3 han dejado de ser roadmap y están repartidas entre los bloques 1 y 2.
