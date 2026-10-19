'use strict';
/* Sismo Watch EC v0.2 - reported earthquakes only, not early warning. */
const $ = id => document.getElementById(id);
const COTACACHI = {lat: 0.300, lng: -78.270};
const ECUADOR_BOUNDS = [[-5.5, -82.5], [2.2, -75]];
const MAX_MAP_EVENTS = 650;
const MAX_LIST_EVENTS = 80;
const state = {
  features: [],
  loadedFeed: '',
  lastSuccessfulLoad: 0,
  map: null,
  markers: null,
  radiusCircle: null,
  originMarker: null,
  geoCenter: null,
  pickedCenter: null,
  awaitingPick: false,
  renderedMapMarkers: [],
  abortController: null,
  loadId: 0
};
const fmtNumber = new Intl.NumberFormat('es-EC');
const timeFormatter = new Intl.DateTimeFormat('es-EC', {dateStyle: 'medium', timeStyle: 'short'});
const shortTime = new Intl.DateTimeFormat('es-EC', {hour: '2-digit', minute: '2-digit'});
const rad = number => number * Math.PI / 180;
function distanceKm(a, b) {
  const dLat = rad(a.lat - b.lat), dLon = rad(a.lng - b.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function setStatus(text, error=false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}
function selectedZone() {return $('zone').value;}
function selectedRadius() {return Number($('radius').value);}
function selectedOrigin() {
  const zone = selectedZone();
  if (zone === 'cotacachi' || zone === 'imbabura') return COTACACHI;
  if (zone === 'nearby') return state.geoCenter;
  if (zone === 'custom') return state.pickedCenter;
  return null;
}
function currentOriginLabel() {
  switch (selectedZone()) {
    case 'cotacachi': case 'imbabura': return 'Cotacachi';
    case 'nearby': return 'tu ubicación';
    case 'custom': return 'punto elegido';
    default: return '';
  }
}
function inEcuador(event) {
  const [lon,lat] = event.geometry.coordinates;
  return lat >= ECUADOR_BOUNDS[0][0] && lat <= ECUADOR_BOUNDS[1][0] && lon >= ECUADOR_BOUNDS[0][1] && lon <= ECUADOR_BOUNDS[1][1];
}
function inSelection(event) {
  if (selectedZone() === 'world') return true;
  if (selectedZone() === 'ecuador') return inEcuador(event);
  const origin = selectedOrigin();
  if (!origin) return false;
  const coords = event.geometry.coordinates;
  return distanceKm(origin, {lat: coords[1], lng: coords[0]}) <= selectedRadius();
}
function filteredEvents() {
  const minMagnitude = Number($('minmag').value);
  return state.features.filter(event => {
    const magnitude = event?.properties?.mag;
    const coordinates = event?.geometry?.coordinates;
    return Number.isFinite(magnitude) && magnitude >= minMagnitude && Array.isArray(coordinates) && coordinates.length >= 2 && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1]) && inSelection(event);
  }).sort((a,b) => b.properties.time - a.properties.time);
}
function getFeed() {
  const minMagnitude = Number($('minmag').value);
  const category = minMagnitude >= 5 ? '4.5' : minMagnitude >= 3 ? '2.5' : 'all';
  const period = $('period').value === 'day' ? 'day' : $('period').value === 'month' ? 'month' : 'week';
  return `${category}_${period}`;
}
function formatMagnitude(value) {
  return Number.isFinite(value) ? Number(value).toFixed(1) : '—';
}
function formatDistance(event, origin) {
  if (!origin) return '';
  const coordinates = event.geometry.coordinates;
  return `${Math.round(distanceKm(origin, {lat: coordinates[1], lng: coordinates[0]}))} km de ${currentOriginLabel()}`;
}
function popupContent(event) {
  const prop = event.properties, coords = event.geometry.coordinates;
  const wrap = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = `M ${formatMagnitude(prop.mag)} · ${prop.place || 'Evento sísmico'}`;
  const details = document.createElement('div');
  details.textContent = `${timeFormatter.format(new Date(prop.time))} · ${Math.round(coords[2] ?? 0)} km de profundidad`;
  const link = document.createElement('a');
  link.href = safeEventUrl(prop.url);
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.textContent = 'Consultar registro en USGS ↗';
  wrap.append(heading, document.createElement('br'), details, link);
  return wrap;
}
function safeEventUrl(url) {
  try {const parsed = new URL(url); if (parsed.protocol === 'https:' && parsed.hostname === 'earthquake.usgs.gov') return parsed.href;} catch (_) {}
  return 'https://earthquake.usgs.gov/earthquakes/map/';
}
function initializeMap() {
  if (!window.L) {
    $('map-fallback').hidden = false;
    $('map').hidden = true;
    return;
  }
  const map = L.map('map', {zoomControl: true, worldCopyJump: true, scrollWheelZoom: false});
  state.map = map;
  map.setView([-1.3, -78.7], 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
  }).addTo(map);
  state.markers = L.layerGroup().addTo(map);
  map.on('click', event => {
    if (!state.awaitingPick) return;
    state.awaitingPick = false;
    $('pick').textContent = '⊕ Elegir en el mapa';
    state.pickedCenter = {lat: event.latlng.lat, lng: event.latlng.lng};
    $('zone').value = 'custom';
    $('radius').disabled = false;
    setHint();
    clearMapMessage();
    render();
  });
}
function clearMapMessage() {
  $('map-message').hidden = true;
}
function showMapMessage(message) {
  $('map-message').textContent = message;
  $('map-message').hidden = false;
}
function setHint() {
  const zone = selectedZone();
  const origin = selectedOrigin();
  $('radius').disabled = zone === 'world' || zone === 'ecuador';
  const hints = {
    ecuador: 'Se muestran los sismos del recuadro de Ecuador y sus alrededores. El radio no se aplica.',
    world: 'Cobertura mundial. Usa el zoom para explorar regiones; la lista muestra los últimos eventos encontrados.',
    imbabura: `Zona centrada en Cotacachi: ${selectedRadius()} km. No es un límite provincial administrativo.`,
    cotacachi: `Radio de ${selectedRadius()} km desde Cotacachi.`,
    nearby: origin ? `Radio de ${selectedRadius()} km alrededor de tu ubicación aproximada.` : 'Pulsa «Usar mi ubicación» para autorizar el acceso. No se solicita automáticamente.',
    custom: origin ? `Radio de ${selectedRadius()} km alrededor del punto elegido.` : 'Pulsa «Elegir en el mapa» y luego toca un punto en el mapa.'
  };
  $('zoneHint').textContent = hints[zone];
  const subtitles = {
    ecuador: 'Ecuador y alrededores', world: 'Mapa mundial', imbabura: 'Imbabura y alrededores', cotacachi: 'Cotacachi y alrededores', nearby: 'Cerca de tu ubicación', custom: 'Alrededor del punto seleccionado'
  };
  $('mapSubtitle').textContent = `${subtitles[zone]} · registros publicados`;
}
function setMapView() {
  if (!state.map) return;
  const zone = selectedZone();
  const map = state.map;
  if (zone === 'world') map.setView([18,0],2);
  else if (zone === 'ecuador') map.fitBounds(ECUADOR_BOUNDS, {padding: [14,14]});
  else {
    const origin = selectedOrigin();
    if (origin) {
      const bounds = L.circle([origin.lat, origin.lng], {radius: selectedRadius()*1000}).getBounds();
      map.fitBounds(bounds, {padding:[32,32], maxZoom: 12});
    } else map.setView([COTACACHI.lat, COTACACHI.lng],8);
  }
}
function updateMap(items) {
  if (!state.map) {
    $('mapCount').textContent = 'Mapa no disponible; consulta la lista.';
    return;
  }
  const group = state.markers;
  group.clearLayers();
  state.renderedMapMarkers.length = 0;
  if (state.originMarker) {state.map.removeLayer(state.originMarker); state.originMarker = null;}
  if (state.radiusCircle) {state.map.removeLayer(state.radiusCircle); state.radiusCircle = null;}
  const origin = selectedOrigin();
  if (origin) {
    state.radiusCircle = L.circle([origin.lat,origin.lng], {
      radius: selectedRadius()*1000, color:'#31dbc1', weight:1.5, opacity:.8, fillColor:'#1ecaaa', fillOpacity:.07, interactive:false
    }).addTo(state.map);
    state.originMarker = L.circleMarker([origin.lat,origin.lng], {
      radius:7, color:'#fff', weight:2, fillColor:'#17c8b0', fillOpacity:1
    }).addTo(state.map).bindTooltip(`Centro: ${currentOriginLabel()}`);
  }
  const plotted = items.slice(0,MAX_MAP_EVENTS);
  for (const event of plotted) {
    const props = event.properties;
    const coords = event.geometry.coordinates;
    const high = props.mag >= 5;
    const marker = L.circleMarker([coords[1],coords[0]], {
      radius: Math.min(13, Math.max(4, props.mag * 1.65)),
      fillColor: high ? '#ef6c6f' : '#ffb46a',
      color: high ? '#ffd1cd' : '#ffe2bf',
      weight: 1.3, opacity: 1, fillOpacity: .85
    }).addTo(group);
    marker.bindPopup(() => popupContent(event));
    marker.bindTooltip(`M ${formatMagnitude(props.mag)} · ${props.place || 'Evento'}`);
    state.renderedMapMarkers.push(marker);
  }
  const truncated = items.length > plotted.length;
  $('mapCount').textContent = `${fmtNumber.format(plotted.length)} epicentros en el mapa${truncated ? ` (máximo ${MAX_MAP_EVENTS} recientes)` : ''}`;
}
function makeEventRow(event, origin) {
  const prop=event.properties, coordinates=event.geometry.coordinates;
  const item=document.createElement('article'); item.className='event';
  const magnitude=document.createElement('div'); magnitude.className='mag'+(prop.mag>=5?' high':''); magnitude.textContent=`M ${formatMagnitude(prop.mag)}`;
  const info=document.createElement('div'); info.className='event-info';
  const title=document.createElement('strong'); title.textContent=prop.place||'Evento sísmico';
  const details=document.createElement('small');
  const distance=formatDistance(event,origin);
  details.textContent=`${timeFormatter.format(new Date(prop.time))} · ${Math.round(coordinates[2] ?? 0)} km de profundidad${distance?' · '+distance:''}`;
  info.append(title,details);
  const buttons=document.createElement('div'); buttons.className='event-actions';
  const locate=document.createElement('button'); locate.type='button'; locate.textContent='Ver en mapa';
  locate.addEventListener('click', () => {
    if (!state.map) return;
    state.map.flyTo([coordinates[1],coordinates[0]], Math.max(state.map.getZoom(), 8), {duration:.65});
    // The map might show only the most recent events. Always open a popup for the selected row.
    L.popup().setLatLng([coordinates[1],coordinates[0]]).setContent(popupContent(event)).openOn(state.map);
    $('map').scrollIntoView({behavior:'smooth', block:'center'});
  });
  const link=document.createElement('a'); link.href=safeEventUrl(prop.url); link.target='_blank'; link.rel='noopener noreferrer'; link.textContent='USGS ↗';
  buttons.append(locate,link); item.append(magnitude,info,buttons);
  return item;
}
function render() {
  setHint();
  const items=filteredEvents();
  const origin=selectedOrigin();
  $('count').textContent=fmtNumber.format(items.length);
  $('max').textContent=items.length?'M '+formatMagnitude(Math.max(...items.map(ev=>ev.properties.mag))):'—';
  $('resultCount').textContent=`${fmtNumber.format(items.length)} eventos`;
  const eventsNode=$('events'); eventsNode.replaceChildren();
  if (!items.length) {
    const empty=document.createElement('p'); empty.className='empty';
    empty.textContent= (selectedZone() === 'nearby' && !origin) ? 'Permite el acceso a ubicación para consultar sismos cercanos.' : (selectedZone()==='custom' && !origin) ? 'Elige un punto en el mapa para comenzar.' : 'No aparecen eventos que cumplan estos filtros en los registros consultados. No implica ausencia de riesgo.';
    eventsNode.append(empty);
  } else {
    const frag=document.createDocumentFragment();
    for(const event of items.slice(0,MAX_LIST_EVENTS))frag.append(makeEventRow(event,origin));
    eventsNode.append(frag);
  }
  $('listNote').textContent=items.length>MAX_LIST_EVENTS?`Se muestran los ${MAX_LIST_EVENTS} eventos más recientes en la lista. Ajusta los filtros para acotar resultados.`:'';
  updateMap(items);
}
async function load(force=false) {
  const feed = getFeed();
  if (!force && feed === state.loadedFeed && state.lastSuccessfulLoad && Date.now()-state.lastSuccessfulLoad<55000) {render();return;}
  const currentLoad=++state.loadId;
  if (state.abortController) state.abortController.abort();
  const controller=new AbortController();state.abortController=controller;
  setStatus('● Consultando USGS');
  $('refresh').disabled=true;
  try {
    const url=`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`;
    const response=await fetch(url,{cache:'no-store',signal:controller.signal});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    if (!Array.isArray(payload.features))throw new Error('Respuesta sin eventos');
    if (currentLoad!==state.loadId)return;
    state.features=payload.features;
    state.loadedFeed=feed;
    state.lastSuccessfulLoad=Date.now();
    $('updated').textContent=shortTime.format(new Date());
    setStatus('● Datos consultados');
    render();
  } catch (error) {
    if (error.name==='AbortError')return;
    if (currentLoad!==state.loadId)return;
    setStatus('● No se pudo actualizar',true);
    if (!state.lastSuccessfulLoad) {
      $('events').replaceChildren();
      const p=document.createElement('p');p.className='empty';
      p.textContent='No fue posible cargar datos de USGS. Comprueba Internet y pulsa «Actualizar datos». Los eventos no se pueden consultar sin conexión.';
      $('events').append(p);
    }
  } finally {if (currentLoad===state.loadId) $('refresh').disabled=false;}
}
function chooseZone() {
  clearMapMessage();
  state.awaitingPick=false;
  $('pick').textContent='⊕ Elegir en el mapa';
  const zone=selectedZone();
  if (zone==='cotacachi')$('radius').value='50';
  if (zone==='imbabura')$('radius').value='150';
  if (zone==='nearby'&&!state.geoCenter)showMapMessage('Pulsa «Usar mi ubicación» para permitir el acceso.');
  if (zone==='custom'&&!state.pickedCenter)showMapMessage('Pulsa «Elegir en el mapa» y después toca el mapa.');
  render();setMapView();
}
function askForLocation() {
  if (!navigator.geolocation) {showMapMessage('Tu navegador no permite obtener la ubicación. Puedes elegir un punto manualmente.');return;}
  $('locate').disabled=true;
  showMapMessage('Solicitando permiso de ubicación…');
  navigator.geolocation.getCurrentPosition(position=>{
    $('locate').disabled=false;
    state.geoCenter={lat:position.coords.latitude,lng:position.coords.longitude};
    $('zone').value='nearby';
    clearMapMessage();
    render();setMapView();
  },error=>{
    $('locate').disabled=false;
    const messages={1:'Permiso de ubicación denegado. Puedes elegir un punto en el mapa.',2:'No se pudo determinar la ubicación. Prueba a elegir un punto.',3:'La ubicación tardó demasiado. Inténtalo otra vez.'};
    showMapMessage(messages[error.code]||'No se pudo obtener tu ubicación.');
  },{enableHighAccuracy:false,timeout:12000,maximumAge:60000});
}
function pickMapLocation() {
  if (!state.map) {showMapMessage('El mapa no está disponible. Comprueba Internet e intenta recargar.');return;}
  state.awaitingPick=true;
  $('pick').textContent='Toca el punto en el mapa…';
  showMapMessage('Toca cualquier punto del mapa para fijar el centro de la consulta.');
  $('map').scrollIntoView({behavior:'smooth',block:'center'});
}
function main() {
  initializeMap();
  $('zone').addEventListener('change',chooseZone);
  $('period').addEventListener('change',()=>load());
  $('minmag').addEventListener('change',()=>load());
  $('radius').addEventListener('change',()=>{setHint();render();setMapView();});
  $('locate').addEventListener('click',askForLocation);
  $('pick').addEventListener('click',pickMapLocation);
  $('refresh').addEventListener('click',()=>load(true));
  setHint(); setMapView(); load(true);
  setInterval(()=>{if(!document.hidden)load(true);},60000);
  if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
main();
