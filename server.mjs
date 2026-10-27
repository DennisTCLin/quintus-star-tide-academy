import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGzip } from 'node:zlib'

const root = fileURLToPath(new URL('./dist/', import.meta.url))
const port = Number.parseInt(process.env.PORT || '3000', 10)
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
}

export function cacheControlFor(path) {
  const normalizedPath = path.replaceAll('\\', '/')
  const pathname = normalizedPath.includes('?')
    ? new URL(normalizedPath, 'http://localhost').pathname
    : normalizedPath
  if (extname(pathname).toLowerCase() === '.html') return 'no-cache'
  if (/\/assets\/[^?#]+\.v-[A-Za-z0-9_-]{8,}\.(?:js|css|mp4|webm|webp|avif|jpe?g|png)$/.test(normalizedPath)) {
    return 'public, max-age=31536000, immutable'
  }
  if (/\/assets\/[^?#]+\.(?:mp4|webm|webp|avif|jpe?g|png)\?[^#]*\bv=[A-Za-z0-9_-]{8,}(?:&|$)/.test(normalizedPath)) {
    return 'public, max-age=31536000, immutable'
  }
  return 'public, max-age=0, must-revalidate'
}

function acceptsEncoding(header, encoding) {
  return String(header || '').split(',').some((candidate) => {
    const [name, ...parameters] = candidate.trim().split(';')
    if (name.toLowerCase() !== encoding) return false
    const quality = parameters
      .map((parameter) => parameter.trim().match(/^q=(\d*(?:\.\d+)?)$/i))
      .find(Boolean)
    return !quality || Number.parseFloat(quality[1]) > 0
  })
}

function sendFile(req, res, path, status = 200) {
  const size = statSync(path).size
  const extension = extname(path).toLowerCase()
  const compressible = ['.html', '.js', '.css', '.json', '.svg'].includes(extension)
  const acceptsGzip = acceptsEncoding(req.headers['accept-encoding'], 'gzip')
  const range = req.headers.range
  const useGzip = req.method === 'GET' && !range && compressible && acceptsGzip
  const headers = {
    'Content-Type': mime[extension] || 'application/octet-stream',
    'Cache-Control': cacheControlFor(req.url || path),
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
  }
  if (compressible) headers.Vary = 'Accept-Encoding'
  if (useGzip) headers['Content-Encoding'] = 'gzip'
  let streamOptions
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}`, 'Content-Length': '0' })
      res.end()
      return
    }
    const suffixLength = match[1] ? null : Number.parseInt(match[2], 10)
    const start = suffixLength === null ? Number.parseInt(match[1], 10) : Math.max(0, size - suffixLength)
    const requestedEnd = match[2] && suffixLength === null ? Number.parseInt(match[2], 10) : size - 1
    const end = Math.min(requestedEnd, size - 1)
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}`, 'Content-Length': '0' })
      res.end()
      return
    }
    status = 206
    streamOptions = { start, end }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`
    headers['Content-Length'] = String(end - start + 1)
  } else if (!useGzip) {
    headers['Content-Length'] = String(size)
  }
  res.writeHead(status, headers)
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = createReadStream(path, streamOptions)
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end()
  })
  if (useGzip) {
    stream.pipe(createGzip({ level: 6 })).pipe(res)
    return
  }
  stream.pipe(res)
}

function badRequest(res) {
  res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify({ ok: false, error: 'Malformed request URL' }))
}

export function createAppServer({ api } = {}) {
  return createServer((req, res) => {
  let url
  let decoded
  try {
    url = new URL(req.url || '/', 'http://localhost')
    decoded = decodeURIComponent(url.pathname)
  } catch {
    badRequest(res)
    return
  }
  if (url.pathname.startsWith('/api/')) {
    if (api) { void api(req, res); return }
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: '雲端服務尚未連線，請稍後再試' })); return
  }

  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/healthz')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ ok: true, service: 'quintus-ocean-academy' }))
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    res.end('Method Not Allowed')
    return
  }

  const safePath = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '')
  const candidate = join(root, safePath)
  if (candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()) {
    sendFile(req, res, candidate)
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    const body = JSON.stringify({ ok: false, error: 'Asset not found' })
    res.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(Buffer.byteLength(body)),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
    return
  }

  const index = join(root, 'index.html')
  if (existsSync(index)) {
    sendFile(req, res, index)
    return
  }
  res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ ok: false, error: 'Build output not found' }))
  })
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isMain) {
  const { createCloudApi } = await import('./server/cloud.mjs')
  const api = await createCloudApi()
  const server = createAppServer({ api })
  server.requestTimeout = 15000
  process.on('SIGTERM', () => server.close(() => api.close().then(() => process.exit(0))))
  server.listen(port, '0.0.0.0', () => {
    console.log(`Star Tide Academy listening on ${port}`)
  })
}
