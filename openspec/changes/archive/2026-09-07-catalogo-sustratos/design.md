# Design: catalogo-sustratos

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/soil-mix-catalog/spec.md).

De lo que se parte:

* `SoilMix` existe desde T-01 con **todas sus invariantes en el `init`**: nombre no vacío, porcentajes entre 0 y 100 que suman 100, pH en escala 0–14 y mínimo que no supera al máximo ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)).
* La tabla `soil_mix` está en `V1__schema.sql` con los `CHECK` equivalentes ([ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)).
* `SoilMixRepository` es un puerto de solo lectura por id, y su comentario dice explícitamente que el catálogo no tiene endpoints.
* `Species` referencia una mezcla **obligatoria**, con clave foránea.
* `species-catalog` resolvió el mismo problema —CRUD con `409` al retirar algo en uso— y es el patrón a seguir.

## Goals / Non-Goals

**Goals:**

* Cumplir la historia 0.8, que lleva desde el MVP marcada como en alcance y sin construir.
* Que dar de alta una especie deje de estar limitado a las tres mezclas de los datos semilla.

**Non-Goals:** los de la propuesta. A nivel de diseño: **no se toca el esquema** y no se añade ningún componente al kit.

## Decisions

### El puerto crece, no se sustituye

`SoilMixRepository` gana `save`, `findAll(pageable)`, `delete` y `countSpeciesUsing(id)`; `findOneById` se queda como está. Se implementa con la misma interfaz `JpaSoilMixRepository` de siempre, sin clase adaptadora ([ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) enmendado).

**Por qué**: el comentario del puerto explica que era mínimo *a propósito*, porque el catálogo no existía. Ahora existe, así que el puerto deja de ser mínimo y el comentario se corrige. Crear un segundo puerto para escribir partiría el mismo concepto en dos.

### La comprobación de uso se hace antes, no se captura después

Retirar consulta si alguna especie recomienda la mezcla y responde `409` **antes** de intentar el borrado, en lugar de dejar saltar la violación de clave foránea y traducirla.

**Por qué**: es la misma decisión que tomó `species-catalog` al retirar una especie con ejemplares. Traducir una `DataIntegrityViolationException` obliga a reconocer la restricción por su nombre, que es acoplarse al esquema desde `application`. Y el `CHECK` de base de datos sigue ahí como red ([ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)): la regla se comprueba dos veces a propósito.

**Consecuencia asumida**: entre la comprobación y el borrado cabe una carrera —alguien asocia la mezcla a una especie justo en medio—. Si ocurre, salta la clave foránea y el manejador global responde `500`. Se acepta porque el catálogo lo administra una sola persona y la alternativa —bloquear filas de especie al retirar una mezcla— es cara para un caso que no se da. Queda anotado.

### La ficha de una especie devuelve su mezcla

`SpeciesCareResponse` gana la mezcla, con identificador y nombre.

**Por qué**: `SpeciesRequest` la exige y el `PUT` es **reemplazo completo**, así que sin ella la ficha no basta para reconstruir la especie: corregir el nombre común obligaría a adivinar la mezcla, y adivinarla es cambiarla. Es la regla de que lo que se puede escribir se tiene que poder leer.

**Con identificador y no solo con nombre**: el nombre sirve para pintar, el identificador para volver a enviar. Dejar solo el nombre obligaría al cliente a buscarlo en el catálogo por texto, que es exactamente el acoplamiento que los identificadores tipados evitan ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)).

**No contradice a T-08, la completa.** Su decisión 3 dejó la mezcla fuera *a propósito*, con dos motivos: nadie la consumía, y resolver el `@ManyToOne(LAZY)` por fila sería un `N+1`. El primero acaba de caducar —el editor la necesita— y el segundo no aplica: `SpeciesCareResponse` solo aparece en `GET /species/{id}` y anidado en `GET /plants/{id}`, ambos de una sola entidad; los listados usan `SpeciesSummaryResponse`, que no la lleva. La propia decisión 3 lo dejó escrito: *«cuando exista el catálogo de mezclas se añadirá entonces, con su DTO»*. Es ahora.

**Efecto colateral aceptado**: `PlantDetailResponse` anida `SpeciesCareResponse`, así que la ficha de planta también empieza a traer la mezcla de su especie. Es aditivo y además útil —el sustrato recomendado es dato de cultivo—, así que no se evita.

### Las invariantes del dominio llegan al API como `400`

El `require` del `init` lanza `IllegalArgumentException`, que el manejador global ya traduce a `400` con su mensaje.

**Por qué**: es lo que hace que «los porcentajes suman 90» llegue al usuario con esa frase y no como un `500`. No hace falta duplicar las comprobaciones en `web`, que solo admite tipo y rango ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)).

### La pantalla valida la composición además del servidor

El formulario señala la suma que no cuadra y el rango invertido antes de enviar.

**Por qué**: son comprobaciones de rango, permitidas en el borde, y evitan un viaje para algo que se sabe sin preguntar. **No sustituyen** al dominio ni al `CHECK`: si el API rechaza, se pinta su mensaje.

### La composición se ve, no solo se lee

La ficha usa la barra de proporciones del kit, que ya señala cuando la suma no cuadra.

**Por qué**: `UiProportionBar` nació en T-12 justamente para esto y todavía no la usa ninguna pantalla. Una receta de sustrato es una proporción, y verla es más rápido que leer dos cifras y sumarlas.

## Risks / Trade-offs

* **La carrera entre comprobar el uso y borrar** → descrita arriba; se acepta y se anota en vez de resolverla con bloqueos.
* **`Species` exige mezcla**, así que un catálogo vacío impide dar de alta especies → el catálogo nunca queda vacío en la práctica porque los datos semilla siembran tres, pero la pantalla de alta de especie debe explicar la dependencia si alguna vez lo está.
* **Corregir una mezcla alcanza a todas las especies que la recomiendan**, que es lo correcto —la relación es por referencia— pero puede sorprender → la ficha muestra cuántas especies la usan antes de corregir.
* **El recuento de especies que usan la mezcla es una consulta más** en el listado → se sirve solo en la ficha, no en el catálogo, para no convertir el listado en `N+1`.

## Migration Plan

Ninguna migración: la tabla y sus restricciones existen desde `V1__schema.sql`. Los datos semilla siguen sirviendo.
