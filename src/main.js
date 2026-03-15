/**
 * main.js — Silo Fire Map
 *
 * Config-driven wildfire interactive map built on MapLibre GL JS.
 * To reuse for a new fire: copy this map/ directory, update fire.config.json.
 *
 * Architecture:
 *   fire.config.json  → all fire-specific data (layers, bbox, copy)
 *   layers/           → satellite, fire-points, buildings, reference
 *   ui/               → panel, timeslider, legend, search, goes-player
 */

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { cogProtocol } from '@geomatico/maplibre-cog-protocol'

import { initPanel } from './ui/panel.js'
import { initTimeSlider } from './ui/timeslider.js'
import { initGoesPlayer } from './ui/goes-player.js'
import { initSearch } from './ui/search.js'
import { initIntro } from './ui/intro.js'
import { addSatelliteLayers, showSatelliteLayer } from './layers/satellite.js'
import { addFirePointLayers, showFirePass } from './layers/fire-points.js'
import { addBuildingsLayer, addParcelsLayer } from './layers/buildings.js'
import { addReferenceLayers } from './layers/reference.js'

// ── Register protocols ──────────────────────────────────────────
const pmtilesProtocol = new Protocol()
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile.bind(pmtilesProtocol))
maplibregl.addProtocol('cog', cogProtocol)

// ── Load config ─────────────────────────────────────────────────
const CONFIG = await fetch('./fire.config.json').then(r => r.json())

// In production, rewrite ../data/ paths to the GCS bucket base URL.
// Set VITE_ASSETS_BASE in Vercel env vars:
//   https://storage.googleapis.com/silo-assets/morrill-2026-03
const ASSETS_BASE = import.meta.env.VITE_ASSETS_BASE
if (ASSETS_BASE) {
  const rewrite = s => typeof s === 'string' ? s.replace(/^\.\.\/data\/[^/]+\//, ASSETS_BASE + '/') : s
  const { satellite, firePasses, goesTimelapse, goesFdc, buildings, reference } = CONFIG.layers
  satellite.forEach(l => { l.url = rewrite(l.url) })
  firePasses.forEach(p => { p.geojson = rewrite(p.geojson) })
  goesTimelapse.url = rewrite(goesTimelapse.url)
  if (goesFdc) goesFdc.geojson = rewrite(goesFdc.geojson)
  if (buildings.geojson) buildings.geojson = rewrite(buildings.geojson)
  reference.counties = rewrite(reference.counties)
  reference.states   = rewrite(reference.states)
  reference.lakeMcConaughy = rewrite(reference.lakeMcConaughy)
}

// Update page metadata from config
document.title = `${CONFIG.fire.name} Map | The Silo`
document.getElementById('badge-acreage').textContent =
  CONFIG.fire.acreage.toLocaleString() + ' acres'
document.getElementById('about-body').textContent = CONFIG.fire.about
document.getElementById('data-timestamp').textContent =
  `Last updated: ${new Date(CONFIG.fire.lastUpdated).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  })} · ${CONFIG.fire.attribution}`

// ── Init map ────────────────────────────────────────────────────
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/dark',
    sources: {
      protomaps: {
        type: 'vector',
        url: 'https://api.protomaps.com/tiles/v4.json?key=e95d81ed96e3e784',
        attribution: '© <a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    layers: [
      // Dark basemap layers from Protomaps
      { id: 'background', type: 'background', paint: { 'background-color': '#1a1a1a' } },
      { id: 'earth', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': '#1e1e1e' } },
      { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#0d2b3e' } },
      { id: 'roads-minor', type: 'line', source: 'protomaps', 'source-layer': 'roads', filter: ['<', ['get', 'pmap:kind_detail'], 3], paint: { 'line-color': '#2a2a2a', 'line-width': 0.8 } },
      { id: 'roads-major', type: 'line', source: 'protomaps', 'source-layer': 'roads', filter: ['>=', ['get', 'pmap:kind_detail'], 3], paint: { 'line-color': '#3a3a3a', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 2] } },
      { id: 'place-labels', type: 'symbol', source: 'protomaps', 'source-layer': 'places', layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: { 'text-color': '#c8c8c8', 'text-halo-color': '#111', 'text-halo-width': 1 } },
    ],
  },
  center: CONFIG.map.center,
  zoom: CONFIG.map.zoom,
  minZoom: CONFIG.map.minZoom,
  maxZoom: CONFIG.map.maxZoom,
  maxBounds: CONFIG.map.bounds,
  attributionControl: false,
})

map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-right')
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

// ── Wire up all layers and UI after map loads ───────────────────
map.on('load', async () => {
  // Reference layers (counties, lake, states)
  await addReferenceLayers(map, CONFIG.layers.reference)

  // Satellite raster layers
  await addSatelliteLayers(map, CONFIG.layers.satellite)
  // Default: show S2 true color
  const defaultSat = CONFIG.layers.satellite.find(l => l.default)
  if (defaultSat) showSatelliteLayer(map, defaultSat.id, CONFIG.layers.satellite)

  // Fire detection points (all 3 passes loaded, filtered by time slider)
  await addFirePointLayers(map, CONFIG.layers.firePasses)
  // Default: show Pass 1 (peak) — index 1
  const defaultPassIdx = CONFIG.layers.firePasses.findIndex(p => p.default)
  showFirePass(map, defaultPassIdx >= 0 ? defaultPassIdx : 1, CONFIG.layers.firePasses)

  // Buildings (off by default, zoom-gated)
  await addBuildingsLayer(map, CONFIG.layers.buildings)

  // Parcels (off by default, zoom-gated)
  await addParcelsLayer(map, CONFIG.layers.parcels)

  // ── UI modules ─────────────────────────────────────────────
  initPanel(map, CONFIG)
  initTimeSlider(map, CONFIG.layers.firePasses)
  initGoesPlayer(map, CONFIG.layers.goesTimelapse)
  initSearch(map, CONFIG)

  // Restore shared URL state
  restoreUrlState(map, CONFIG)

  // Intro modal — always init so buttons work; it decides internally whether to show
  initIntro(CONFIG.fire)

  // Start tracking URL state only after map load, so moveend doesn't
  // pollute the URL before the intro check runs
  map.on('moveend', () => {
    const { lng, lat } = map.getCenter()
    const zoom = map.getZoom().toFixed(1)
    const url = new URL(location.href)
    url.searchParams.set('lat', lat.toFixed(5))
    url.searchParams.set('lng', lng.toFixed(5))
    url.searchParams.set('zoom', zoom)
    history.replaceState(null, '', url)
  })
})

// ── Popup on fire point click ───────────────────────────────────
map.on('click', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: CONFIG.layers.firePasses.map(p => `fire-points-${p.id}`),
  })
  if (features.length === 0) {
    document.getElementById('popup-card').classList.add('hidden')
    return
  }
  showFirePopup(features[0].properties)
})

map.on('mouseenter', 'fire-points', () => { map.getCanvas().style.cursor = 'pointer' })
map.on('mouseleave', 'fire-points', () => { map.getCanvas().style.cursor = '' })

function showFirePopup(props) {
  const frp = parseFloat(props.frp_mw || 0)
  const level = frp > 700 ? 'EXTREME' : frp > 400 ? 'HIGH' : frp > 150 ? 'MODERATE' : 'LOW'
  const cls   = frp > 700 ? 'fire-extreme' : frp > 400 ? 'fire-high' : frp > 150 ? 'fire-mid' : 'fire-low'

  document.getElementById('popup-body').innerHTML = `
    <div class="popup-title">🛰 Satellite Fire Detection</div>
    <div class="popup-row">
      <span class="popup-key">Detected</span>
      <span class="popup-val">${props.local_time_mdt || props.date || '—'}</span>
    </div>
    <div class="popup-row">
      <span class="popup-key">Satellite</span>
      <span class="popup-val">${props.sensor || '—'}</span>
    </div>
    <div class="popup-row">
      <span class="popup-key">Intensity</span>
      <span class="popup-val ${cls}">${level} (${frp.toFixed(0)} MW)</span>
    </div>
    <span class="expand-link" onclick="this.nextElementSibling.classList.toggle('open');this.textContent=this.textContent==='What is this? ⓘ'?'▲ Close':'What is this? ⓘ'">What is this? ⓘ</span>
    <div class="expand-content">
      NASA satellites detect heat from fires even through smoke. Each dot is a ~375-meter area where the satellite measured fire-level temperatures. Intensity (FRP) is in megawatts — higher numbers mean more intense burning.
    </div>
  `
  document.getElementById('popup-card').classList.remove('hidden')
}

document.getElementById('popup-close').addEventListener('click', () => {
  document.getElementById('popup-card').classList.add('hidden')
})

// ── URL state (shareable links) ─────────────────────────────────
function restoreUrlState(map, config) {
  const params = new URL(location.href).searchParams
  const lat  = parseFloat(params.get('lat'))
  const lng  = parseFloat(params.get('lng'))
  const zoom = parseFloat(params.get('zoom'))
  if (!isNaN(lat) && !isNaN(lng)) {
    map.flyTo({ center: [lng, lat], zoom: isNaN(zoom) ? 13 : zoom })
  }
}

export { map, CONFIG }
