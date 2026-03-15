/**
 * buildings.js — Building footprints and parcel lines.
 *
 * Buildings: Overture Maps GeoJSON → ideally converted to PMTiles,
 *   but falls back to inline GeoJSON for dev (visible at zoom >= 12).
 * Parcels: ArcGIS REST or PMTiles, visible at zoom >= 13.
 */

export async function addBuildingsLayer(map, config) {
  if (!config) return

  if (config.pmtilesUrl) {
    // Production: serve from PMTiles
    map.addSource('buildings', {
      type: 'vector',
      url: `pmtiles://${config.pmtilesUrl}`,
    })
    map.addLayer({
      id: 'buildings-fill',
      type: 'fill',
      source: 'buildings',
      'source-layer': 'buildings',
      minzoom: config.minZoom,
      paint: {
        'fill-color': '#E8D5A3',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.1, 16, 0.25],
      },
      layout: { visibility: 'none' },
    })
    map.addLayer({
      id: 'buildings-outline',
      type: 'line',
      source: 'buildings',
      'source-layer': 'buildings',
      minzoom: config.minZoom,
      paint: {
        'line-color': '#E8D5A3',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 16, 1.2],
        'line-opacity': 0.6,
      },
      layout: { visibility: 'none' },
    })
  } else if (config.geojson) {
    // Dev fallback: inline GeoJSON (large — only practical at high zoom)
    const data = await fetch(config.geojson).then(r => r.json())
    map.addSource('buildings', { type: 'geojson', data })
    map.addLayer({
      id: 'buildings-fill',
      type: 'fill',
      source: 'buildings',
      minzoom: config.minZoom,
      paint: {
        'fill-color': '#E8D5A3',
        'fill-opacity': 0.15,
      },
      layout: { visibility: 'none' },
    })
    map.addLayer({
      id: 'buildings-outline',
      type: 'line',
      source: 'buildings',
      minzoom: config.minZoom,
      paint: {
        'line-color': '#E8D5A3',
        'line-width': 0.8,
        'line-opacity': 0.6,
      },
      layout: { visibility: 'none' },
    })
  }
}

export async function addParcelsLayer(map, config) {
  if (!config || (!config.pmtilesUrl && !config.arcgisUrl && !config.arcgisSources)) return

  if (config.pmtilesUrl) {
    map.addSource('parcels', {
      type: 'vector',
      url: `pmtiles://${config.pmtilesUrl}`,
    })
    map.addLayer({
      id: 'parcels-line',
      type: 'line',
      source: 'parcels',
      'source-layer': 'parcels',
      minzoom: config.minZoom,
      paint: {
        'line-color': '#8A7A60',
        'line-width': 0.6,
        'line-opacity': 0.7,
        'line-dasharray': [3, 2],
      },
      layout: { visibility: 'none' },
    })
  } else if (config.arcgisSources || config.arcgisUrl) {
    // ArcGIS MapServer REST — paginate /query endpoint, merge counties, load as GeoJSON
    const sources = config.arcgisSources || [{ url: config.arcgisUrl }]
    const allFeatures = (
      await Promise.all(sources.map(s => fetchArcGISGeoJSON(s.url, s.county)))
    ).flat()
    map.addSource('parcels', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: allFeatures },
    })
    map.addLayer({
      id: 'parcels-line',
      type: 'line',
      source: 'parcels',
      minzoom: config.minZoom,
      paint: {
        'line-color': '#8A7A60',
        'line-width': 0.6,
        'line-opacity': 0.7,
        'line-dasharray': [3, 2],
      },
      layout: { visibility: 'none' },
    })
  }
}

async function fetchArcGISGeoJSON(baseUrl, county) {
  const queryUrl = `${baseUrl}/query`
  let offset = 0
  const pageSize = 1000
  const features = []

  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'PID,acres,SITUS_ADDR',
      f: 'geojson',
      outSR: '4326',
      resultOffset: offset,
      resultRecordCount: pageSize,
    })
    const resp = await fetch(`${queryUrl}?${params}`)
    const data = await resp.json()
    if (!data.features || !data.features.length) break
    if (county) {
      data.features.forEach(f => { f.properties._county = county })
    }
    features.push(...data.features)
    if (data.features.length < pageSize) break
    offset += pageSize
  }

  return features
}

export function setBuildingsVisible(map, visible) {
  const v = visible ? 'visible' : 'none'
  if (map.getLayer('buildings-fill'))   map.setLayoutProperty('buildings-fill', 'visibility', v)
  if (map.getLayer('buildings-outline')) map.setLayoutProperty('buildings-outline', 'visibility', v)
}

export function setParcelsVisible(map, visible) {
  if (map.getLayer('parcels-line')) {
    map.setLayoutProperty('parcels-line', 'visibility', visible ? 'visible' : 'none')
  }
}
