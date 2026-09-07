# Design: sustratos-como-el-wireframe

## Context

Ver [proposal.md](proposal.md). Las pantallas existen y funcionan desde [`catalogo-sustratos`](../archive/2026-09-07-catalogo-sustratos/design.md); lo que falla es la composición visual frente a `soil-mixes` y `soil-mix-detail` del prototipo.

De lo que se parte: 31 componentes en el kit, `UiProportionBar` entre ellos, con la barra y su leyenda debajo.

## Goals / Non-Goals

**Goals:** que una receta de sustrato se lea de un vistazo, que es lo que el prototipo consigue y la pantalla actual no.

**Non-Goals:** los de la propuesta. En particular **no cambia ningún dato**: los mismos campos, del mismo sitio.

## Decisions

### Dos patrones salen al kit, el resto es CSS de pantalla

`UiProportionWheel` y `UiScale` son componentes con test y muestra en la galería. La portada de la ficha, la rejilla de propiedades y las filas de especies se quedan como CSS de su pantalla.

**El criterio**: sale al kit lo que responde a una pregunta que se repite. «Cómo se reparte un total» y «dónde cae un rango en una escala» se repiten —la temperatura y la humedad de una especie son exactamente el segundo problema—. «Cómo se compone la portada de la ficha de mezcla» es de esta pantalla y de ninguna otra.

**Descartado**: sacar también la portada como `UiHero`. Sería un componente con un hueco por cada cosa que le pusiéramos: no es un patrón, es un layout.

### `UiProportionBar` gana variantes en vez de duplicarse

Dos props: rotular dentro y tamaño compacto.

**Por qué**: es la misma barra respondiendo la misma pregunta, con la etiqueta en otro sitio. Un `UiProportionBarInline` separado obligaría a arreglar dos veces el aviso de suma que no cuadra, que es la parte que de verdad importa.

**Las dos variantes conservan lo esencial**: el valor se lee como texto y el desajuste se señala. Es lo que impide que «compacto» acabe significando «sin la mitad de la información».

### La lectura cualitativa del pH es una función pura

`phQuality(min, max)` vive en la feature, no en el kit, y se prueba sin DOM.

**Por qué**: «ligeramente ácido» es conocimiento de cultivo, no de presentación. Un componente del kit que supiera de pH dejaría de ser genérico. Y como función pura se prueba en los bordes —5,5 / 6,5 / 7,0 / 7,5— que es donde estas escalas fallan.

**Se clasifica por el punto medio del rango**, no por sus extremos: una mezcla de 5,8–6,8 es «ligeramente ácida» aunque su máximo roce el neutro. Clasificar por el mínimo la haría parecer más ácida de lo que es.

### Ningún componente calcula su propio color por dato

Las partes reciben su tono; la barra no decide que «orgánico» es marrón.

**Por qué**: es la misma regla que impide que la cronología conozca los tipos de evento del producto. Un kit que sabe qué es «orgánico» ya no es un kit.

### Lo que el prototipo muestra y el API no sirve se marca, no se rellena

Plantas que usan la mezcla, drenaje, retención, desglose de componentes, notas de preparación y fecha de actualización.

**Por qué**: es el criterio ya establecido en el bloque 0, y aquí la tentación es mayor justamente porque el prototipo enseña unos datos muy convincentes. Una ficha con «Drenaje: muy alto» inventado es indistinguible de una que lo calcula.

## Risks / Trade-offs

* **La ficha queda con bastante hueco marcado** y puede parecer a medias → lo está, y decirlo es más útil que disimularlo. Cada hueco nombra su ticket.
* **`UiScale` nace con un solo consumidor** → se acepta porque su segundo uso es previsible y cercano (los rangos de la especie, T-17); si en dos tickets sigue sola, se replantea.
* **Rotular dentro de la barra falla con tramos muy estrechos** → por debajo de cierto ancho la etiqueta se oculta y queda solo el color, con la cifra en el título accesible; es preferible a un texto recortado a la mitad.

## Migration Plan

Ninguna: no cambia el esquema ni el contrato del API.
