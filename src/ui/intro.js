/**
 * intro.js — 3-card dismissible intro sequence.
 * Auto-skips if user arrives via shared URL with coordinates.
 * Stores dismissal in localStorage so it only shows once.
 */

const STORAGE_KEY = 'silo-fire-intro-seen'

export function initIntro(fireConfig) {
  const overlay = document.getElementById('intro-overlay')
  const cards   = document.getElementById('intro-cards')
  const dots    = document.getElementById('intro-dots')
  const backBtn  = document.getElementById('intro-back')
  const skipBtn  = document.getElementById('intro-skip')
  const nextBtn  = document.getElementById('intro-next')

  const introData = [
    {
      title: fireConfig.name,
      html: `
        <p><span class="intro-stat">${fireConfig.acreage.toLocaleString()} acres</span> across ${fireConfig.counties.join(', ')} counties</p>
        <p>${fireConfig.deck}</p>
      `,
    },
    {
      title: 'How to read this map',
      html: `
        <p>The orange and red dots show where NASA satellites detected active fire on three separate passes, March 12–14.</p>
        <p>Use the <strong>timeline bar at the bottom</strong> to step through passes and watch the fire spread.</p>
        <p>Switch satellite views in the left panel to see the burn scar in infrared imagery.</p>
      `,
    },
    {
      title: 'Looking for your property?',
      html: `
        <p>Use the <strong>Find my property</strong> search at the top of the left panel. Type an address or road name.</p>
        <p>Turn on <strong>Buildings</strong> and <strong>Property lines</strong> and zoom in to see structures near the fire.</p>
        <div class="intro-warning">⚠ This map shows where fire burned — not confirmed damage. Contact ${fireConfig.emergencyContact} for official information.</div>
      `,
    },
  ]

  // Skip if previously dismissed or arriving via shared link
  if (localStorage.getItem(STORAGE_KEY) || new URL(location.href).searchParams.has('lat')) {
    return
  }

  overlay.classList.remove('hidden')

  let currentCard = 0

  // Build card elements
  introData.forEach((data, idx) => {
    const card = document.createElement('div')
    card.className = `intro-card ${idx === 0 ? 'active' : ''}`
    card.innerHTML = `<h2>${data.title}</h2>${data.html}`
    cards.appendChild(card)

    const dot = document.createElement('div')
    dot.className = `intro-dot ${idx === 0 ? 'active' : ''}`
    dot.addEventListener('click', () => goTo(idx))
    dots.appendChild(dot)
  })

  function goTo(idx) {
    document.querySelectorAll('.intro-card').forEach((c, i) => c.classList.toggle('active', i === idx))
    document.querySelectorAll('.intro-dot').forEach((d, i) => d.classList.toggle('active', i === idx))
    currentCard = idx
    backBtn.classList.toggle('hidden', idx === 0)
    nextBtn.textContent = idx === introData.length - 1 ? 'Explore the map →' : 'Next →'
  }

  backBtn.addEventListener('click',  () => goTo(currentCard - 1))
  skipBtn.addEventListener('click',  dismiss)
  nextBtn.addEventListener('click',  () => {
    if (currentCard < introData.length - 1) goTo(currentCard + 1)
    else dismiss()
  })

  function dismiss() {
    overlay.classList.add('hidden')
    localStorage.setItem(STORAGE_KEY, '1')
  }

  // Help button re-opens
  document.getElementById('help-btn').addEventListener('click', () => {
    goTo(0)
    overlay.classList.remove('hidden')
  })
}
