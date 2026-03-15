/**
 * perimeter.js — Live NIFC fire perimeter via WFIGS ArcGIS REST.
 * Fetches the current perimeter for the fire and optionally updates
 * the acreage badge with the live reported value.
 */

export async function addPerimeterLayer(map, config) {
  if (!config || !config.url) return null

  let geojson
  try {
    const params = new URLSearchParams({
      where: config.where || '1=1',
      outFields: 'poly_IncidentName,poly_GISAcres,attr_PercentContained,attr_POOState,poly_DateCurrent',
      f: 'geojson',
      outSR: '4326',
    })
    const resp = await fetch(`${config.url}/query?${params}`)
    geojson = await resp.json()
  } catch (e) {
    console.warn('NIFC perimeter fetch failed:', e)
    return null
  }

  if (!geojson.features || geojson.features.length === 0) {
    console.warn('NIFC perimeter: no features returned')
    return null
  }

  map.addSource('fire-perimeter', { type: 'geojson', data: geojson })

  // Fill (very subtle)
  map.addLayer({
    id: 'perimeter-fill',
    type: 'fill',
    source: 'fire-perimeter',
    paint: {
      'fill-color': '#FF4400',
      'fill-opacity': 0.06,
    },
  }, 'place-labels')

  // Outline
  map.addLayer({
    id: 'perimeter-line',
    type: 'line',
    source: 'fire-perimeter',
    paint: {
      'line-color': '#FF4400',
      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 12, 3],
      'line-opacity': 0.85,
      'line-dasharray': [4, 2],
    },
  }, 'place-labels')

  // Compute bounding box from all feature coordinates
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const feature of geojson.features) {
    const coords = flattenCoords(feature.geometry)
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }
  const bbox = [[minLng, minLat], [maxLng, maxLat]]

  return {
    properties: geojson.features[0]?.properties ?? null,
    bbox,
  }
}

function flattenCoords(geometry) {
  const out = []
  function walk(c) {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number') { out.push(c); return }
    c.forEach(walk)
  }
  walk(geometry.coordinates)
  return out
}
