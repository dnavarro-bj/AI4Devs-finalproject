## ADDED Requirements

### Requirement: Acceso al API desde un origen distinto

El API SHALL ser consumible por un cliente de navegador servido desde un origen distinto al suyo. Para ello SHALL responder a las peticiones de comprobación previa (`OPTIONS`) que el navegador emite antes de una petición con efectos, autorizando cualquier origen y los métodos y cabeceras que el API usa. Esta autorización SHALL aplicarse a todos los endpoints del API, no a un subconjunto, y NO SHALL exigir credenciales: el MVP no tiene autenticación ni cookies de sesión.

#### Scenario: Lectura desde otro origen

- **WHEN** un cliente servido desde un origen distinto solicita el listado de plantas
- **THEN** la respuesta autoriza a ese origen a leerla, y el cliente obtiene el cuerpo del listado

#### Scenario: Comprobación previa de una petición con cuerpo

- **WHEN** un cliente servido desde otro origen emite la comprobación previa de un `POST` con cuerpo JSON sobre cualquier endpoint del API
- **THEN** la respuesta autoriza el método y las cabeceras solicitadas, y la petición posterior se ejecuta con normalidad

#### Scenario: Comprobación previa que no interfiere con el resto del contrato

- **WHEN** se emite una comprobación previa sobre una ruta que el API no expone
- **THEN** la respuesta no es un error interno del servidor (`5xx`)
