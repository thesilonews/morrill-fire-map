/**
 * timeslider.js — 3-stop discrete pass stepper in the bottom bar.
 * Shows pass label, point count, and max FRP at each stop.
 * Ghost of previous pass shown at 20% opacity (handled in fire-points.js).
 */

import { showFirePass } from '../layers/fire-points.js'

let currentPass = 1  // Start at peak (index 1)
let passConfigs = []
let playInterval = null

export function initTimeSlider(map, passes) {
  passConfigs = passes

  const stepper = document.getElementById('pass-stepper')
  const labelDisplay = document.getElementById('pass-label-display')

  // Build stepper UI
  stepper.innerHTML = `<div class="pass-track"></div><div class="pass-stops"></div>`
  const stopsEl = stepper.querySelector('.pass-stops')

  passes.forEach((pass, idx) => {
    const stop = document.createElement('div')
    stop.className = `pass-stop ${idx === currentPass ? 'active' : ''}`
    stop.dataset.idx = idx
    stop.innerHTML = `
      <div class="pass-dot"></div>
      <div class="pass-stop-label">
        <div>${pass.label}</div>
        <div style="font-size:10px;color:var(--text-sub)">${pass.sublabel}</div>
      </div>
      <div class="pass-count">${pass.pointCount} pts · ${pass.maxFrpMw} MW max</div>
    `
    stop.addEventListener('click', () => setPass(map, idx))
    stopsEl.appendChild(stop)
  })

  updateLabel()

  // Autoplay from pass 0 on load
  setPass(map, 0)
  startPlay(map)

  // Prev/Next buttons
  document.getElementById('pass-prev').addEventListener('click', () => {
    if (currentPass > 0) setPass(map, currentPass - 1)
  })
  document.getElementById('pass-next').addEventListener('click', () => {
    if (currentPass < passes.length - 1) setPass(map, currentPass + 1)
  })

  // Play button
  document.getElementById('pass-play').addEventListener('click', () => {
    if (playInterval) {
      stopPlay()
    } else {
      startPlay(map)
    }
  })

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return
    if (e.key === 'ArrowRight' && currentPass < passes.length - 1) setPass(map, currentPass + 1)
    if (e.key === 'ArrowLeft'  && currentPass > 0)                  setPass(map, currentPass - 1)
  })
}

function setPass(map, idx) {
  currentPass = idx
  showFirePass(map, idx, passConfigs)
  updateStepper()
  updateLabel()
}

function updateStepper() {
  document.querySelectorAll('.pass-stop').forEach((el, idx) => {
    el.classList.toggle('active', idx === currentPass)
  })
}

function updateLabel() {
  const pass = passConfigs[currentPass]
  if (!pass) return
  document.getElementById('pass-label-display').textContent =
    `${pass.label} · ${pass.sublabel}`
}

function startPlay(map) {
  // Start from pass 0 if at end
  if (currentPass >= passConfigs.length - 1) setPass(map, 0)

  document.getElementById('pass-play').textContent = '⏸'
  document.getElementById('pass-play').classList.add('playing')

  playInterval = setInterval(() => {
    const next = currentPass < passConfigs.length - 1 ? currentPass + 1 : 0
    setPass(map, next)
  }, 2000)
}

function stopPlay() {
  clearInterval(playInterval)
  playInterval = null
  document.getElementById('pass-play').textContent = '▶'
  document.getElementById('pass-play').classList.remove('playing')
}

