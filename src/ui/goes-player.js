/**
 * goes-player.js — Picture-in-picture GOES timelapse player.
 *
 * Desktop: corner PiP panel (320×240).
 * The video timestamp drives GOES FDC point filtering when active.
 */

export function initGoesPlayer(map, config) {
  if (!config) return

  const player   = document.getElementById('goes-player')
  const video    = document.getElementById('goes-video')
  const openBtn  = document.getElementById('timelapse-open-btn')
  const closeBtn = document.getElementById('goes-player-close')
  const scrubber = document.getElementById('goes-scrubber')
  const timeLabel = document.getElementById('goes-time-label')
  const speedSel  = document.getElementById('goes-speed')
  const title     = document.getElementById('goes-player-title')

  title.textContent = config.label

  // ── Open player ─────────────────────────────────────────────
  openBtn.addEventListener('click', () => {
    player.classList.remove('hidden')
    // Lazy-load video source
    if (!video.src) {
      video.src = config.url
      video.load()
    }
    video.play()
  })

  closeBtn.addEventListener('click', () => {
    video.pause()
    player.classList.add('hidden')
  })

  // ── Playback speed ───────────────────────────────────────────
  speedSel.addEventListener('change', () => {
    video.playbackRate = parseFloat(speedSel.value)
  })
  video.playbackRate = parseFloat(speedSel.value)

  // ── Scrubber sync ────────────────────────────────────────────
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return
    const pct = (video.currentTime / video.duration) * 100
    scrubber.value = pct

    // Compute current wall-clock time
    const startMs = new Date(config.startDatetime).getTime()
    const currentMs = startMs + (video.currentTime / video.duration) *
      (config.frameCount * config.frameDurationSec * 1000)
    const dt = new Date(currentMs)

    timeLabel.textContent = dt.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZoneName: 'short',
    })

    // Sync GOES FDC dots if that layer exists
    syncGoesFdcToTime(map, currentMs, config)
  })

  scrubber.addEventListener('input', () => {
    if (video.duration) {
      video.currentTime = (parseFloat(scrubber.value) / 100) * video.duration
    }
  })
}

function syncGoesFdcToTime(map, currentMs, config) {
  if (!map.getLayer('goes-fdc-points')) return
  // Show only FDC detections before or at current timelapse time
  map.setFilter('goes-fdc-points', [
    '<=',
    ['get', 'timestamp_ms'],
    currentMs,
  ])
}
