# Tasks: sustratos-como-el-wireframe

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El kit antes que las pantallas: construirlas es lo que reveló lo que le faltaba, pero arreglarlo va primero.

## 1. La barra de proporciones gana sus variantes

- [x] 1.1 Escribir los escenarios nuevos de «Barra de proporciones»: rotulado interior y tamaño compacto, comprobando que **ninguno pierde** el valor legible ni el aviso de desajuste. En rojo
- [x] 1.2 Ampliar `UiProportionBar` con las dos variantes y el tono por parte, sin duplicar el componente
- [x] 1.3 Comprobar que sus tests anteriores siguen en verde sin tocarlos

## 2. La rueda de proporción

- [x] 2.1 Escribir los escenarios de «Rueda de proporción»: reparto de dos partes, descripción accesible que enuncia las proporciones, y tres o más partes. En rojo
- [x] 2.2 Crear `UiProportionWheel`, con **un solo elemento raíz** y sin declarar ningún color literal ([ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md))

## 3. La escala con rango

- [x] 3.1 Escribir los escenarios de «Escala con rango»: rango dentro de la escala, rango de un solo punto que **no desaparece**, y rango que se sale y se recorta. En rojo
- [x] 3.2 Crear `UiScale`, recibiendo los límites por prop: un componente que supiera de pH dejaría de ser genérico

## 4. La lectura cualitativa del pH

- [x] 4.1 Escribir el test de `phQuality` en los bordes de la escala —ácido, ligeramente ácido, neutro, alcalino—, sin DOM. En rojo
- [x] 4.2 Implementarla en la feature, clasificando por el **punto medio** del rango y no por sus extremos

## 5. El catálogo

- [x] 5.1 Escribir los escenarios nuevos de «Catálogo de mezclas»: composición como proporción con sus dos cifras, y pH con su lectura cualitativa. En rojo
- [x] 5.2 Recomponer `app/pages/soil-mixes/index.vue` siguiendo `soil-mixes` del prototipo, con la barra compacta en su celda y el pie de totales
- [x] 5.3 Comprobar que los escenarios anteriores del catálogo siguen en verde sin tocarlos

## 6. La ficha

- [x] 6.1 Escribir los escenarios nuevos de «Ficha de una mezcla»: composición como figura, pH sobre su escala, y cada sección pendiente **marcada con su ticket**. En rojo
- [x] 6.2 Recomponer `app/pages/soil-mixes/[id]/index.vue` siguiendo `soil-mix-detail`: portada con la rueda, columna principal con receta, propiedades y especies, y lateral con ficha, impacto y preparación
- [x] 6.3 Comprobar que la retirada y sus escenarios siguen en verde sin tocarlos

## 7. La galería

- [x] 7.1 Añadir a `/ui-kit` la muestra de los dos componentes nuevos y de las dos variantes de la barra
- [x] 7.2 Comprobar que la galería sigue montando y que `design-tokens.spec.ts` está en verde: ningún color, radio ni tamaño literal

## 8. Cierre

- [x] 8.1 `yarn test` con toda la suite en verde, incluido `architecture.spec.ts`
- [x] 8.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [x] 8.3 Ver las dos pantallas con la pila levantada y compararlas con el prototipo abierto al lado

  **No se pudo verificar visualmente:** el Chrome conectado a la sesión no alcanza el `localhost` de esta máquina —la pestaña queda en página de error—, como ya ocurrió en los changes anteriores. En su lugar se volcó el texto renderizado de la ficha y se comprobó contra el prototipo sección por sección: portada con la rueda y el estado, receta rotulada por dentro, pH sobre su escala con su lectura, uso, ficha lateral, impacto y preparación. **Queda pendiente de una mirada humana**, que es lo único que valida de verdad un cambio de diseño.
- [x] 8.4 `openspec validate sustratos-como-el-wireframe --strict` en verde y `CLAUDE.md` al día con los 33 componentes
