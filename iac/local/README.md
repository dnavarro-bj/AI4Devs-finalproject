# Infraestructura local (Docker Compose)

Levanta PostgreSQL, el backend y el frontend en local.

## Uso

```bash
cd iac/local
cp .env.example .env   # ajusta las variables si hace falta (p. ej. OPENAI_API_KEY)
docker compose up --build
```

## Servicios

| Servicio | Puerto | Descripción |
|---|---|---|
| `db` | 5432 | PostgreSQL 16 |
| `backend` | 8080 | API Spring Boot ([../../backend](../../backend)) |
| `frontend` | 3000 | Nuxt 4 ([../../frontend](../../frontend)) |

Al arrancar, el backend aplica las migraciones de Flyway y carga los datos semilla, así que la API queda usable sin ningún paso manual:

```bash
curl localhost:8080/locations
curl 'localhost:8080/plants?tag=400001'
```

El frontend, de momento, es solo el esqueleto de Nuxt.

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `cactify` | Credenciales de PostgreSQL, compartidas por `db` y `backend` |
| `OPENAI_API_KEY` | *(vacía)* | Clave de la API de OpenAI. Sin ella el resto del API funciona y solo las recomendaciones responden `502` |
| `PAGE_SIZE_DEFAULT` | `25` | Tamaño de página que se aplica cuando la petición no indica `size` |
| `PAGE_SIZE_MAX` | `500` | Tope de `size`; una petición por encima se sirve con este valor |
