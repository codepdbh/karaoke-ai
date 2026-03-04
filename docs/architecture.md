# Arquitectura Inicial

## Capas

- `frontend`: interfaz App Router con cliente HTTP, estado local y WebSocket para jobs.
- `backend`: API REST versionada, autenticación JWT, acceso a datos y streaming.
- `workers`: pipeline asíncrono con Celery y Redis para tareas pesadas.
- `shared`: formato interno de letras sincronizadas y ejemplos.
- `infra`: orquestación local con Docker Compose, Nginx y scripts PowerShell.

## Persistencia

- PostgreSQL para usuarios, canciones, archivos, letras, jobs y playlists.
- Redis como broker/backend de Celery.
- `storage/` para archivos de desarrollo local.
- `models/` para caché idempotente de modelos IA.

## Principios

- Los requests HTTP no ejecutan procesamiento pesado.
- El backend solo agenda jobs y expone estado.
- Los workers encapsulan cada fase del pipeline en procesadores independientes.
- Los adaptadores de IA son reemplazables y funcionan con rutas configurables.

