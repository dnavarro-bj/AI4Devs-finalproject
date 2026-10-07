# data-export Specification

## Purpose
TBD - created by archiving change buscador-global-y-exportacion. Update Purpose after archive.

## Requirements

### Requirement: Exportación del inventario filtrado a CSV

`GET /plants/export` SHALL aceptar **los mismos parámetros de filtro y orden que `GET /plants`** (`q`, `code`, `location`, `includeDescendants`, `tag`, `status`, `species`, `exposure`, `environment`, `sort`) y devolver **todas** las filas que el listado devolvería con ellos, sin paginar, como un CSV: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment` con el nombre `cactify-plantas-AAAA-MM-DD.csv` —la fecha, del reloj inyectado— y una marca de orden de bytes UTF-8. `page` y `size` SHALL ignorarse. La primera fila SHALL ser la cabecera. Las columnas SHALL ser fijas y completas, con independencia de las que muestre la tabla: código, apodo, código y nombre científico de la especie, ruta de la localización, estado, etiquetas (separadas por `;`), descripción, germinación (año y mes), fecha de adquisición, procedencia y fecha de alta. Sin filtro de estado SHALL aplicarse el mismo valor por defecto que el listado (solo lo que está en curso).

#### Scenario: Mismas filas que el listado

- **WHEN** el listado con `status=cuarentena&species=<id>` devuelve 7 ejemplares y se pide `GET /plants/export` con los mismos parámetros
- **THEN** el CSV trae la cabecera y esos 7, ni uno más ni uno menos

#### Scenario: Descarga con nombre fechado

- **WHEN** se exporta el 7 de octubre de 2026
- **THEN** la respuesta es `text/csv; charset=utf-8` con `Content-Disposition: attachment; filename="cactify-plantas-2026-10-07.csv"` y empieza por la marca de orden de bytes

#### Scenario: Más filas que una página

- **WHEN** el resultado tiene 1.200 ejemplares y el tamaño de página máximo es 500
- **THEN** el CSV trae las 1.200 filas

#### Scenario: Respeta el orden pedido

- **WHEN** se exporta con `sort=species,asc`
- **THEN** las filas siguen ese orden, con el mismo desempate estable que el listado

#### Scenario: Resultado vacío

- **WHEN** ningún ejemplar cumple los filtros
- **THEN** el CSV trae solo la cabecera y responde `200`

#### Scenario: Valores con comas, comillas y saltos de línea

- **WHEN** un apodo contiene `Cactus, "grande"` y un salto de línea
- **THEN** la celda sale entrecomillada con las comillas dobladas y el CSV se lee de vuelta con las mismas columnas

#### Scenario: Filtro inválido

- **WHEN** se pide `GET /plants/export?status=resucitada`
- **THEN** responde `400` como el listado, no un CSV

### Requirement: La exportación no trunca en silencio

El resultado de una exportación SHALL acotarse por la configuración `EXPORT_MAX_ROWS` (5.000 por defecto). Si el resultado la supera, el servidor SHALL responder `422` con el cuerpo uniforme de errores, indicando **cuántas filas** serían y **cuál es el máximo**, y SHALL NOT devolver un CSV parcial.

#### Scenario: Resultado por encima del máximo

- **WHEN** el máximo es 1.000 y el filtro admite 1.200 ejemplares
- **THEN** responde `422` con el mensaje «1200 filas superan el máximo de 1000: afina los filtros» y ningún CSV

#### Scenario: Exactamente el máximo

- **WHEN** el resultado tiene exactamente 1.000 filas con el máximo en 1.000
- **THEN** devuelve el CSV completo

### Requirement: Las celdas no se interpretan como fórmulas

Toda celda de texto de un CSV exportado cuyo primer carácter sea `=`, `+`, `-`, `@`, tabulador o retorno de carro SHALL llevar delante un apóstrofo para que una hoja de cálculo no la evalúe. Los números y las fechas generados por el sistema SHALL NOT alterarse.

#### Scenario: Apodo que parece una fórmula

- **WHEN** un ejemplar se llama `=HYPERLINK("http://example.com","pulsa")`
- **THEN** la celda del CSV empieza por `'=HYPERLINK`

#### Scenario: Un guion no es una fórmula en medio

- **WHEN** un apodo es `Asiento-de-suegra`
- **THEN** sale sin cambios

#### Scenario: Texto que empieza por un signo

- **WHEN** una descripción empieza por `-` o `+`
- **THEN** sale con el apóstrofo delante

### Requirement: Exportación del catálogo de especies filtrado

`GET /species/export` SHALL comportarse como la de plantas con **los parámetros de `GET /species`** (`q`, `code`, `exposure`, `environment`, `soilMix`, `minTemperatureFrom`, `minTemperatureTo`, `growthMonth`, `bloomMonth`, `sort`), con el nombre `cactify-especies-AAAA-MM-DD.csv` y las columnas: código, nombre científico, nombre común, exposición, entorno, mezcla de sustrato, temperatura mínima y máxima, humedad mínima y máxima, horas de luz mínimas y máximas, riego orientativo y número de ejemplares. La acotación y la neutralización de fórmulas SHALL aplicarse igual.

#### Scenario: Un grupo de especies

- **WHEN** se exporta con `minTemperatureFrom=9`
- **THEN** el CSV trae las especies del listado con esa condición, con su número de ejemplares

#### Scenario: Acotada

- **WHEN** el resultado supera el máximo
- **THEN** responde `422`

#### Scenario: Sin ejemplares

- **WHEN** una especie no tiene ejemplares
- **THEN** su columna de número de ejemplares es 0
