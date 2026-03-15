/**
 * satellite.js — Raster satellite imagery layers.
 * Layers are loaded from COG files (local dev) or R2 (production).
 * Only one satellite layer is visible at a time (radio group).
 */

export async function addSatelliteLayers(map, satConfigs) {
  for (const layer of satConfigs) {
    map.addSource(`sat-${layer.id}`, {
      type: 'raster',
      url: `cog://${resolveUrl(layer.url)}`,
      tileSize: 256,
    })

    map.addLayer({
      id: `sat-${layer.id}`,
      type: 'raster',
      source: `sat-${layer.id}`,
      paint: {
        'raster-opacity': 0,
        'raster-opacity-transition': { duration: 400 },
      },
    }, 'place-labels') // insert below labels
  }
}

export function showSatelliteLayer(map, activeId, satConfigs) {
  for (const layer of satConfigs) {
    const opacity = layer.id === activeId ? 1 : 0
    map.setPaintProperty(`sat-${layer.id}`, 'raster-opacity', opacity)
  }
}

function resolveUrl(url) {
  // In dev, resolve relative paths against page origin
  if (url.startsWith('../') || url.startsWith('./')) {
    return new URL(url, location.href).href
  }
  return url
}
