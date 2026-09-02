# ADR-013 - Acceso del navegador al API

**Estado:** Aceptado
**Fecha:** 2026-09-02
**Origen:** T-05 (`dashboard-frontend`), al construir la primera pantalla que consume el API desde un navegador

## Contexto

Hasta T-05 el API solo lo consumían los tests de integración, desde el mismo proceso. La primera interfaz web cambia eso: el frontend se sirve desde `:3000` y el backend vive en `:8080`, dos orígenes distintos. Sin cabeceras de CORS el navegador descarta toda respuesta y ninguna pantalla puede pintar datos; no había ninguna configuración de CORS en `backend/src` ni en `application.yml`.

Se cruza con una segunda restricción del despliegue local: `docker-compose.yml` fija `NUXT_PUBLIC_API_BASE_URL: http://localhost:8080`, que es cierto en el navegador del anfitrión y falso dentro del contenedor del frontend, donde el backend es `http://backend:8080`. Una sola URL no puede servir para los dos sitios.

El MVP no tiene autenticación, ni cookies de sesión, ni datos personales.

## Decisión

Habilitamos **CORS para cualquier origen**, con un `WebMvcConfigurer` en `infrastructure` aplicado a todas las rutas (`/**`), con los métodos que el API usa (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`), cabeceras libres y **sin credenciales**.

Es configuración del transporte, no una regla de negocio: vive en `infrastructure` y ni `domain` ni `application` se enteran ([ADR-006](ADR-006-aislamiento-del-dominio.md)). `allowCredentials` queda a `false` tanto por no haber nada que autenticar como porque es incompatible con el comodín de origen.

Como consecuencia directa, **los datos se piden desde el cliente, no en renderizado de servidor**: se usa una única URL, la válida en el navegador, y las páginas piden sus datos ya montadas.

## Alternativas consideradas

* **Proxy de Nitro** (`/api/*` reenviado a la URL interna): resolvería navegador y servidor con una sola URL y sin tocar el backend, pero deja el API sin poder consumirse desde ningún otro cliente de navegador y el equipo lo descarta explícitamente.
* **Desdoblar `runtimeConfig`** en URL pública e interna: mantiene el renderizado en servidor, pero duplica variables por entorno y **sigue necesitando CORS** para las llamadas que el navegador hace después de montar.
* **CORS restringido a una lista de orígenes por variable de entorno**: más correcto para producción, pero añade configuración por entorno que el MVP no necesita. Es la evolución natural, no una alternativa descartada para siempre (ver *Consecuencias*).
* **No habilitar CORS y servir el frontend desde el propio backend**: obligaría a empaquetar Nuxt dentro del artefacto de Spring, tirando por tierra el despliegue en dos contenedores que ya está montado.

## Consecuencias

* Cualquier cliente de navegador puede consumir el API, lo que hace triviales las pruebas manuales y no cierra la puerta a otro frontend.
* **El API queda accesible desde cualquier página web.** Sin autenticación ni cookies, un origen ajeno no puede hacer nada que no pudiera hacer con `curl`; el día que entre autenticación, o que el despliegue salga de local, **la lista de orígenes pasa a configurarse por variable de entorno** y esta decisión se revisa. Es la deuda explícita que este ADR asume.
* Sin renderizado en servidor de los datos remotos: la primera pintura no trae contenido y hay un parpadeo de carga, que se cubre con estados de carga explícitos. Si el renderizado en servidor llegara a importar, el proxy de Nitro descartado arriba sigue siendo la salida y solo afecta a la capa de acceso al API del frontend.
* Los escenarios de CORS se verifican como cualquier otro comportamiento del API, con tests de integración sobre las peticiones de comprobación previa.
