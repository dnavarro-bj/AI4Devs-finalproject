# Tasks: cuidados-por-ejemplar

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El esquema y el backend antes que las pantallas.

## 1. Esquema

- [x] 1.1 Escribir los tests del esquema de «Cuidados propios del ejemplar en el esquema»: sin valores propios, un solo valor, humedad y luz fuera de escala, mezcla inexistente, y que los ejemplares existentes siguen heredando. En rojo
- [x] 1.2 Crear `V9__plant_care_overrides.sql`: las ocho columnas nulables de `plant` con sus `CHECK` de escala y la clave foránea de la mezcla

## 2. Dominio

- [x] 2.1 Escribir los tests de la regla de rangos compartida y de `CareOverrides`: coherencia de cada rango, los extremos propios contra los heredados, cotas de escala, un objeto sin valores que se trata como ausente, y la resolución del perfil efectivo con la lista de campos propios. En rojo
- [x] 2.2 Extraer la comprobación de rangos de `Species` a una función única con los mismos mensajes, y comprobar que los tests de `Species` siguen en verde
- [x] 2.3 Implementar `CareOverrides` y `EffectiveCare`, y los cuidados propios de `Plant` con su validación contra la especie en el alta, la edición y el cambio de especie

## 3. API

- [x] 3.1 Escribir los tests de integración de «Cuidados propios del ejemplar»: sobrescribir un valor, la lista de campos propios, sin cuidados propios, no alterar el resto, la pauta de la especie que cambia lo heredado y no pisa lo propio, reemplazo completo, quitar todos y mezcla inexistente. En rojo
- [x] 3.2 Escribir los de «Coherencia del perfil efectivo»: mínimo por encima del máximo heredado, máximo por debajo del mínimo, dos extremos propios coherentes e incoherentes, valores fuera de escala, y que una edición incoherente no cambia ni el apodo. En rojo
- [x] 3.3 Escribir los de «Cambiar la especie conserva los cuidados propios»: herencia a la especie nueva, lo propio se conserva, y valores que no encajan → `400`. En rojo
- [x] 3.4 Ampliar `POST /plants` y `PUT /plants/{id}` con `careOverrides`, el detalle con `careOverrides` y `effectiveCare`, y resolver la mezcla propia como referencia
- [x] 3.5 Suite completa del backend en verde

## 4. Los tipos y los services del frontend

- [x] 4.1 Comprobar con `curl` la forma real de `careOverrides` y `effectiveCare` y los `400` de coherencia
- [x] 4.2 Escribir los tests: `careOverrides` viaja solo cuando hay valores, la edición lo envía siempre que haya propios y lo omite si no, y un `400` sale como valor. En rojo
- [x] 4.3 Ampliar los tipos y el service con `careOverrides`, `effectiveCare` y los campos propios

## 5. El editor de cuidados

- [x] 5.1 Escribir los escenarios del formulario: valor heredado a la vista, solo lo rellenado se envía, desactivar quita los propios, edición prellenada y error del API sin perder lo escrito. En rojo
- [x] 5.2 Sustituir la maqueta del interruptor por el editor de los cinco conceptos con su referencia heredada, y retirar su marca «T-16»
- [x] 5.3 Convertir el contenido del editor en el objeto `careOverrides` y sacar del error del API qué rango falla

## 6. La ficha

- [x] 6.1 Escribir los escenarios de la ficha: lo propio frente a lo heredado con marca de texto y forma, y el aviso de que hereda toda la pauta. En rojo
- [x] 6.2 Mostrar el perfil efectivo en la ficha con la marca de origen de cada valor

## 7. Cierre

- [x] 7.1 Actualizar `docs/diagramas/modelo-datos-actual.md`, el modelo del `README.md` y el borrador de gestión —incluida la decisión de columnas en `plant` en lugar de tabla 1-1—
- [x] 7.2 Marcar T-16 como hecho en su ticket
- [x] 7.3 Suites completas del backend y del frontend en verde, y comprobación de tokens
- [x] 7.4 Contraste final contra `plant-create` y `plant-detail` del prototipo, bloque a bloque, con la lista de lo que se reproduce y lo que sigue marcado con su ticket
