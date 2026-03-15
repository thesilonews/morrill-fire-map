/**
 * panel.js — Left control panel: layer switcher, collapsible sections.
 */

import { showSatelliteLayer } from '../layers/satellite.js'
import { setFirePassesVisible } from '../layers/fire-points.js'
import { setBuildingsVisible, setParcelsVisible } from '../layers/buildings.js'

export function initPanel(map, config) {
  const { satellite, firePasses, goesTimelapse, goesFdc } = config.layers

  // ── Satellite radio group ──────────────────────────────────
  const satGroup = document.getElementById('satellite-group')
  satellite.forEach(layer => {
    const row = document.createElement('label')
    row.className = 'layer-row sat-row'
    row.innerHTML = `
      <div class="sat-row-inner">
        <input type="radio" name="satellite" value="${layer.id}" ${layer.default ? 'checked' : ''} />
        <span class="toggle-track" style="border-radius:50%;width:20px;height:20px;flex-shrink:0"></span>
        <div class="layer-meta">
          <span class="layer-label">${layer.label}</span>
          <span class="layer-sub">${layer.sublabel}</span>
        </div>
      </div>
      ${layer.legendNote ? `<span class="layer-sub" style="padding-left:32px;display:block;font-size:11px">${layer.legendNote}</span>` : ''}
    `
    // Use a styled radio indicator instead of the input
    const input = row.querySelector('input')
    const indicator = row.querySelector('.toggle-track')
    indicator.style.cssText = `
      display:block;width:16px;height:16px;border-radius:50%;
      border:2px solid var(--text-sub);background:var(--bg);
      flex-shrink:0;transition:all 0.15s;cursor:pointer;
    `
    function updateIndicator() {
      if (input.checked) {
        indicator.style.borderColor = 'var(--accent)'
        indicator.style.background = 'var(--accent)'
      } else {
        indicator.style.borderColor = 'var(--text-sub)'
        indicator.style.background = 'var(--bg)'
      }
    }
    updateIndicator()
    input.addEventListener('change', () => {
      if (input.checked) {
        showSatelliteLayer(map, layer.id, satellite)
        satGroup.querySelectorAll('input[type=radio]').forEach(r => {
          const ind = r.closest('.sat-row').querySelector('.toggle-track')
          ind.style.borderColor = r.checked ? 'var(--accent)' : 'var(--text-sub)'
          ind.style.background  = r.checked ? 'var(--accent)' : 'var(--bg)'
        })
      }
    })
    satGroup.appendChild(row)
  })

  // ── GOES FDC sublabel ──────────────────────────────────────
  if (goesFdc) {
    document.getElementById('goes-fdc-sub').textContent = goesFdc.sublabel
  }

  // ── Fire passes toggle ─────────────────────────────────────
  document.getElementById('toggle-fire-passes').addEventListener('change', e => {
    setFirePassesVisible(map, e.target.checked, firePasses)
  })

  // ── GOES FDC toggle ────────────────────────────────────────
  document.getElementById('toggle-goes-fdc').addEventListener('change', e => {
    if (map.getLayer('goes-fdc-points')) {
      map.setLayoutProperty('goes-fdc-points', 'visibility', e.target.checked ? 'visible' : 'none')
    }
  })

  // ── Buildings toggle ───────────────────────────────────────
  document.getElementById('toggle-buildings').addEventListener('change', e => {
    setBuildingsVisible(map, e.target.checked)
  })

  // ── Parcels toggle ─────────────────────────────────────────
  document.getElementById('toggle-parcels').addEventListener('change', e => {
    setParcelsVisible(map, e.target.checked)
  })

  // ── Timelapse label ────────────────────────────────────────
  if (goesTimelapse) {
    document.getElementById('timelapse-label').textContent = goesTimelapse.label
    document.getElementById('timelapse-sub').textContent   = goesTimelapse.sublabel
  }

  // ── Collapsible sections ───────────────────────────────────
  document.querySelectorAll('.section-header.collapsible').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.target
      const target = document.getElementById(targetId)
      header.classList.toggle('collapsed')
      target.classList.toggle('hidden')
    })
  })

  // ── Panel collapse toggle ──────────────────────────────────
  document.getElementById('panel-toggle').addEventListener('click', () => {
    document.getElementById('panel').classList.toggle('panel-collapsed')
  })
}
