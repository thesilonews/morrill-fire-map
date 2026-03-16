import { defineConfig } from 'vite'
import path from 'path'
import { createReadStream, statSync, existsSync } from 'fs'

/**
 * Dev-only middleware: serves /data/* from the sibling ../data/ directory.
 * Handles HTTP Range requests so the COG protocol can do partial reads on TIFFs.
 */
function serveParentData() {
  const dataDir = path.resolve(import.meta.dirname, '../data')

  const MIME = {
    '.tif':     'image/tiff',
    '.tiff':    'image/tiff',
    '.json':    'application/json',
    '.geojson': 'application/geo+json',
    '.mp4':     'video/mp4',
    '.png':     'image/png',
    '.jpg':     'image/jpeg',
  }

  return {
    name: 'serve-parent-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/data/')) return next()

        const filePath = path.join(dataDir, req.url.slice('/data/'.length).split('?')[0])
        if (!existsSync(filePath)) return next()

        const stat     = statSync(filePath)
        const ext      = path.extname(filePath).toLowerCase()
        const mimeType = MIME[ext] || 'application/octet-stream'

        res.setHeader('Content-Type', mimeType)
        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('Access-Control-Allow-Origin', '*')

        const range = req.headers.range
        if (range) {
          const [s, e]  = range.replace('bytes=', '').split('-')
          const start   = parseInt(s, 10)
          const end     = e ? parseInt(e, 10) : stat.size - 1
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
          res.setHeader('Content-Length', end - start + 1)
          res.statusCode = 206
          createReadStream(filePath, { start, end }).pipe(res)
        } else {
          res.setHeader('Content-Length', stat.size)
          res.statusCode = 200
          createReadStream(filePath).pipe(res)
        }
      })
    },
  }
}

export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  base: './',
  plugins: [serveParentData()],
  server: {
    port: 3000,
    fs: { allow: ['..'] },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: { manualChunks: { maplibre: ['maplibre-gl'] } },
    },
  },
})
