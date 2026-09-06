# Tasks: kit-cronologia-y-multimedia

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). Cada bloque es un componente y deja la suite en verde: se puede parar entre bloques sin dejar nada roto.

## 1. `UiTimeline`

- [x] 1.1 Escribir `test/ui-timeline.nuxt.spec.ts` con los cinco escenarios: orden descendente, filtro por tipo que no altera el orden ni pierde eventos al quitarlo, densidades distintas en la misma línea, tipo desconocido con representación de reserva, y cronología vacía. En rojo
- [x] 1.2 Implementar `app/components/ui/UiTimeline.vue` y su entrada, recibiendo eventos con tipo, título, fecha y contenido por slot, **sin conocer los tipos del producto**, hasta que 1.1 pase
- [x] 1.3 Muestra en la galería con cinco tipos de evento distintos y uno desconocido, más el filtro; `test/design-tokens.spec.ts` en verde

## 2. `UiAgendaList`

- [x] 2.1 Escribir `test/ui-agenda-list.nuxt.spec.ts` con los cuatro escenarios, pasando **siempre la fecha de referencia**: reparto por vencimiento con lo vencido primero, grupo vacío que no se muestra, lo vencido distinguido sin depender del color, y agenda vacía. En rojo
- [x] 2.2 Extraer la clasificación por vencimiento a una función pura y testearla aparte: es la lógica, y no debe necesitar el DOM
- [x] 2.3 Implementar `app/components/ui/UiAgendaList.vue` sobre esa función, hasta que 2.1 pase
- [x] 2.4 Muestra en la galería con entradas en los cuatro grupos y una agenda vacía

## 3. `UiCalendarMonth`

- [x] 3.1 Escribir el test de la función pura que reparte un mes en semanas empezando en lunes: un mes que empieza en lunes, otro que empieza en domingo, uno de 28 días y un año bisiesto. En rojo
- [x] 3.2 Implementar esa función con aritmética de fechas nativa, sin librería, hasta que 3.1 pase
- [x] 3.3 Escribir `test/ui-calendar-month.nuxt.spec.ts` con los cinco escenarios: semanas en lunes, días de relleno distinguidos, día con más entradas de las que caben indicando cuántas quedan, cambio de mes y elección de un día. En rojo
- [x] 3.4 Implementar `app/components/ui/UiCalendarMonth.vue`, con el día de referencia marcado, hasta que 3.3 pase
- [x] 3.5 Muestra en la galería con un mes cargado, incluido un día desbordado

## 4. `UiMediaGallery`

- [x] 4.1 Escribir `test/ui-media-gallery.nuxt.spec.ts` con los tres escenarios: ampliar una imagen muestra su texto y ofrece salida, la principal se distingue por texto o forma, y la galería vacía lo explica. En rojo
- [x] 4.2 Implementar `app/components/ui/UiMediaGallery.vue` reutilizando `UiDialog` para la ampliación, hasta que 4.1 pase
- [x] 4.3 Muestra en la galería con varias imágenes, una principal, y una galería vacía

## 5. `UiUploadArea`

- [x] 5.1 Escribir `test/ui-upload-area.nuxt.spec.ts` con los tres escenarios: elegir ficheros los comunica **sin transferir nada**, soltarlos encima los comunica igual, y el control se alcanza y activa con el teclado. En rojo
- [x] 5.2 Implementar `app/components/ui/UiUploadArea.vue` sobre un `input` de fichero accesible, con los tipos admitidos indicados, hasta que 5.1 pase
- [x] 5.3 Muestra en la galería, con el aviso de que la subida real llega en T-19

## 6. `UiFormSection`, `UiMonthRange` y `UiProportionBar`

- [x] 6.1 Escribir `test/ui-form-section.nuxt.spec.ts` con sus dos escenarios: título, descripción y campos; y sin descripción, ningún hueco en el marcado. Implementar hasta verde
- [x] 6.2 Escribir `test/ui-month-range.nuxt.spec.ts` con los tres escenarios, **incluido el periodo que cruza el fin de año**. Implementar tratando el año como un ciclo, hasta verde
- [x] 6.3 Escribir `test/ui-proportion-bar.nuxt.spec.ts` con los tres escenarios: suma que cuadra, suma que no cuadra señalando la desviación, y el valor legible como texto. Implementar hasta verde
- [x] 6.4 Muestras de los tres en la galería, con la mezcla de sustrato como ejemplo de proporciones y la pauta anual como ejemplo de rango

## 7. Cierre

- [x] 7.1 `yarn test` con toda la suite en verde, incluido `test/architecture.spec.ts`: ningún componente nuevo depende de una feature
- [x] 7.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [x] 7.3 **No verificado a ojo.** El servidor sirve `/ui-kit` correctamente (200) pero el Chrome conectado a la sesión no alcanza `localhost` de esta máquina. Queda pendiente de revisión humana: foco en la galería ampliada, el gesto real de arrastrar y soltar —que `happy-dom` no simula con fidelidad— y la legibilidad del calendario con un día lleno
- [x] 7.4 `openspec validate kit-cronologia-y-multimedia --strict` en verde y `CLAUDE.md` al día con el recuento de componentes del kit
