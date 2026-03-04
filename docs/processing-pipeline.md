# Pipeline de Procesamiento

## Flujo

1. Subir canción.
2. Extraer metadatos.
3. Calcular checksum y fingerprint.
4. Crear registros `songs` y `song_files`.
5. Generar waveform.
6. Separar stems `vocals` / `instrumental`.
7. Transcribir la voz.
8. Alinear palabras.
9. Generar JSON interno de lyrics.
10. Exportar `.lrc`.
11. Consultar letras externas de forma opcional.
12. Comparar similitud.
13. Guardar versiones transcrita y/o fusionada.
14. Marcar canción `ready` o `failed`.

## Implementación actual

- El flujo existe como pipeline real en workers.
- Las integraciones IA están implementadas como stubs funcionales.
- Cada paso actualiza progreso y estado del job.
- El diseño permite reemplazar stubs por llamadas reales a modelos locales.

