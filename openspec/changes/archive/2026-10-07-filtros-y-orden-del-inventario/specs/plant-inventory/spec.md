## ADDED Requirements

### Requirement: Búsqueda de texto en el inventario

`GET /plants` SHALL aceptar `q`: una coincidencia parcial, sin distinguir mayúsculas, sobre el código de inventario, el apodo y los nombres científico y común de la especie, de modo que el ejemplar encaje si **cualquiera** de los cuatro contiene el texto. El texto SHALL tratarse como literal (`%` y `_` no son comodines) y uno en blanco SHALL no filtrar. `q` SHALL componerse con el resto de filtros mediante `AND`. El parámetro `code` existente SHALL conservar su comportamiento.

#### Scenario: Buscar por apodo

- **WHEN** existe el ejemplar «Asiento de suegra» y se pide `GET /plants?q=suegra`
- **THEN** devuelve ese ejemplar y no los que no contienen «suegra» en ninguno de los cuatro campos

#### Scenario: Buscar por el nombre de la especie

- **WHEN** se pide `GET /plants?q=grusonii`
- **THEN** devuelve todos los ejemplares de *Echinocactus grusonii*, aunque su apodo y su código no contengan el texto

#### Scenario: Buscar por código

- **WHEN** se pide `GET /plants?q=gruss-01`
- **THEN** devuelve `CAT-GRUSS-01`

#### Scenario: Sin distinguir mayúsculas

- **WHEN** se pide `GET /plants?q=ASIENTO`
- **THEN** devuelve el mismo resultado que con `asiento`

#### Scenario: Los comodines son texto

- **WHEN** se pide `GET /plants?q=%`
- **THEN** devuelve solo los ejemplares cuyo código, apodo o especie contienen un `%` literal

#### Scenario: Texto en blanco

- **WHEN** se pide `GET /plants?q=%20%20`
- **THEN** el resultado es el mismo que sin `q`

#### Scenario: Se compone con los demás filtros

- **WHEN** se pide `GET /plants?q=grusonii&location=<id>`
- **THEN** devuelve solo los ejemplares de esa especie que además están en esa localización

### Requirement: Filtro del inventario por especie

`GET /plants` SHALL aceptar `species`, repetible: el ejemplar encaja si su especie es **cualquiera** de las indicadas. Un identificador con formato inválido SHALL responder `400`; uno que no existe SHALL dar un resultado vacío, no un error.

#### Scenario: Una especie

- **WHEN** se pide `GET /plants?species=<id>`
- **THEN** devuelve solo los ejemplares de esa especie

#### Scenario: Varias especies

- **WHEN** se pide `GET /plants?species=<a>&species=<b>`
- **THEN** devuelve los ejemplares de la especie `a` y los de la `b`

#### Scenario: Especie inexistente

- **WHEN** se pide `GET /plants?species=<id que no existe>`
- **THEN** responde `200` con una página vacía

#### Scenario: Identificador inválido

- **WHEN** se pide `GET /plants?species=abc`
- **THEN** responde `400` con el cuerpo uniforme de errores

### Requirement: Filtro del inventario por características de cultivo

`GET /plants` SHALL aceptar `exposure` y `environment`, repetibles, que filtran por la **exposición solar y el entorno de la especie** del ejemplar (el ejemplar encaja si el de su especie es cualquiera de los indicados). Una especie sin exposición o sin entorno definido SHALL no encajar en ningún valor concreto. Un valor fuera de los enumerados SHALL responder `400`.

#### Scenario: Por exposición de la especie

- **WHEN** se pide `GET /plants?exposure=pleno_sol`
- **THEN** devuelve los ejemplares cuya especie tiene exposición `pleno_sol`

#### Scenario: Varias exposiciones

- **WHEN** se pide `GET /plants?exposure=soleado&exposure=pleno_sol`
- **THEN** devuelve los de las especies con cualquiera de las dos

#### Scenario: Especie sin definir

- **WHEN** la especie de un ejemplar no tiene exposición definida y se pide `?exposure=soleado`
- **THEN** ese ejemplar no figura

#### Scenario: Valor desconocido

- **WHEN** se pide `GET /plants?environment=playa`
- **THEN** responde `400`

### Requirement: Ordenación del inventario por claves públicas

`GET /plants` SHALL ordenar con `sort=<clave>,<asc|desc>`, donde la clave es una de `code`, `nickname`, `species`, `location` o `createdAt`. `species` SHALL ordenar por el **nombre científico** de la especie y `location` por el **nombre** de la localización, no por sus identificadores. El orden SHALL ser estable: a igualdad de clave, desempata el identificador. Una clave que no esté en la lista SHALL responder `400`; sin `sort`, el orden por defecto no cambia.

#### Scenario: Por especie

- **WHEN** se pide `GET /plants?sort=species,asc`
- **THEN** los ejemplares vienen ordenados alfabéticamente por nombre científico y no por el identificador de la especie

#### Scenario: Por localización

- **WHEN** se pide `GET /plants?sort=location,desc`
- **THEN** vienen ordenados por nombre de localización, de la última a la primera

#### Scenario: Orden estable entre páginas

- **WHEN** muchos ejemplares comparten especie y se recorren las páginas con `sort=species,asc`
- **THEN** ningún ejemplar se repite ni se pierde entre una página y la siguiente

#### Scenario: Clave que no es pública

- **WHEN** se pide `GET /plants?sort=tagSet,asc` o `sort=password,asc`
- **THEN** responde `400` y no se ejecuta ninguna consulta ordenada por esa propiedad

#### Scenario: «Última revisión» y «atención» no existen todavía

- **WHEN** se pide `GET /plants?sort=lastReview,desc`
- **THEN** responde `400`: no es una clave admitida hasta que la cronología (T-20) y las alertas (T-23) la sirvan

### Requirement: Un criterio de listado no admitido nunca es un 500

Todo valor de filtro o de orden de `GET /plants` que no se pueda interpretar —un estado desconocido, un enumerado fuera de lista, un identificador mal formado, una clave de orden ajena, una dirección distinta de `asc` y `desc`— SHALL responder `400` con el cuerpo `{status, error, message, path}`, nunca `500`.

#### Scenario: Dirección de orden inválida

- **WHEN** se pide `GET /plants?sort=code,sideways`
- **THEN** responde `400`

#### Scenario: Estado desconocido

- **WHEN** se pide `GET /plants?status=resucitada`
- **THEN** responde `400`
