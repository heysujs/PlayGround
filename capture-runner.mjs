import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const output = process.env.CAPTURE_DIR
const target = process.env.CAPTURE_URL
const runtime = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')
const config = JSON.parse((await import('node:fs')).readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
if (!target || !output) throw new Error('Set CAPTURE_URL and CAPTURE_DIR.')
if (process.platform === 'linux') process.env.DISPLAY ||= ':' + (await import('node:fs')).readFileSync(join(runtime, 'display'), 'utf8').trim()
mkdirSync(output, { recursive: true })

const infraFailure = error => Object.assign(error, { exitCode: 75 })
let browser
let exitCode = 0
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(error => { throw infraFailure(error) })
  for (const [view, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }).catch(error => { throw infraFailure(error) })
    page.setDefaultTimeout(30000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === new URL(target).origin) {
        errors.push(`HTTP ${response.status()} for ${response.url()}`)
      }
    })
    let response
    try {
      response = await page.goto(target, { waitUntil: 'load', timeout: 45000 })
    } catch (error) {
      throw infraFailure(error)
    }
    if (!response?.ok()) {
      const status = response?.status()
      const transient = !status || status === 408 || status === 429 || status >= 500
      throw Object.assign(new Error(`HTTP ${status ?? 'no response'} loading ${target}`), { exitCode: transient ? 75 : 1 })
    }
    try {
      await page.locator('#game').waitFor({ state: 'visible', timeout: 15000 })
      await page.locator('#view').waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForFunction(() => document.fonts.status === 'loaded', undefined, { timeout: 15000 })
    } catch (error) {
      if (error.name === 'TimeoutError') throw new Error(`Rendered game content did not become ready (${view}): ${error.message}`)
      throw error
    }
    try {
      await page.locator('#begin').click({ force: true, timeout: 5000 })
      await page.waitForFunction(() => document.querySelector('#start')?.classList.contains('hidden'), undefined, { timeout: 5000 })
    } catch (error) {
      throw new Error(`Game start control failed (${view}): ${error.message}`)
    }
    await page.waitForTimeout(1000)
    const canvasReady = await page.locator('#view').evaluate(canvas => canvas.width > 0 && canvas.height > 0)
    if (!canvasReady) throw new Error(`Game canvas did not render (${view}).`)
    if (errors.length) throw new Error(`Page rendering failed (${view}): ${errors.join('; ')}`)
    try {
      await page.screenshot({ path: join(output, `final-${view}.png`), timeout: 30000 })
    } catch (error) {
      if (error.name === 'TimeoutError' || !browser.isConnected()) throw infraFailure(error)
      throw error
    }
    await page.close().catch(error => { throw infraFailure(error) })
    console.log(`Captured ${view}: ${join(output, `final-${view}.png`)}`)
  }
} catch (error) {
  console.error(error)
  exitCode = error.exitCode || 1
} finally {
  if (browser) {
    try { await browser.close() }
    catch (error) { console.error(error); exitCode ||= 75 }
  }
}
process.exitCode = exitCode
