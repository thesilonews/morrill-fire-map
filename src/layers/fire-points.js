/**
 * fire-points.js — MODIS/GOES fire detection point layers.
 *
 * All three passes are loaded as separate GeoJSON sources.
 * The time slider shows/hides passes by changing layer opacity
 * and shows a "ghost" of the previous pass at 20% opacity.
 */

const FRP_MIN = 50
const FRP_MAX = 950

// Log-scale radius interpolation: 4px at 50 MW → 18px at 907 MW
const circleRadius = [
  'interpolate', ['exponential', 2],
  ['max', ['get', 'frp_mw'], FRP_MIN],
  FRP_MIN, 4,
  150,  7,
  400,  12,
  FRP_MAX, 18,
]

// 4-stop color ramp: amber → orange → red-orange → white-hot
const circleColor = [
  'interpolate', ['linear'],
  ['max', ['get', 'frp_mw'], FRP_MIN],
  FRP_MIN, '#F5A623',
  150,     '#FF6B00',
  400,     '#FF2200',
  FRP_MAX, '#FFFFFF',
]

export async function addFirePointLayers(map, passConfigs) {
  for (const pass of passConfigs) {
    const geojson = await fetch(pass.geojson).then(r => r.json())

    map.addSource(`fire-src-${pass.id}`, {
      type: 'geojson',
      data: geojson,
    })

    // Main layer
    map.addLayer({
      id: `fire-points-${pass.id}`,
      type: 'circle',
      source: `fire-src-${pass.id}`,
      paint: {
        'circle-radius': circleRadius,
        'circle-color': circleColor,
        'circle-opacity': 0,
        'circle-opacity-transition': { duration: 500 },
        'circle-stroke-width': 1,
        'circle-stroke-color': '#CC4400',
        'circle-stroke-opacity': 0,
        'circle-stroke-opacity-transition': { duration: 500 },
      },
    })

    // Ghost layer (previous pass remnant at 20% opacity)
    map.addLayer({
      id: `fire-ghost-${pass.id}`,
      type: 'circle',
      source: `fire-src-${pass.id}`,
      paint: {
        'circle-radius': circleRadius,
        'circle-color': circleColor,
        'circle-opacity': 0,
        'circle-opacity-transition': { duration: 800 },
        'circle-stroke-width': 0,
      },
    })
  }
}

/**
 * Show a specific pass. Previous pass becomes a ghost at 20% opacity.
 * All others are hidden.
 */
export function showFirePass(map, activeIdx, passConfigs) {
  passConfigs.forEach((pass, idx) => {
    if (idx === activeIdx) {
      // Active pass: full opacity
      map.setPaintProperty(`fire-points-${pass.id}`, 'circle-opacity', 0.9)
      map.setPaintProperty(`fire-points-${pass.id}`, 'circle-stroke-opacity', 0.6)
      map.setPaintProperty(`fire-ghost-${pass.id}`, 'circle-opacity', 0)
    } else if (idx === activeIdx - 1) {
      // Previous pass: ghost at 20%
      map.setPaintProperty(`fire-points-${pass.id}`, 'circle-opacity', 0)
      map.setPaintProperty(`fire-points-${pass.id}`, 'circle-stroke-opacity', 0)
      map.setPaintProperty(`fire-ghost-${pass.id}`, 'circle-opacity', 0.2)
    } else {
      // All others: hidden
      map.setPaintProperty(`fire-points-${pass.id}`, 'circle-opacity', 0)
      map.setPaintProperty(`fire-points-${pass.id}`, 'circle-stroke-opacity', 0)
      map.setPaintProperty(`fire-ghost-${pass.id}`, 'circle-opacity', 0)
    }
  })
}

export function setFirePassesVisible(map, visible, passConfigs) {
  // Called by panel toggle — hides all passes when unchecked
  const opacity = visible ? 0.9 : 0
  passConfigs.forEach(pass => {
    map.setPaintProperty(`fire-points-${pass.id}`, 'circle-opacity', opacity)
    map.setPaintProperty(`fire-ghost-${pass.id}`, 'circle-opacity', 0)
  })
}
