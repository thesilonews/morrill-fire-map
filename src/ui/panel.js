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

  // ── Perimeter toggle ───────────────────────────────────────
  const perimToggle = document.getElementById('toggle-perimeter')
  if (perimToggle) {
    perimToggle.addEventListener('change', e => {
      const v = e.target.checked ? 'visible' : 'none'
      if (map.getLayer('perimeter-fill')) map.setLayoutProperty('perimeter-fill', 'visibility', v)
      if (map.getLayer('perimeter-line')) map.setLayoutProperty('perimeter-line', 'visibility', v)
    })
  }

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

  // ── Panel collapse toggle (desktop) ───────────────────────
  document.getElementById('panel-toggle').addEventListener('click', () => {
    document.getElementById('panel').classList.toggle('panel-collapsed')
  })

  // ── Mobile bottom-sheet drag ───────────────────────────────
  initMobilePanelDrag()
}

function initMobilePanelDrag() {
  const panel = document.getElementById('panel')
  const peekLabel = document.getElementById('panel-peek-label')
  if (!panel) return

  let startY = 0
  let startTranslate = 0
  let isDragging = false

  function getTranslateY(el) {
    const style = window.getComputedStyle(el)
    const matrix = new DOMMatrix(style.transform)
    return matrix.m42
  }

  function snapPanel(velocityY) {
    const translate = getTranslateY(panel)
    const panelH = panel.offsetHeight
    // Snap thresholds: open = 0, half = 50%, closed = ~100% - 52px peek
    const openThresh  = panelH * 0.25
    const halfThresh  = panelH * 0.65

    panel.classList.remove('dragging')

    if (velocityY > 400 || translate > halfThresh) {
      // Flick down or dragged past half → close to peek
      panel.classList.remove('panel-open', 'panel-half')
    } else if (velocityY < -400 || translate < openThresh) {
      // Flick up or dragged near top → open
      panel.classList.remove('panel-half')
      panel.classList.add('panel-open')
    } else {
      // Middle zone → half
      panel.classList.remove('panel-open')
      panel.classList.add('panel-half')
    }
  }

  let lastY = 0
  let lastTime = 0
  let velocityY = 0

  panel.addEventListener('touchstart', e => {
    // Only initiate drag from the drag handle area (top 52px of panel)
    const touch = e.touches[0]
    const rect = panel.getBoundingClientRect()
    if (touch.clientY - rect.top > 52) return

    isDragging = true
    startY = touch.clientY
    startTranslate = getTranslateY(panel)
    lastY = touch.clientY
    lastTime = Date.now()
    velocityY = 0
    panel.classList.add('dragging')
  }, { passive: true })

  panel.addEventListener('touchmove', e => {
    if (!isDragging) return
    const touch = e.touches[0]
    const now = Date.now()
    const dt = now - lastTime || 16
    velocityY = ((touch.clientY - lastY) / dt) * 1000
    lastY = touch.clientY
    lastTime = now

    const delta = touch.clientY - startY
    const newTranslate = Math.max(0, startTranslate + delta)
    panel.style.transform = `translateY(${newTranslate}px)`
  }, { passive: true })

  panel.addEventListener('touchend', () => {
    if (!isDragging) return
    isDragging = false
    panel.style.transform = ''
    snapPanel(velocityY)
  })

  // Tap on peek label to open
  if (peekLabel) {
    peekLabel.addEventListener('click', () => {
      if (panel.classList.contains('panel-open')) {
        panel.classList.remove('panel-open', 'panel-half')
      } else {
        panel.classList.add('panel-open')
        panel.classList.remove('panel-half')
      }
    })
  }
}
