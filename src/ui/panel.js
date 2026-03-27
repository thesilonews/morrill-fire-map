/**
 * panel.js — Left control panel: layer switcher, collapsible sections.
 */

import { showSatelliteLayer } from '../layers/satellite.js'
import { setFirePassesVisible } from '../layers/fire-points.js'
import { setBuildingsVisible, setParcelsVisible } from '../layers/buildings.js'

export function initPanel(map, config) {
  const { satellite, firePasses, goesTimelapse, goesFdc } = config.layers

  // ── Satellite group+band panel ─────────────────────────────
  const satGroup = document.getElementById('satellite-group')

  // Build group map: gk → [layers]
  const groups = new Map()
  satellite.forEach(layer => {
    const gk = layer.group || layer.id
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk).push(layer)
  })

  // Determine initial active group from the default-flagged layer
  const defaultLayer = satellite.find(l => l.default) || satellite[0]
  let activeGroup = defaultLayer.group || defaultLayer.id

  // Per-group band state — default to 'swir' when available
  const bandState = {}
  groups.forEach((layers, gk) => {
    const hasSwir = layers.some(l => l.band === 'swir')
    bandState[gk] = hasSwir ? 'swir' : (layers[0].band || null)
  })
  if (defaultLayer.band) bandState[activeGroup] = defaultLayer.band

  function activeLayerId(gk) {
    const layers = groups.get(gk)
    const band   = bandState[gk]
    const match  = band ? layers.find(l => l.band === band) : null
    return match ? match.id : layers[0].id
  }

  function updateIndicators() {
    satGroup.querySelectorAll('.sat-row[data-group]').forEach(row => {
      const gk     = row.dataset.group
      const isActive = gk === activeGroup
      const dot    = row.querySelector('.sat-indicator')
      const toggle = row.querySelector('.band-toggle')
      if (dot) {
        dot.style.borderColor = isActive ? 'var(--accent)' : 'var(--text-sub)'
        dot.style.background  = isActive ? 'var(--accent)' : 'var(--bg)'
      }
      if (toggle) {
        toggle.style.display = isActive ? 'flex' : 'none'
        toggle.querySelectorAll('.band-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.band === bandState[gk])
        })
      }
    })
  }

  function selectGroup(gk) {
    activeGroup = gk
    showSatelliteLayer(map, activeLayerId(gk), satellite)
    updateIndicators()
  }

  groups.forEach((layers, gk) => {
    const first    = layers[0]
    const hasBoth  = layers.some(l => l.band === 'swir') && layers.some(l => l.band === 'tc')
    const isActive = gk === activeGroup

    const row = document.createElement('div')
    row.className = 'layer-row sat-row'
    row.dataset.group = gk

    // Dot indicator
    const dot = document.createElement('div')
    dot.className = 'sat-indicator'
    dot.style.cssText = `
      display:block;width:16px;height:16px;border-radius:50%;
      border:2px solid ${isActive ? 'var(--accent)' : 'var(--text-sub)'};
      background:${isActive ? 'var(--accent)' : 'var(--bg)'};
      flex-shrink:0;transition:all 0.15s;
    `

    const meta = document.createElement('div')
    meta.className = 'layer-meta'
    meta.innerHTML = `
      <span class="layer-label">${first.label}</span>
      <span class="layer-sub">${first.sublabel}</span>
    `

    const inner = document.createElement('div')
    inner.className = 'sat-row-inner'
    inner.appendChild(dot)
    inner.appendChild(meta)
    row.appendChild(inner)

    // Legend note — tracks active band
    const initBandLayer = layers.find(l => l.band === bandState[gk]) || first
    const noteEl = document.createElement('span')
    noteEl.className = 'layer-sub'
    noteEl.style.cssText = 'padding-left:26px;display:block;font-size:11px'
    noteEl.textContent = initBandLayer.legendNote || ''
    noteEl.style.display = initBandLayer.legendNote ? 'block' : 'none'
    row.appendChild(noteEl)

    // Band toggle pill (groups with both swir + tc)
    if (hasBoth) {
      const toggle = document.createElement('div')
      toggle.className = 'band-toggle'
      toggle.style.marginLeft = '26px'
      toggle.style.display = isActive ? 'flex' : 'none'

      const swirBtn = document.createElement('button')
      swirBtn.className = 'band-btn' + (bandState[gk] === 'swir' ? ' active' : '')
      swirBtn.dataset.band = 'swir'
      swirBtn.textContent = 'Burn scar'

      const tcBtn = document.createElement('button')
      tcBtn.className = 'band-btn' + (bandState[gk] === 'tc' ? ' active' : '')
      tcBtn.dataset.band = 'tc'
      tcBtn.textContent = 'Natural'

      toggle.appendChild(swirBtn)
      toggle.appendChild(tcBtn)
      row.appendChild(toggle)

      toggle.addEventListener('click', e => {
        const btn = e.target.closest('.band-btn')
        if (!btn) return
        e.stopPropagation()
        bandState[gk] = btn.dataset.band
        const bl = layers.find(l => l.band === bandState[gk]) || first
        noteEl.textContent = bl.legendNote || ''
        noteEl.style.display = bl.legendNote ? 'block' : 'none'
        if (activeGroup === gk) {
          showSatelliteLayer(map, activeLayerId(gk), satellite)
        }
        updateIndicators()
      })
    }

    // Click row → select group
    row.addEventListener('click', e => {
      if (e.target.closest('.band-toggle')) return
      selectGroup(gk)
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
