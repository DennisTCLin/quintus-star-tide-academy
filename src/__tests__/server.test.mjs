import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { request } from 'node:http'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { cacheControlFor, createAppServer } from '../../server.mjs'
import { HERO_VIDEO_SLIDES } from '../HeroVideoCarousel'

let server
let port
const fixture = fileURLToPath(new URL('../../dist/assets/hero-test.v-a1b2c3d4e5f6.mp4', import.meta.url))
const scriptFixture = fileURLToPath(new URL('../../dist/assets/runtime-test.v-a1b2c3d4e5f6.js', import.meta.url))

function requestPath(path, { headers = {}, method = 'GET' } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }))
    })
    req.on('error', reject)
    req.end()
  })
}

function get(path, headers = {}) {
  return requestPath(path, { headers })
}

beforeAll(async () => {
  await mkdir(fileURLToPath(new URL('../../dist/assets/', import.meta.url)), { recursive: true })
  await writeFile(fixture, '0123456789')
  await writeFile(scriptFixture, 'export const value = "star-tide";'.repeat(160))
  server = createAppServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
})

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await rm(fixture, { force: true })
  await rm(scriptFixture, { force: true })
})

describe('production server regressions', () => {
  it('returns 400 for malformed URL encoding and remains healthy', async () => {
    const malformed = await get('/%E0%A4%A')
    expect(malformed.status).toBe(400)
    expect(JSON.parse(malformed.body)).toMatchObject({ ok: false })
    const health = await get('/healthz')
    expect(health.status).toBe(200)
    expect(JSON.parse(health.body)).toEqual({ ok: true, service: 'quintus-ocean-academy' })
  })

  it('only gives immutable caching to hashed build and media assets', () => {
    expect(cacheControlFor('/app/dist/assets/index.v-AbC_def12.js')).toContain('immutable')
    expect(cacheControlFor('/app/dist/assets/hero.v-a1b2c3d4e5f6.mp4')).toContain('immutable')
    expect(cacheControlFor(HERO_VIDEO_SLIDES[0].desktopVideoSrc)).toContain('immutable')
    expect(cacheControlFor('/app/dist/assets/index-production.js')).toBe('public, max-age=0, must-revalidate')
    expect(cacheControlFor('/app/dist/assets/hero-departure-desktop.mp4')).toBe('public, max-age=0, must-revalidate')
    expect(cacheControlFor('/app/dist/assets/tideglow-companion.png')).toBe('public, max-age=0, must-revalidate')
    expect(cacheControlFor('/app/dist/assets/hero-ocean.jpg')).toBe('public, max-age=0, must-revalidate')
    expect(cacheControlFor('/assets/tideglow-companion.png?v=ba59a555c79c')).toContain('immutable')
    expect(cacheControlFor('/assets/cloudsail-companion.png?v=e467c7f472c3')).toContain('immutable')
    expect(cacheControlFor('/assets/coralflare-companion.png?v=569ac509d10f')).toContain('immutable')
    expect(cacheControlFor('/assets/hero-ocean.jpg?v=271d4c7822ea')).toContain('immutable')
    expect(cacheControlFor('/assets/companions/astraltide.webp?v=244a12fc5c0c')).toContain('immutable')
    expect(cacheControlFor('/assets/companions/astraltide-320.webp?v=244a12fc5c0c')).toContain('immutable')
    expect(cacheControlFor('/assets/companions/astraltide.webp')).toBe('public, max-age=0, must-revalidate')
    expect(cacheControlFor('/app/dist/index.html')).toBe('no-cache')
  })

  it('binds every immutable media version to the first twelve SHA-256 characters', () => {
    for (const slide of HERO_VIDEO_SLIDES) {
      for (const source of [slide.desktopVideoSrc, slide.mobileVideoSrc, slide.desktopPosterSrc, slide.mobilePosterSrc]) {
        const [assetPath, query] = source.split('?')
        const expected = new URLSearchParams(query).get('v')
        const file = fileURLToPath(new URL(`../../public${assetPath}`, import.meta.url))
        const actual = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12)
        expect(expected).toBe(actual)
      }
    }
  })

  it('serves video with the correct MIME type and byte ranges', async () => {
    const partial = await get('/assets/hero-test.v-a1b2c3d4e5f6.mp4', { Range: 'bytes=2-5' })
    expect(partial.status).toBe(206)
    expect(partial.body).toBe('2345')
    expect(partial.headers['content-type']).toBe('video/mp4')
    expect(partial.headers['content-range']).toBe('bytes 2-5/10')
    expect(partial.headers['accept-ranges']).toBe('bytes')
    expect(partial.headers['cache-control']).toContain('immutable')

    const invalid = await get('/assets/hero-test.v-a1b2c3d4e5f6.mp4', { Range: 'bytes=99-120' })
    expect(invalid.status).toBe(416)
    expect(invalid.headers['content-range']).toBe('bytes */10')
  })

  it('compresses text assets when the browser accepts gzip', async () => {
    const response = await get('/assets/runtime-test.v-a1b2c3d4e5f6.js', { 'Accept-Encoding': 'gzip' })
    expect(response.status).toBe(200)
    expect(response.headers['content-encoding']).toBe('gzip')
    expect(response.headers.vary).toBe('Accept-Encoding')
    expect(response.headers['cache-control']).toContain('immutable')
    expect(response.headers['content-length']).toBeUndefined()

    const declined = await get('/assets/runtime-test.v-a1b2c3d4e5f6.js', { 'Accept-Encoding': 'gzip;q=0, identity' })
    expect(declined.headers['content-encoding']).toBeUndefined()
    expect(declined.headers['content-length']).toBeDefined()
  })

  it('returns 404 for a missing static asset instead of the SPA shell', async () => {
    const missing = await get('/assets/does-not-exist.mp4')
    expect(missing.status).toBe(404)
    expect(missing.headers['content-type']).toContain('application/json')
    expect(JSON.parse(missing.body)).toEqual({ ok: false, error: 'Asset not found' })

    const missingHead = await requestPath('/assets/does-not-exist.mp4', { method: 'HEAD' })
    expect(missingHead.status).toBe(404)
    expect(missingHead.body).toBe('')
    expect(missingHead.headers['content-length']).toBe(String(Buffer.byteLength(missing.body)))
  })
})
