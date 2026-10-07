# ADR-017 - Exportación a CSV

**Estado:** Aceptado
**Fecha:** 2026-10-07
**Origen:** change `buscador-global-y-exportacion` (T-21)

## Contexto

§5.1 y §19 del documento de producto piden sacar de Cactify el resultado de un filtro. Con el lenguaje de filtros y orden de [ADR-016](ADR-016-filtros-y-orden-en-los-listados.md), exportar es **la misma consulta con otro formato**. Pero un CSV plantea decisiones que un listado JSON no: el tamaño (ADR-009 prohíbe la respuesta sin límite), la lectura fuera de paginación con `open-in-view` apagado, lo que Excel espera de un archivo y, sobre todo, que **una celda de texto del usuario puede ejecutarse como fórmula** en la hoja de cálculo de quien lo abre.

La importación y T-24 reutilizarán todo esto.

## Decisión

**Exportar es un `GET` con el sufijo `/export` y los mismos parámetros que el listado** (`/plants/export`, `/species/export`). Se construyen los **mismos criterios** (`PlantCriteria`, `SpeciesCriteria`) y se evalúan con las mismas `Specification` y `SortKeys`, de modo que «mismas filas que el listado» es cierto por construcción. `page` y `size` se ignoran; un criterio inválido es `400` como en el listado; sin `sort`, el orden por defecto del listado.

**Formato.** `text/csv; charset=utf-8` como descarga (`Content-Disposition: attachment`) con nombre `cactify-<recurso>-AAAA-MM-DD.csv`, cuya fecha sale del `Clock` inyectado (ADR-010). RFC 4180: separador `,`, fin de línea CRLF, celdas entrecomilladas si llevan coma, comilla, CR o LF y comillas dobladas. **Marca de orden de bytes UTF-8** al principio, porque Excel no detecta la codificación sin ella y destroza los acentos. Fechas ISO y números sin formato local. **Columnas fijas y completas**, con independencia de las que muestre la tabla: el CSV es para trabajar fuera de Cactify y dos exportaciones del mismo filtro no deben diferir por una preferencia de pantalla.

**Acotación sin truncar.** El resultado se acota por `cactify.export.max-rows` (variable `EXPORT_MAX_ROWS`, 5.000 por defecto). Se **cuenta antes de leer**: si el resultado la supera, `422` con el cuerpo uniforme de errores y un mensaje que dice cuántas filas son y cuál es el máximo; nunca un CSV parcial. Es la misma regla que se pedirá a la importación («sin descartar silenciosamente datos»), al revés.

**Lectura.** Dentro de una transacción de lectura, en bloques de 500 con la `Specification` del listado, resolviendo lo que no cuelga de la fila **por bloque o de una vez** —etiquetas en una consulta, rutas de localización con la consulta recursiva existente—, nunca por fila. El fichero se arma en memoria: con `open-in-view` apagado un `StreamingResponseBody` escribiría con la sesión ya cerrada, y a 5.000 filas la memoria no es un problema. **Subir el máximo muy por encima exigiría revisar esta decisión** (streaming con cursor), no solo la variable.

**Neutralización de fórmulas.** Toda celda de **texto** cuyo primer carácter sea `=`, `+`, `-`, `@`, tabulador o retorno de carro lleva un apóstrofo delante. Los números y las fechas los genera el sistema y no se tocan: una temperatura de `-5` sigue siendo `-5`. En la API del escritor, un `String` es texto; todo lo demás es un valor generado.

**CORS.** El navegador no deja leer `Content-Disposition` en una respuesta de otro origen salvo que el servidor la exponga: sin ello el nombre fechado nunca llega a JavaScript. La configuración CORS de [ADR-013](ADR-013-acceso-del-navegador-al-api.md) expone esa cabecera.

## Alternativas consideradas

* **Un trabajo en segundo plano con descarga posterior.** Necesita estado, almacenamiento y una pantalla de actividad que aún no existen, para un archivo que a esta escala se genera en milisegundos. Descartada.
* **Truncar al máximo y avisar.** El usuario se llevaría un archivo incompleto que parece completo. Descartada: se rechaza con `422`.
* **Escribir con una biblioteca CSV.** Una dependencia más para un formato de veinte líneas cuyo punto delicado —la neutralización de fórmulas— hay que controlar a mano de todos modos.
* **Columnas según la tabla visible.** Exportaciones distintas del mismo filtro sin que nadie lo vea. Descartada.
* **Sin BOM.** El archivo sería UTF-8 correcto y se vería mal en Excel, que es donde se va a abrir.

## Consecuencias

* Exportar una consulta nueva es construir sus criterios y una función de filas; el formato, la acotación y el escape no se reescriben.
* El apóstrofo de la neutralización se ve en las celdas de texto que empiezan por un signo: es el precio de que un apodo no pueda ejecutar nada en la hoja de quien abre el archivo.
* Otras herramientas (el módulo `csv` de Python con `utf-8`) verán el BOM como un carácter invisible en el primer nombre de columna; se lee con `utf-8-sig`.
* El máximo es configuración, no contrato del API; el cliente no lo duplica y muestra el mensaje del `422`.
