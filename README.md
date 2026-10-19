# Sismo Watch EC — PWA v0.1

Monitor experimental de **eventos sísmicos ya publicados**, no alerta temprana.

## Ejecutar en Windows
1. Instala Python 3 (si no lo tienes).
2. Abre PowerShell dentro de esta carpeta y ejecuta `python -m http.server 8000`.
3. Visita `http://localhost:8000` en tu navegador.

## Publicar gratis para iPhone
Sube el contenido de esta carpeta a un hosting estático con HTTPS (por ejemplo GitHub Pages, Cloudflare Pages o Netlify). En Safari del iPhone abre la URL pública, pulsa Compartir > Añadir a pantalla de inicio > Abrir como app.

## Datos
Feed GeoJSON oficial USGS: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
Consulta cada 60 s solo con la página visible. Los filtros geográficos son aproximados y el catálogo puede tardar en incorporar eventos.

## Limitaciones
- No hay detección de ondas P.
- No hay push notifications en segundo plano: requieren un servidor, suscripciones Web Push y un proveedor de envío.
- El mapa es esquemático, no un mapa geográfico de precisión.
- El feed global puede no incluir microsismos locales registrados por IG-EPN.
- No debe usarse para tomar decisiones de seguridad durante sismos.
