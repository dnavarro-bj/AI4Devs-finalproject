# T-29 - Importar, exportar y configuración

**Área:** Backend + Frontend
**Historia relacionada:** [1.19](../user-stories/1.19-importar-y-exportar-datos.md); producto §19 y §20
**Bloque:** 2 — organización del trabajo (administración)

## Descripción

Las pantallas `transfer` (importar / exportar) y `settings` (configuración) del prototipo existen desde T-14 como **maquetas marcadas** y ningún ticket las levantaba: `esqueleto-trabajo` lo dejó escrito y [T-21](T-21-inventario-a-escala.md) solo entregó la exportación **desde el listado** (`/plants/export`, `/species/export`). Este ticket es lo que falta.

## Alcance

* **Importar** plantas y catálogos (especies, localizaciones, mezclas de sustrato, etiquetas) desde CSV, **validando antes de aplicar**: resumen de filas listas, con avisos y con errores, errores por fila sin descartar nada en silencio, descarga de `errores.csv` y plantilla por tipo.
* **Exportar** desde la pantalla de transferencia: contenido a elegir, estimación del tamaño y, más adelante, otros formatos. Reutiliza la convención de [ADR-017](../adr/ADR-017-exportacion-a-csv.md).
* **Actividad reciente** de importaciones y exportaciones: queda pendiente de que haya usuarios a quienes atribuirla.
* **Configuración** por ámbitos del §20: solo lo que tenga sentido cambiar durante el uso normal (intervalo por defecto entre revisiones, umbrales de alertas cuando exista T-23, formato de códigos…).

## Pendiente antes de empezar

Qué opciones de configuración merecen exponerse, si la importación crea y actualiza o solo crea, y qué hacer con el historial de una importación (§24).

## Notas

* Sin migración conocida todavía: depende de si se guarda la actividad.
