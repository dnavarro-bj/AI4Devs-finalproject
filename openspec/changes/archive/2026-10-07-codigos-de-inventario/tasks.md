# Tasks: codigos-de-inventario

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El esquema y el backend antes que las pantallas. Los tests de integración corren contra PostgreSQL real ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

## 1. Esquema

- [x] 1.1 Escribir los tests del esquema de «Códigos de inventario en el esquema»: código de especie y de ejemplar únicos y obligatorios, formato inválido, contador inferior a 1, y que las especies semilla ya traen código. En rojo
- [x] 1.2 Escribir el test del relleno: especies y plantas insertadas **antes** de `V7` reciben su código, los números siguen el orden de alta y el contador apunta al siguiente. En rojo
- [x] 1.3 Crear `V7__inventory_codes.sql`: columnas nulables, relleno (semilla `grusonii` → `CAT-GRUSS`, el resto por género con desempate numérico, plantas por orden de alta), y solo entonces `NOT NULL`, `UNIQUE` y `CHECK` de formato y de contador

## 2. Dominio

- [x] 2.1 Escribir los tests de `Species` y `Plant`: código con formato inválido o en blanco rechazado, `nextPlantCode()` devuelve el código con dos cifras, crece a tres, incrementa el contador, y `Plant` no ofrece ningún camino para cambiar su código. En rojo
- [x] 2.2 Añadir `code` y `nextSequence` a `Species` (con `update` aceptando el código y revalidándolo) y `code` inmutable a `Plant`; el constructor de `Plant` exige el código ya compuesto

## 3. Código y corrección de la especie

- [x] 3.1 Escribir los tests de integración de «Código de una especie»: indicado y normalizado, alta sin código o en blanco → `400`, ya usado → `409`, formato inválido → `400`, y que viaja en el listado y en la ficha. En rojo
- [x] 3.2 Escribir los de «Corrección del código»: sin ejemplares, con ejemplares → `409`, mismo código con ejemplares → `200`, actualización sin código → `400`, código nuevo ya usado → `409`. En rojo
- [x] 3.3 Escribir los de «Ejemplares de una especie en su ficha»: con ejemplares y a cero. En rojo
- [x] 3.4 Adaptar los tests existentes del catálogo y de plantas, y sus ayudas, para que den de alta las especies **con código**: el contrato cambia a propósito
- [x] 3.5 Añadir `DuplicateSpeciesCodeException` y `SpeciesCodeLockedException` con su traducción a `409` en el manejador global
- [x] 3.6 Implementar el código obligatorio en `SpeciesRequest`, la corrección condicionada a los ejemplares, `SpeciesDetailResponse` con `plantCount` y el `code` en los DTO de resumen y de cuidados
- [x] 3.7 Suite del backend en verde hasta aquí

## 4. Código del ejemplar

- [x] 4.1 Escribir los tests de integración de «Código de inventario de una planta»: primer ejemplar, consecutivos, numeración independiente por especie, más de dos cifras, y que viaja en el alta, el detalle y el listado. En rojo
- [x] 4.2 Escribir los de «El código de un ejemplar es inmutable»: editar apodo y localización, cambiar la especie (y que el siguiente de la antigua no lo reutiliza), y que un código enviado en el cuerpo se ignora. En rojo
- [x] 4.3 Escribir el test de **altas simultáneas** fuera de la transacción de los tests, con datos confirmados y limpieza al terminar: dos hilos, misma especie, códigos distintos y consecutivos. En rojo
- [x] 4.4 Añadir la lectura con bloqueo al puerto `SpeciesRepository` y a su interfaz Spring Data, y asignar el código en `PlantService.create` dentro de la misma transacción
- [x] 4.5 Comprobar que los tests de edición de T-26 siguen en verde y que la edición no toca el código
- [x] 4.6 Suite completa del backend en verde

## 5. Los tipos y los services del frontend

- [x] 5.1 Comprobar con `curl` la forma real de las respuestas con `code` y de la ficha con `plantCount`, y los cuerpos de los `409` y del `400`
- [x] 5.2 Escribir los tests de los services: tipos con `code`, `create` y `update` de especie con código, y los errores `400` y `409` convertidos en valor. En rojo
- [x] 5.3 Añadir `code` a `PlantSummary`, `PlantDetail`, `SpeciesSummary` y `SpeciesCare`, `SpeciesDetail` con `plantCount`, y el código obligatorio en `SpeciesInput`; adaptar los datos de prueba del frontend

## 6. Plantas en el frontend

- [x] 6.1 Escribir los escenarios de «Códigos de inventario a la vista» para plantas: código real en el inventario, en la cabecera y en la edición de solo lectura; vista previa `CAT-GRUSS-··` en el alta al elegir especie. En rojo
- [x] 6.2 Sustituir `mockCode()` en el inventario y `MOCK_CODE` en la ficha y la edición por el código del API, y borrar ambos mocks
- [x] 6.3 Mostrar en el alta el código que llevará la planta, diciendo que el número se asigna al guardar

## 7. Especies en el frontend

- [x] 7.1 Escribir los escenarios de especies: código real en el catálogo y en la ficha, código obligatorio señalado sin enviar nada, campo deshabilitado con ejemplares y su explicación, `409` junto al campo sin perder lo escrito, recuento real en la ficha. En rojo
- [x] 7.2 Añadir el campo Código, obligatorio, a `SpeciesForm`, con el bloqueo, el ejemplo de formato en su ayuda y el error en línea
- [x] 7.3 Mostrar el código real y el recuento de la ficha, y **re-marcar con T-21** lo que sigue siendo maqueta: el recuento por fila del catálogo, la lista de ejemplares de la especie y los ejemplos de cada etiqueta
- [x] 7.5 Proponer el código en el formulario de alta mientras se escribe el nombre científico, sin pisar un código escrito a mano ni tocarlo en la edición
- [x] 7.4 Corregir las referencias a T-15 que ya no son verdad: el texto de la configuración de códigos y la opción de etiquetas físicas de importar/exportar

## 8. Cierre

- [x] 8.1 Actualizar `docs/diagramas/modelo-datos-actual.md` y el modelo del `README.md` con las columnas nuevas, y pasar los códigos de «pendiente» a hecho en el borrador de gestión
- [x] 8.2 Anotar en `docs/tickets/T-15-codigos-de-inventario.md` que se parte en dos changes, que el código de especie es obligatorio y cuál queda pendiente
- [x] 8.3 Suites completas del backend y del frontend en verde, y comprobación de tokens
- [x] 8.4 Contraste final contra las pantallas del prototipo —`plants`, `plant-detail`, `plant-create`, `species`, `species-detail`, `species-editor`—, bloque a bloque, con la lista de lo que se reproduce y lo que sigue marcado con su ticket
