## ADDED Requirements

### Requirement: La alerta es una incidencia con ciclo de vida

El sistema SHALL modelar la alerta como una entidad propia con: **planta o localización** (exactamente una de las dos), **origen** (`medicion`, `sin_revisar`, `cuidado_vencido`, `manual`, `recomendacion_ia`), **categoría** (`temperatura`, `humedad`, `luz`, `riego`, `seguimiento`, `otra`), **severidad** (`baja`, `media`, `critica`), motivo, acción recomendada opcional, **estado** (`nueva`, `revisada`, `resuelta`, `descartada`), fecha de detección (la primera), **fecha de última detección**, **número de ocurrencias** (al menos 1), la lectura que la originó si nace de una, y —al cerrarse— fecha y comentario de resolución. Una alerta SHALL NO confundirse con una tarea ni con un cuidado: crearla no planifica trabajo y cerrarla no registra ningún cuidado.

#### Scenario: Una alerta sobre una planta

- **WHEN** se crea una alerta sobre un ejemplar
- **THEN** nace en estado `nueva`, con una ocurrencia, con su fecha de detección igual a la de última detección

#### Scenario: Una alerta de zona

- **WHEN** se crea una alerta sobre una localización
- **THEN** se acepta, y no tiene planta

#### Scenario: Planta y localización a la vez, o ninguna

- **WHEN** se intenta crear una alerta con planta y localización, o sin ninguna
- **THEN** la respuesta es `400` y no se guarda nada

### Requirement: Consultar las alertas

`GET /alerts` SHALL devolver las alertas paginadas con el envelope `PageResponse` (ADR-009), con filtros combinables (ADR-016): `status` y `severity` repetibles, `source`, `category`, `plant`, `location` —con `includeDescendants`— y orden por claves públicas (`detected`, `lastDetected`, `severity`, `status`), con el identificador como desempate. Sin orden pedido, el orden SHALL ser el de la bandeja: **severidad descendente y, dentro de ella, la última detección más reciente primero**. Un valor ininterpretable SHALL ser `400` y un identificador bien formado pero inexistente, un resultado vacío. Cada fila SHALL traer la planta (código, apodo y especie) o la localización (nombre y ruta) a la que afecta. **`GET /alerts/{id}`** SHALL devolver además su historial de transiciones y las tareas que nacieron de ella; una alerta inexistente SHALL responder `404`.

#### Scenario: Filtrar por estado y severidad

- **WHEN** se piden las alertas `?status=nueva&status=revisada&severity=critica`
- **THEN** solo vienen las críticas abiertas y `totalElements` las cuenta todas

#### Scenario: Orden de la bandeja

- **WHEN** se piden sin orden una crítica de ayer y una media de hoy
- **THEN** la crítica va primero

#### Scenario: Filtrar por localización con descendientes

- **WHEN** se pide `?location=X&includeDescendants=true`
- **THEN** vienen las alertas de esa localización, las de sus sublocalizaciones y las de los ejemplares que están en ellas

#### Scenario: Filtro ininterpretable

- **WHEN** se pide `?severity=gravisima`
- **THEN** la respuesta es `400` indicando los valores válidos

#### Scenario: Alerta inexistente

- **WHEN** se consulta una alerta que no existe
- **THEN** la respuesta es `404`

### Requirement: Alertas manuales

`POST /alerts` SHALL permitir anotar una incidencia a mano sobre **una planta o una localización**, con categoría, severidad y motivo obligatorios y acción recomendada opcional. Su origen SHALL ser `manual`. Una alerta manual NO SHALL estar sujeta a la regla anti-duplicados: dos incidencias distintas anotadas a mano conviven. La respuesta SHALL ser `201 Created` con la alerta. Una planta o localización inexistente en el cuerpo SHALL responder `400`. Se SHALL poder anotar una alerta sobre un ejemplar archivado.

#### Scenario: Anotar una incidencia

- **WHEN** se envía `{"plantId": "...", "category": "otra", "severity": "media", "reason": "Cochinilla en la base"}`
- **THEN** la respuesta es `201 Created`, con origen `manual`, estado `nueva` y una entrada de apertura en su historial

#### Scenario: Dos manuales sobre lo mismo

- **WHEN** se anotan dos incidencias manuales de la misma categoría sobre el mismo ejemplar
- **THEN** existen las dos como alertas distintas

#### Scenario: Motivo en blanco

- **WHEN** el motivo es vacío o en blanco
- **THEN** la respuesta es `400` y no se guarda nada

#### Scenario: Planta inexistente

- **WHEN** el cuerpo trae una planta que no existe
- **THEN** la respuesta es `400`, no `404`

### Requirement: Ciclo de vida y transiciones registradas

`POST /alerts/{id}/review`, `/resolve` y `/dismiss` SHALL mover la alerta con un comentario opcional. Las transiciones admitidas SHALL ser **`nueva → revisada`**, **`nueva | revisada → resuelta`** y **`nueva | revisada → descartada`**; `resuelta` y `descartada` SHALL ser **finales** y cualquier otra transición SHALL responder `409` sin cambiar nada. **Cada transición SHALL quedar registrada** con su estado anterior, el nuevo, su comentario y su instante, y **la apertura SHALL ser la primera transición** (sin estado anterior). Resolver SHALL guardar la fecha y el comentario de resolución; **descartar NO SHALL guardarse como resolución**: es un estado distinto con su propia fecha. Una alerta cerrada SHALL permanecer consultable.

#### Scenario: Recorrer el ciclo

- **WHEN** una alerta `nueva` se revisa y después se resuelve con un comentario
- **THEN** su historial tiene tres transiciones —apertura, revisión y resolución—, cada una con su instante, y la alerta guarda la fecha y el comentario de resolución

#### Scenario: Resolver directamente

- **WHEN** una alerta `nueva` se resuelve sin haberse revisado
- **THEN** se acepta y el historial no tiene la revisión

#### Scenario: Descartar no es resolver

- **WHEN** una alerta se descarta
- **THEN** su estado es `descartada`, no tiene fecha ni comentario de resolución y su historial lo distingue de una resolución

#### Scenario: Una alerta cerrada no se mueve

- **WHEN** se intenta revisar, resolver o descartar una alerta `resuelta` o `descartada`
- **THEN** la respuesta es `409` y la alerta conserva su estado y su historial

#### Scenario: Revisar dos veces

- **WHEN** se revisa una alerta ya `revisada`
- **THEN** la respuesta es `409`

#### Scenario: Una alerta inexistente

- **WHEN** se mueve una alerta que no existe
- **THEN** la respuesta es `404`

### Requirement: Detección de una medición fuera de rango

Al registrar una lectura de cultivo, el sistema SHALL comparar sus medidas con el **rango efectivo del ejemplar** —el de su especie con los cuidados propios del ejemplar aplicados— para **humedad** (categoría `humedad`), **temperatura** (`temperatura`) y **horas de luz** (`luz`). Una medida fuera de su rango SHALL abrir una alerta de origen `medicion` y esa categoría, o actualizar la abierta si ya la hay (ver «Sin duplicados»). Una medida ausente, o sin rango definido, NO SHALL generar alerta; la acidez y la cantidad de riego NO SHALL evaluarse porque no tienen rango. **La severidad inicial SHALL salir de cuánto se aleja la medida del rango, en proporción a su anchura**: por debajo del 25 % es `baja`, desde el 25 % es `media` y desde el 75 % es `critica`. El motivo SHALL decir la medida, el rango y el sentido («Temperatura 4 °C por debajo del mínimo de 10 °C»). La alerta SHALL guardar la lectura que la originó, y detectar SHALL ocurrir **en la misma transacción** que la lectura.

#### Scenario: Una temperatura por debajo del mínimo

- **WHEN** se registra una lectura de 2 °C para un ejemplar cuyo rango efectivo es 10–35 °C
- **THEN** se abre una alerta `medicion` de categoría `temperatura`, con un motivo que dice la medida y el rango, y enlazada a la lectura

#### Scenario: Se usa el rango del ejemplar, no solo el de la especie

- **WHEN** el ejemplar ha personalizado su rango de humedad a 5–15 % y se registra una humedad de 20 %
- **THEN** se abre una alerta de humedad aunque 20 % esté dentro del rango de su especie

#### Scenario: Severidad por la distancia al rango

- **WHEN** una medida queda fuera del rango por menos del 25 % de su anchura, y otra por más del 75 %
- **THEN** la primera abre una alerta `baja` y la segunda una `critica`

#### Scenario: Una lectura dentro de rango

- **WHEN** se registra una lectura con todas sus medidas dentro de rango
- **THEN** no se abre ninguna alerta

#### Scenario: Una lectura parcial

- **WHEN** se registra una lectura que solo trae la humedad, fuera de rango
- **THEN** se abre solo la alerta de humedad

#### Scenario: Acidez y riego no se evalúan

- **WHEN** se registra una lectura con un pH extremo y un riego de 0 ml
- **THEN** no se abre ninguna alerta

#### Scenario: Varias medidas fuera de rango

- **WHEN** una lectura trae temperatura y humedad fuera de rango
- **THEN** se abren dos alertas, una por categoría, ambas enlazadas a esa lectura

### Requirement: Sin duplicados: una alerta abierta por condición, con escalada

Mientras exista una alerta **abierta** (`nueva` o `revisada`) sobre la misma planta o localización con el mismo origen y la misma categoría, una nueva detección NO SHALL abrir otra: SHALL **actualizar la fecha de última detección, sumar una ocurrencia** y, para las mediciones, enlazar la **última lectura** que la confirma. **La severidad SHALL poder subir y nunca bajar**: la nueva es la mayor entre la actual, la que salga de la distancia al rango de la medida actual y la que salga del número de ocurrencias —desde 3 ocurrencias, al menos `media`; desde 6, `critica`; ambos umbrales configurables—. La base de datos SHALL defender la regla con un índice único parcial sobre las alertas abiertas de origen automático, de modo que dos detecciones simultáneas no puedan abrir dos. Una alerta **cerrada** NO SHALL recibir ocurrencias: la siguiente detección abre una alerta nueva, con su propio historial. Este mecanismo NO SHALL aplicarse a las alertas manuales.

#### Scenario: Una segunda lectura fuera de rango

- **WHEN** hay una alerta abierta de temperatura y se registra otra lectura fuera de rango del mismo ejemplar
- **THEN** no se abre otra alerta, la abierta pasa a 2 ocurrencias, su última detección es la de la nueva lectura y enlaza esa lectura

#### Scenario: La severidad escala con las ocurrencias

- **WHEN** una alerta `baja` acumula 3 ocurrencias y después 6
- **THEN** pasa a `media` y luego a `critica`

#### Scenario: La severidad no baja

- **WHEN** una alerta `critica` recibe una lectura que se aparta del rango menos que la primera
- **THEN** sigue `critica`

#### Scenario: Una lectura más grave sube la severidad de inmediato

- **WHEN** una alerta `baja` recibe una lectura que se aparta del rango por más del 75 % de su anchura
- **THEN** pasa a `critica` aunque lleve pocas ocurrencias

#### Scenario: Una alerta revisada sigue siendo la abierta

- **WHEN** una alerta `revisada` recibe otra lectura fuera de rango
- **THEN** acumula la ocurrencia y conserva su estado

#### Scenario: Una alerta cerrada no se reabre

- **WHEN** se resuelve una alerta de temperatura y después llega otra lectura fuera de rango
- **THEN** se abre una alerta **nueva**, la resuelta no cambia y las ocurrencias empiezan en 1

#### Scenario: Categorías distintas no se mezclan

- **WHEN** hay una alerta abierta de temperatura y una lectura trae la humedad fuera de rango
- **THEN** se abre una alerta de humedad aparte

#### Scenario: Detecciones simultáneas

- **WHEN** dos lecturas fuera de rango del mismo ejemplar se registran a la vez sin alerta previa
- **THEN** existe una sola alerta abierta con 2 ocurrencias

### Requirement: Proceso programado de las condiciones de tiempo

El sistema SHALL ejecutar **un proceso programado diario**, que se pueda apagar y cuya hora sea configurable, que evalúe las dos condiciones que no ocurren al escribir un dato: **`sin_revisar`** —un ejemplar **en curso** sin ninguna observación (lectura, comentario, intervención o floración) desde hace al menos 30 días, o, si nunca tuvo, desde su alta; categoría `seguimiento`— y **`cuidado_vencido`** —una tarea **pendiente** cuyo fin venció hace al menos 2 días y que se dirige a **una sola planta o a una localización**; categoría `riego` si es una tarea de riego y `seguimiento` en las demás—. Ambos umbrales SHALL ser configurables. Cada condición SHALL seguir «Sin duplicados» y **una alerta SHALL recibir como mucho una ocurrencia por día UTC**, de modo que ejecutar el proceso varias veces el mismo día sea inocuo. Un ejemplar archivado NO SHALL generar alertas de este proceso. La severidad inicial SHALL ser `baja` y escalar con las ocurrencias. La detección SHALL ser invocable desde un servicio de aplicación, de modo que pueda probarse con el reloj inyectado sin esperar al planificador.

#### Scenario: Una planta sin revisar

- **WHEN** un ejemplar activo lleva 43 días sin lectura, comentario, intervención ni floración y se ejecuta el proceso
- **THEN** se abre una alerta `sin_revisar` de categoría `seguimiento`, cuyo motivo dice los días

#### Scenario: Una observación reciente lo evita

- **WHEN** el ejemplar tiene un comentario de hace 5 días
- **THEN** no se abre ninguna alerta, aunque su última lectura sea de hace 90

#### Scenario: Un cambio de estado o un movimiento no cuentan como observación

- **WHEN** el único evento reciente del ejemplar es un movimiento de localización
- **THEN** sigue considerándose sin revisar

#### Scenario: Un ejemplar archivado

- **WHEN** un ejemplar `muerta` lleva 200 días sin observaciones
- **THEN** el proceso no abre ninguna alerta

#### Scenario: Una tarea vencida de una planta

- **WHEN** una tarea de riego pendiente de un ejemplar venció hace 3 días
- **THEN** se abre una alerta `cuidado_vencido` de categoría `riego` sobre ese ejemplar

#### Scenario: Una tarea de localización vencida

- **WHEN** una tarea pendiente dirigida a una localización venció hace 4 días
- **THEN** se abre una alerta `cuidado_vencido` sobre la localización

#### Scenario: Una tarea de varias plantas no genera alerta

- **WHEN** una tarea pendiente de varias plantas expresas venció hace 10 días
- **THEN** el proceso no abre ninguna alerta

#### Scenario: Una tarea que ya no está pendiente

- **WHEN** la tarea vencida se ha completado, omitido o cancelado
- **THEN** no genera alerta

#### Scenario: Ejecutarlo dos veces el mismo día

- **WHEN** el proceso se ejecuta dos veces el mismo día UTC sobre la misma condición
- **THEN** la alerta tiene una sola ocurrencia más, no dos

#### Scenario: Ejecutarlo al día siguiente

- **WHEN** la condición persiste y el proceso se ejecuta el día siguiente
- **THEN** la alerta suma una ocurrencia y actualiza su última detección

### Requirement: Una alerta se cierra siempre por una persona

El sistema NO SHALL resolver ni descartar una alerta por su cuenta: ni cuando una lectura posterior vuelve al rango, ni cuando se completa la tarea que nació de ella, ni cuando el proceso programado ya no detecta la condición. Cerrar una alerta SHALL ser siempre una de las transiciones explícitas.

#### Scenario: La lectura vuelve al rango

- **WHEN** hay una alerta de temperatura abierta y se registra una lectura dentro de rango
- **THEN** la alerta sigue abierta y sin cambios

#### Scenario: La condición desaparece

- **WHEN** un ejemplar sin revisar recibe una lectura y el proceso se ejecuta de nuevo
- **THEN** su alerta `sin_revisar` sigue abierta, sin ocurrencia nueva

### Requirement: Umbrales en configuración

Los umbrales de detección —días sin revisar, días de vencimiento, ocurrencias para escalar a `media` y a `critica`, y los porcentajes de distancia al rango— SHALL leerse de la configuración de la aplicación con valores por defecto, nunca de constantes sin nombre en el código, y el proceso programado SHALL poder desactivarse y fijar su hora. Una configuración incoherente (un umbral a `critica` menor que el de `media`) SHALL impedir el arranque.

#### Scenario: Valores por defecto

- **WHEN** no hay configuración propia
- **THEN** se usan 30 días sin revisar, 2 de vencimiento, escaladas en 3 y 6 ocurrencias y cortes del 25 % y el 75 %

#### Scenario: Un umbral incoherente

- **WHEN** la escalada a `critica` está configurada en menos ocurrencias que la de `media`
- **THEN** la aplicación no arranca y dice por qué

### Requirement: Lo que la alerta guarda sobre la planta y la localización

La alerta de una planta SHALL seguir el ejemplar: si cambia de localización, la alerta SHALL mostrar la actual. Retirar una localización que tiene alertas propias SHALL responder `409`, y una planta no se retira. La retirada de una alerta NO SHALL existir: las cerradas son historia.

#### Scenario: La planta cambia de sitio

- **WHEN** un ejemplar con una alerta abierta se mueve a otra localización
- **THEN** la alerta muestra la nueva localización y la ruta se calcula sobre la actual

#### Scenario: Retirar una localización con alertas

- **WHEN** se retira una localización que tiene alertas propias
- **THEN** la respuesta es `409`

#### Scenario: No hay borrado

- **WHEN** se pide `DELETE /alerts/{id}`
- **THEN** la respuesta es `405`
