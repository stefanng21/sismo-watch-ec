# Sismo Watch EC — Web v0.2

Aplicación web instalable (PWA) que muestra **terremotos ya publicados** en el catálogo USGS. No predice sismos, no detecta ondas P y **no envía notificaciones push**.

## Nuevas funciones v0.2

- Mapa real interactivo con Leaflet 1.9.4 y OpenStreetMap.
- Modos Ecuador y alrededores, Cotacachi, Imbabura (círculo centrado en Cotacachi), todo el mundo, tu ubicación o punto elegido en el mapa.
- Radio de **consulta** de 25 a 1000 km desde puntos seleccionados. El radio NO calcula riesgo, intensidades o zonas de seguridad.
- Ubicación optativa: se pide permiso solo al pulsar «Usar mi ubicación» y se conserva solo durante la sesión de la página (sin backend propio).
- Consulta de GeoJSON USGS al abrir, al cambiar el período/intervalo de magnitud si requiere otro feed, y cada 60 s cuando la app está abierta.
- Vista de magnitud, ubicación, hora y profundidad de cada evento, con acceso a la ficha original USGS.
- Mapa hasta 650 epicentros recientes y lista hasta 80 eventos recientes si la consulta devuelve más resultados. Los contadores incluyen **todos** los eventos que superan el filtro, no solo los mostrados.

## Publicar actualización sobre GitHub Pages (Windows)

1. Descarga y **extrae** `Sismo_Watch_EC_Web_v0.2.zip`.
2. En tu repositorio `https://github.com/fj4k4zjnhz-hue/sismo-watch-ec`, abre **Add file → Upload files**.
3. Arrastra los **8 archivos** sueltos desde el interior de la carpeta extraída, **no** la carpeta ni el ZIP. Las versiones anteriores deben sustituirse conservando los nombres en la raíz (`index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `README.md`, `icon.png`, `icon-512.png`).
4. Si GitHub pregunta si deseas reemplazar archivos del mismo nombre, confirma. Si la interfaz no permite sustituirlos, utiliza el editor web `https://github.dev/fj4k4zjnhz-hue/sismo-watch-ec` para reemplazar cada archivo y confirmar los cambios.
5. Confirma los cambios con el mensaje `Actualizar Sismo Watch EC a v0.2`.
6. Espera la publicación automática de Pages (puede tardar unos minutos) y abre `https://fj4k4zjnhz-hue.github.io/sismo-watch-ec/`.
7. Si todavía ves v0.1, prueba recarga fuerte de Chrome `Ctrl+Shift+R`, o cierra y abre nuevamente el sitio (el service worker v2 actualiza la caché de archivos propios).

No es necesario volver a crear el repositorio ni cambiar la configuración de Pages.

## Probar en Windows

Con Python instalado, desde la carpeta extraída ejecuta `python -m http.server 8000` y visita `http://localhost:8000`. La geolocalización funciona en HTTPS y en localhost en navegadores modernos. Si abres el archivo HTML directamente sin servidor, pueden fallar ciertas funciones de la PWA.

## Infraestructura y limitaciones

- Datos USGS: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- Mapa Leaflet: https://leafletjs.com (biblioteca desde un CDN; requiere conexión).
- OpenStreetMap: https://www.openstreetmap.org/copyright (imágenes desde OSM, sujetos a sus normas de uso).
- Sismos pequeños pueden estar ausentes en el catálogo internacional. Los feeds predefinidos pueden sufrir retrasos; no equivalen a transmisión de estaciones.
- Para evitar sobrecarga se usan feeds oficiales por período, con un umbral acorde a la magnitud. Si buscas todo el mundo con magnitudes bajas y 30 días, la consulta puede tardar más.
- La geolocalización de tu dispositivo **no se guarda en ningún backend de Sismo Watch EC**. Tu navegador puede comunicarse con sus proveedores habituales de ubicación; las teselas del mapa se obtienen de OpenStreetMap.
- Las alertas verdaderas antes del movimiento fuerte exigen redes de estaciones, transmisión muy rápida y validación de detecciones; están fuera de esta versión.
- No se envían alertas push con la aplicación cerrada. GitHub Pages sirve contenido estático, sin backend de notificaciones.
