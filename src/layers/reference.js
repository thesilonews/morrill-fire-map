/**
 * reference.js — Static reference layers: counties, states, lake.
 * Always visible, non-toggleable context anchors.
 */

export async function addReferenceLayers(map, refConfig) {
  // States (very thin context lines)
  if (refConfig.states) {
    const states = await fetch(refConfig.states).then(r => r.json())
    map.addSource('states', { type: 'geojson', data: states })
    map.addLayer({
      id: 'states-line',
      type: 'line',
      source: 'states',
      paint: { 'line-color': '#444', 'line-width': 1 },
    })
  }

  // Counties
  if (refConfig.counties) {
    const counties = await fetch(refConfig.counties).then(r => r.json())
    map.addSource('counties', { type: 'geojson', data: counties })
    map.addLayer({
      id: 'counties-line',
      type: 'line',
      source: 'counties',
      paint: {
        'line-color': '#6B8FA3',
        'line-width': 1.5,
        'line-opacity': 0.7,
      },
    })
    map.addLayer({
      id: 'counties-label',
      type: 'symbol',
      source: 'counties',
      layout: {
        'text-field': ['get', 'NAME'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-letter-spacing': 0.08,
        'text-transform': 'uppercase',
      },
      paint: {
        'text-color': '#D4C5A9',
        'text-halo-color': 'rgba(17,17,17,0.7)',
        'text-halo-width': 1,
      },
    })
  }

  // Lake McConaughy
  if (refConfig.lakeMcConaughy) {
    const lake = await fetch(refConfig.lakeMcConaughy).then(r => r.json())
    map.addSource('lake-mcconaughy', { type: 'geojson', data: lake })
    map.addLayer({
      id: 'lake-fill',
      type: 'fill',
      source: 'lake-mcconaughy',
      paint: { 'fill-color': '#1C4F6B', 'fill-opacity': 0.85 },
    })
    map.addLayer({
      id: 'lake-outline',
      type: 'line',
      source: 'lake-mcconaughy',
      paint: { 'line-color': '#2A6B8F', 'line-width': 1 },
    })
    map.addLayer({
      id: 'lake-label',
      type: 'symbol',
      source: 'lake-mcconaughy',
      layout: {
        'text-field': 'Lake McConaughy',
        'text-font': ['Noto Sans Italic'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#4A9DBF',
        'text-halo-color': 'rgba(17,17,17,0.7)',
        'text-halo-width': 1,
      },
    })
  }
}
