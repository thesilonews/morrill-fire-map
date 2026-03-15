/**
 * search.js — "Find my property" address geocoder.
 * Uses Nominatim (free, no API key). Flies to result, enables buildings + parcels.
 */

export function initSearch(map, config) {
  const input  = document.getElementById('search-input')
  const btn    = document.getElementById('search-btn')

  async function doSearch() {
    const query = input.value.trim()
    if (!query) return

    btn.textContent = '…'
    btn.disabled = true

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`
      const results = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'SiloFireMap/1.0' }
      }).then(r => r.json())

      if (!results.length) {
        showSearchResult(null, query, map, config)
        return
      }

      const { lat, lon, display_name } = results[0]
      const lngLat = [parseFloat(lon), parseFloat(lat)]

      // Fly to location
      map.flyTo({ center: lngLat, zoom: 14, duration: 1200 })

      // Auto-enable buildings + parcels
      document.getElementById('toggle-buildings').checked = true
      document.getElementById('toggle-parcels').checked = true
      document.getElementById('toggle-buildings').dispatchEvent(new Event('change'))
      document.getElementById('toggle-parcels').dispatchEvent(new Event('change'))

      // Drop a marker
      clearSearchMarker()
      window._searchMarker = new (await import('maplibre-gl')).default.Marker({ color: '#FF6B00' })
        .setLngLat(lngLat)
        .addTo(map)

      showSearchResult(lngLat, display_name, map, config)

      // Update shareable URL
      const url2 = new URL(location.href)
      url2.searchParams.set('lat', lngLat[1].toFixed(5))
      url2.searchParams.set('lng', lngLat[0].toFixed(5))
      url2.searchParams.set('zoom', '14')
      history.replaceState(null, '', url2)

    } catch (err) {
      console.error('Search error:', err)
    } finally {
      btn.textContent = '→'
      btn.disabled = false
    }
  }

  btn.addEventListener('click', doSearch)
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch() })
}

function showSearchResult(lngLat, name, map, config) {
  const card = document.getElementById('popup-card')
  const body = document.getElementById('popup-body')

  if (!lngLat) {
    body.innerHTML = `
      <div class="popup-title">📍 Not found</div>
      <p style="font-size:12px;color:var(--text-sub)">
        No results for "${name}". Try a county road, town name, or coordinates.
      </p>
    `
    card.classList.remove('hidden')
    return
  }

  // Rough check: is point within fire bbox?
  const fireBbox = config.map.bounds
  const inArea = lngLat[0] >= fireBbox[0][0] && lngLat[0] <= fireBbox[1][0] &&
                 lngLat[1] >= fireBbox[0][1] && lngLat[1] <= fireBbox[1][1]

  body.innerHTML = `
    <div class="popup-title">📍 ${name.split(',').slice(0, 2).join(',')}</div>
    <div class="popup-row">
      <span class="popup-key">In fire area</span>
      <span class="popup-val" style="color:${inArea ? '#FF6B00' : '#888'}">
        ${inArea ? 'Yes — check imagery' : 'Outside mapped area'}
      </span>
    </div>
    <div class="popup-row">
      <span class="popup-key">Coordinates</span>
      <span class="popup-val">${lngLat[1].toFixed(4)}°N, ${Math.abs(lngLat[0]).toFixed(4)}°W</span>
    </div>
    <div class="popup-disclaimer">
      ⚠ This map shows satellite data — not confirmed damage.<br/>
      ${config.fire.emergencyContact}
    </div>
  `
  card.classList.remove('hidden')
}

function clearSearchMarker() {
  if (window._searchMarker) {
    window._searchMarker.remove()
    window._searchMarker = null
  }
}
