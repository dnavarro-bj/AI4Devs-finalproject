# Historias de usuario

Índice completo de historias de usuario del proyecto **Cactify**.

## Convención de numeración

Tres series. **Los números no se reasignan nunca**: tickets, changes archivados y otras historias enlazan por número, y renumerar rompería esos enlaces a cambio de una tabla más ordenada.

* **`0.x`** — Las historias del MVP, ya construido casi por completo. Se mantienen y se han **ampliado** donde el [documento de producto](../producto/definicion-funcional-y-ux.md) las superó.
* **`1.x`** — Las del producto completo, escritas a partir de ese documento.
* **`F.x`** — Roadmap: lo que se documenta para dejar constancia de la visión, pero no se implementa todavía. Tres de ellas (`F.1`, `F.2`, `F.3`) han sido **promovidas al núcleo** y lo indican en su cabecera; conservan su número.

Cada historia dice a qué **bloque** de trabajo pertenece y qué **ticket** la consume. Ver [docs/tickets/](../tickets/README.md) para el orden: bloque 0 (esqueleto de la web), bloque 1 (gestión de plantas), bloque 2 (organización del trabajo).

Una historia puede repartirse entre varios tickets, y un ticket cubrir varias historias. Hay además tickets sin historia: los estructurales.

## Colección y ejemplares

| ID | Historia | Tipo | Bloque |
|----|----------|------|--------|
| [0.1](0.1-registrar-cactus.md) | Registrar un cactus | Must-Have | MVP + bloque 1 |
| [1.1](1.1-asignar-codigos-de-inventario.md) | Asignar códigos estables de inventario | Must-Have | 1 |
| [1.2](1.2-registrar-germinacion-y-procedencia.md) | Registrar germinación y procedencia | Should-Have | 1 |
| [1.3](1.3-estado-y-ciclo-de-vida-de-un-ejemplar.md) | Gestionar el estado y el ciclo de vida de un ejemplar | Must-Have | 1 |
| [0.7](0.7-personalizar-cuidados-de-un-ejemplar.md) | Personalizar los cuidados de un ejemplar | Should-Have | 1 |
| [0.10](0.10-etiquetar-cactus-con-tags.md) | Etiquetar cactus con tags | Must-Have | MVP + bloque 1 |
| [1.8](1.8-galeria-fotografica-de-un-ejemplar.md) | Gestionar la galería fotográfica de un ejemplar | Must-Have | 1 |

## Cuidados e historial

| ID | Historia | Tipo | Bloque |
|----|----------|------|--------|
| [0.2](0.2-registrar-condiciones-de-cultivo.md) | Registrar condiciones de cultivo | Must-Have | MVP + bloque 1 |
| [1.6](1.6-registrar-intervenciones.md) | Registrar intervenciones sobre un ejemplar | Must-Have | 1 |
| [1.4](1.4-comentarios-cronologicos.md) | Añadir comentarios cronológicos | Must-Have | 1 |
| [1.5](1.5-registrar-floraciones-reales.md) | Registrar floraciones reales | Should-Have | 1 |
| [0.5](0.5-consultar-historial-de-cuidados.md) | Consultar la cronología unificada de una planta | Must-Have | 1 |
| [0.4](0.4-obtener-analisis-de-ia.md) | Obtener análisis de IA | Must-Have | MVP |

## Catálogos

| ID | Historia | Tipo | Bloque |
|----|----------|------|--------|
| [0.6](0.6-registrar-especie-y-cuidados-recomendados.md) | Registrar especie y cuidados recomendados | Must-Have | MVP + bloque 1 |
| [0.3](0.3-consultar-recomendaciones-por-especie.md) | Consultar recomendaciones por especie | Must-Have | MVP + bloque 1 |
| [1.7](1.7-fotografias-de-una-especie.md) | Gestionar las fotografías de referencia de una especie | Should-Have | 1 |
| [0.8](0.8-registrar-mezcla-de-tierra.md) | Registrar mezcla de tierra | Must-Have | MVP |

## Espacio

| ID | Historia | Tipo | Bloque |
|----|----------|------|--------|
| [F.1](F.1-organizar-cactus-por-ubicacion-jerarquica.md) | Organizar cactus por localizaciones jerárquicas | Must-Have | 1 — **promovida** |
| [1.9](1.9-mover-plantas-entre-localizaciones.md) | Mover plantas entre localizaciones con trazabilidad | Must-Have | 1 |
| [0.9](0.9-registrar-localizacion.md) | ~~Registrar localización~~ | — | **Fusionada en F.1** |

## Trabajo diario

| ID | Historia | Tipo | Bloque |
|----|----------|------|--------|
| [1.10](1.10-crear-y-programar-una-tarea.md) | Crear y programar una tarea | Must-Have | 2 |
| [1.11](1.11-dirigir-una-tarea-a-varias-plantas.md) | Dirigir una tarea a una planta, a varias o a una localización | Must-Have | 2 |
| [1.12](1.12-agenda-y-calendario-de-tareas.md) | Consultar el trabajo en agenda y calendario | Must-Have | 2 |
| [1.13](1.13-completar-una-tarea.md) | Completar una tarea registrando el cuidado realizado | Must-Have | 2 |
| [1.14](1.14-reprogramar-omitir-o-cancelar-una-tarea.md) | Reprogramar, omitir o cancelar una tarea | Must-Have | 2 |
| [1.15](1.15-gestionar-alertas.md) | Gestionar alertas hasta su resolución | Must-Have | 2 |
| [1.16](1.16-dashboard-operativo.md) | Consultar el Dashboard operativo | Must-Have | 2 |
| [F.2](F.2-registrar-cuidados-por-lote.md) | Registrar cuidados por lote | Must-Have | 2 — **promovida** |
| [F.3](F.3-consultar-cuidados-pendientes.md) | Consultar cuidados pendientes | Must-Have | 2 — **promovida** |

## Escala

| ID | Historia | Tipo | Bloque |
|----|----------|------|--------|
| [0.11](0.11-buscar-cactus-por-tag-o-localizacion.md) | Buscar por código, texto, tag o localización | Must-Have | MVP + bloque 1 |
| [1.17](1.17-vistas-guardadas-del-inventario.md) | Guardar vistas y configurar las columnas del inventario | Should-Have | 1 |
| [1.18](1.18-agrupar-especies-por-caracteristicas.md) | Agrupar especies mediante filtros guardados | Should-Have | 1 |
| [1.19](1.19-importar-y-exportar-datos.md) | Importar y exportar datos | Should-Have | sin asignar |
| [1.20](1.20-etiquetas-fisicas-y-qr.md) | Generar y escanear etiquetas físicas con QR | Should-Have | sin asignar |
| [1.21](1.21-revision-fisica-del-inventario.md) | Realizar una revisión física del inventario | Could-Have | sin asignar |

## Roadmap

No se implementan todavía. Se documentan para dejar constancia de la visión de producto y de por qué algo **no** se hace ahora.

| ID | Historia |
|----|----------|
| [F.4](F.4-carga-automatica-desde-sensor-iot.md) | Carga automática de lecturas desde sensor IoT |
| [F.5](F.5-app-movil-sincronizacion-sensores-bluetooth.md) | App móvil con sincronización de sensores por Bluetooth |
| [F.6](F.6-deteccion-de-estres-por-fotografia.md) | Detección de estrés hídrico por fotografía |
| [F.7](F.7-identificacion-de-especie-por-fotografia.md) | Identificación de especie por fotografía |
| [F.8](F.8-registro-de-cuidados-en-lenguaje-natural.md) | Registro de cuidados en lenguaje natural |
| [F.9](F.9-asistente-de-tareas-diarias.md) | Asistente de tareas diarias |
| [F.10](F.10-automatizacion-fisica-de-riego-y-clima.md) | Automatización física de riego y clima ("Autopilot") |
| [F.11](F.11-aprendizaje-automatico-sobre-la-coleccion.md) | Aprendizaje automático sobre el comportamiento de la colección |
| [F.12](F.12-integracion-con-prevision-meteorologica.md) | Integración con previsión meteorológica |
| [F.13](F.13-gestion-comercial-del-vivero.md) | Gestión comercial del vivero (stock, ventas, facturación) |
| [F.14](F.14-soporte-multiempresa-saas.md) | Soporte multiempresa / modelo SaaS |
