# karaoke-ai

Monorepo para una plataforma de karaoke local-first con:

- separacion de `vocals` e `instrumental`
- transcripcion local
- letras sincronizadas por linea y palabra
- editor de lyrics
- reproduccion dentro de la web
- procesamiento pesado con workers

## Estado actual

Esta primera iteracion ya arranca y permite:

- backend con FastAPI, PostgreSQL, Redis, Celery y JWT
- frontend con Next.js 14, App Router, Tailwind y vistas base
- subida de canciones
- pipeline de procesamiento en background
- separacion real con `python-audio-separator`
- transcripcion real con `faster-whisper`
- alineacion por fallback usando `word_timestamps` de `faster-whisper`
- reproduccion karaoke con mezcla `vocals + instrumental`, volumen independiente y auto-scroll de lyrics

`WhisperX` es opcional en este estado. Si no esta instalado, el sistema sigue funcionando con el fallback de `faster-whisper`.

## Estructura del repo

- `frontend/`: Next.js 14 + TypeScript + App Router
- `backend/`: FastAPI + SQLAlchemy + Alembic + Pydantic
- `workers/`: Celery + Redis para procesamiento pesado
- `shared/`: contratos y ejemplos JSON
- `infra/`: Dockerfiles, compose, scripts
- `storage/`: almacenamiento local en desarrollo
- `models/`: cache local de modelos descargados una sola vez
- `docs/`: documentacion tecnica base

## Requisitos recomendados

Entorno probado para desarrollo en Windows:

- Python `3.13`
- Node.js `20+`
- npm `10+`
- Docker Desktop
- FFmpeg en `PATH`

Opcional pero util:

- Rust + Cargo en `PATH`
  - algunas dependencias pesadas pueden necesitarlo en Windows

## Instalacion de dependencias del sistema

### Python 3.13

Si usas el Python Install Manager de Windows:

```powershell
py install --force 3.13
```

Verifica:

```powershell
py -3.13 --version
```

### FFmpeg

`audio-separator` necesita `ffmpeg.exe` disponible en `PATH`.

```powershell
winget install --id Gyan.FFmpeg.Essentials --exact --source winget --accept-package-agreements --accept-source-agreements
```

Verifica:

```powershell
ffmpeg -version
```

### Rust (opcional, pero recomendado en Windows)

Si alguna dependencia intenta compilar extensiones:

```powershell
winget install --id Rustlang.Rustup --exact --source winget --accept-package-agreements --accept-source-agreements
```

Luego abre una nueva terminal y verifica:

```powershell
cargo --version
rustc --version
```

## Variables de entorno

Desde la raiz del proyecto:

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai

Copy-Item backend\.env.example backend\.env -Force
Copy-Item frontend\.env.example frontend\.env.local -Force
```

Valores importantes del backend:

- `DATABASE_URL=postgresql+psycopg://karaoke:karaoke@localhost:5432/karaoke_ai`
- `REDIS_URL=redis://localhost:6379/0`
- `LOCAL_STORAGE_ROOT=storage`
- `MODEL_ROOT=models`
- `FASTER_WHISPER_MODEL_NAME=small`
- `ALLOW_MODEL_DOWNLOADS=false`

Valores importantes del frontend:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
- `NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000`

## Instalacion local (backend + workers + frontend)

La forma recomendada en este proyecto es:

- Docker solo para `postgres` y `redis`
- `backend`, `workers` y `frontend` corriendo localmente

### 1. Crear y activar entorno virtual

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai

if (Test-Path .venv) { Remove-Item -Recurse -Force .venv }

py -3.13 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python --version
```

### 2. Instalar dependencias Python

```powershell
python -m pip install --upgrade pip setuptools wheel
python -m pip install --no-cache-dir -r backend\requirements.txt -r workers\requirements.txt
```

### 3. Instalar dependencias del frontend

```powershell
Set-Location .\frontend
npm install
Set-Location ..
```

## Levantar infraestructura base (PostgreSQL + Redis)

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai
docker compose -f infra\compose\docker-compose.dev.yml up -d postgres redis
```

Verifica contenedores:

```powershell
docker compose -f infra\compose\docker-compose.dev.yml ps
```

## Bootstrap de modelos

Este script crea carpetas, descarga caches de modelos y valida estado.

### Descargar o preparar modelos

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai
.\.venv\Scripts\Activate.ps1
python -m backend.scripts.bootstrap_models --download
```

### Verificar estado

```powershell
python -m backend.scripts.bootstrap_models --check
```

Salida esperada minima:

- `faster_whisper: READY`
- `audio_separator: READY`

`whisperx: MISSING` es aceptable por ahora.

## Migraciones

### Aplicar migraciones

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai
.\.venv\Scripts\Activate.ps1
python -m alembic -c backend\alembic.ini upgrade head
```

### Si la base quedo sucia por pruebas anteriores

```powershell
docker compose -f infra\compose\docker-compose.dev.yml exec postgres psql -U karaoke -d karaoke_ai -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
python -m alembic -c backend\alembic.ini upgrade head
```

## Ejecutar la aplicacion

Abre 3 terminales separadas.

### Terminal 1: backend

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: worker

Por defecto el worker esta configurado para procesar hasta 3 canciones en paralelo (`threads`, `concurrency=3`).
Puedes cambiarlo por variables de entorno:

- `CELERY_WORKER_POOL` (ej. `threads`)
- `CELERY_WORKER_CONCURRENCY` (ej. `3`)
- `CELERY_WORKER_PREFETCH_MULTIPLIER` (ej. `1`)

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai
.\.venv\Scripts\Activate.ps1
python -m celery -A workers.app.celery_app:celery_app worker --loglevel=info --pool=threads --concurrency=3
```

### Terminal 3: frontend

```powershell
Set-Location C:\Users\Sistemas\Documents\karaoke-ai\frontend
npm run dev
```

## URLs utiles

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- OpenAPI / Swagger: `http://localhost:8000/docs`

## Crear el primer usuario

### Registrar usuario

```powershell
$auth = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:8000/api/v1/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","username":"admin","password":"C0ntr4s3n1a"}'

$token = $auth.access_token
$token
```

### Verificar sesion

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:8000/api/v1/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

## Convertir ese usuario en admin real

El endpoint de registro crea usuarios con rol `listener` por defecto. Si quieres que ese usuario sea admin, promuevelo manualmente en PostgreSQL.

### Si PostgreSQL corre en Docker

```powershell
docker compose -f infra\compose\docker-compose.dev.yml exec postgres psql -U karaoke -d karaoke_ai -c "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';"
```

### Confirmar el cambio

```powershell
docker compose -f infra\compose\docker-compose.dev.yml exec postgres psql -U karaoke -d karaoke_ai -c "SELECT id, email, username, role FROM users;"
```

### Volver a iniciar sesion

```powershell
$auth = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:8000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"D4niel123"}'

$token = $auth.access_token
$token
```

## Flujo rapido de prueba

### 1. Subir una cancion

Reemplaza la ruta por un archivo real `.mp3`, `.wav`, `.flac` o `.m4a`.

```powershell
curl.exe -X POST "http://localhost:8000/api/v1/uploads/song" `
  -H "Authorization: Bearer $token" `
  -F "file=@C:\ruta\a\tu\cancion.flac" `
  -F "title=Te Esperare" `
  -F "artist=Arcangel" `
  -F "language=es"
```

Eso devuelve el objeto `song`. Toma nota del `id`.

### 2. Lanzar el procesamiento

Ejemplo con `song_id = 1`:

```powershell
$job = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:8000/api/v1/songs/1/process" `
  -Headers @{ Authorization = "Bearer $token" }

$job
```

### 3. Monitorear el job

```powershell
while ($true) {
  $j = Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:8000/api/v1/jobs/$($job.id)" `
    -Headers @{ Authorization = "Bearer $token" }

  $j | Select-Object id,status,progress_percent,current_step,error_message

  if ($j.status -in @("completed","failed","cancelled")) { break }
  Start-Sleep -Seconds 2
}
```

### 4. Obtener lyrics sincronizadas

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:8000/api/v1/songs/1/lyrics" `
  -Headers @{ Authorization = "Bearer $token" }
```

### 5. Revisar archivos generados localmente

```powershell
Get-ChildItem -Recurse .\storage\songs\1
```

Normalmente veras:

- audio original
- stems `vocals` e `instrumental`
- waveform
- lyrics JSON
- `.lrc`

## Flujo desde la UI

Una vez que el stack esta arriba:

1. entra en `http://localhost:3000`
2. inicia sesion
3. ve a `Upload`
4. sube una cancion
5. ve a `Library`
6. abre el detalle de la cancion
7. pulsa `Process`
8. revisa `Jobs` para ver progreso en vivo
9. abre `Player`
10. abre `Editor`

## Reproduccion karaoke

El player actual soporta:

- reproduccion de `original`
- reproduccion de `vocals`
- reproduccion de `instrumental`
- modo `mix` que reproduce `vocals + instrumental` al mismo tiempo
- barra de volumen independiente para voz
- barra de volumen independiente para instrumental
- seek compartido
- auto-scroll de lyrics segun el tiempo actual
- resaltado de linea activa
- resaltado basico de palabra activa si hay `word timings`

## Pipeline actual

El flujo implementado es:

1. subir cancion
2. extraer metadata basica
3. calcular checksum
4. guardar `song` y `song_file` original
5. generar waveform basico
6. separar `vocals` e `instrumental`
7. transcribir el stem vocal
8. alinear por palabras
9. construir JSON interno de lyrics
10. exportar `.lrc`
11. guardar version de lyrics
12. marcar el job y la cancion

## Estado de integraciones IA

### `python-audio-separator`

- integrado
- descarga modelos en `models/audio-separator`
- requiere `ffmpeg`

### `faster-whisper`

- integrado
- descarga modelos en `models/faster-whisper`
- usado para transcripcion real

### `WhisperX`

- no es obligatorio para arrancar
- si no esta instalado, el sistema usa fallback con `word_timestamps` de `faster-whisper`
- `models/whisperx` existe como cache reservado

### letras externas

- el adapter esta preparado
- la app funciona aunque no haya conexion externa

## Desarrollo con Docker completo

Si quieres correr tambien `frontend`, `backend` y `workers` dentro de Docker:

```powershell
docker compose -f infra\compose\docker-compose.dev.yml up --build
```

Para apagar:

```powershell
docker compose -f infra\compose\docker-compose.dev.yml down --remove-orphans
```

## Problemas comunes

### PowerShell bloquea la activacion del entorno virtual

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### `ffmpeg` no se encuentra

Instala FFmpeg y confirma:

```powershell
ffmpeg -version
```

Luego repite:

```powershell
python -m backend.scripts.bootstrap_models --download
```

### Celery en Windows falla con `PermissionError`

Evita `prefork` y usa `threads`:

```powershell
python -m celery -A workers.app.celery_app:celery_app worker --loglevel=info --pool=threads --concurrency=3
```

### `whisperx` sale como `MISSING`

Es aceptable en el estado actual. El sistema sigue funcionando con el fallback de `faster-whisper`.

### La instalacion de paquetes intenta compilar con Rust

Instala `rustup`, abre una terminal nueva y vuelve a ejecutar:

```powershell
python -m pip install --no-cache-dir -r backend\requirements.txt -r workers\requirements.txt
```

### El progreso de jobs no se actualiza en frontend

Reinicia backend y frontend. El frontend ya incluye refresco y WebSocket, pero necesitas ambos procesos con el codigo actual cargado.

## Archivos importantes

- `README.md`
- `backend/.env.example`
- `frontend/.env.example`
- `backend/scripts/bootstrap_models.py`
- `infra/compose/docker-compose.dev.yml`

## Siguientes pasos razonables

1. Instalar `WhisperX` en un entorno compatible si quieres alineacion mas precisa.
2. Agregar una pantalla o endpoint para promover usuarios a `admin` sin tocar SQL.
3. Conectar un proveedor real de letras externas y mergear con la transcripcion local.
