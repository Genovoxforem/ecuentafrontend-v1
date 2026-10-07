// Browser smoke test: loads the Sales Order list + detail with a real
// API token seeded into localStorage (as the login flow does), then checks
// that the migrated JSON endpoints are hit and no legacy scrape URLs are
// requested.
const { chromium } = require('playwright')

const TOKEN = '4b6b34517b9bd8c01bcd7ee2cf67d3c18c82cfc8155d805e0bbf4f1b2372e814'
const BASE = 'http://localhost:5173'

const LEGACY_RE = /card\.php|note\.php|contact\.php|document\.php|agenda\.php|shipment\.php|salesoredr_ajax_list|stats\/index\.php|index_v2\.php|expedition\/card|comm\/action\/card/

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const hits = []
  page.on('request', (req) => {
    const u = req.url()
    if (u.includes('.php')) hits.push(u.replace(BASE, ''))
  })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  // Seed token before app JS runs.
  await ctx.addInitScript((t) => localStorage.setItem('ecuenta_token', t), TOKEN)

  // Order list
  await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const listText = await page.locator('body').innerText()
  console.log('LIST has order ref:', /CO\d{4}-\d+/.test(listText))

  // Order detail
  await page.goto(`${BASE}/orders/111`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(3000)
  const detText = await page.locator('body').innerText()
  console.log('DETAIL has ref CO2609-0102:', detText.includes('CO2609-0102'))
  console.log('DETAIL has third party cust001:', detText.includes('cust001'))
  console.log('DETAIL shows total:', /\d/.test(detText))

  // click through the tabs to exercise every fapi call
  for (const tab of ['Contact', 'Shipments', 'Stock Consumption', 'Notes', 'Linked files', 'Events']) {
    const btn = page.locator(`button:has-text("${tab}")`).first()
    if (await btn.count()) {
      await btn.click()
      await page.waitForTimeout(1200)
      const err = await page.locator('text=/Couldn\'t load|Unknown error/i').count()
      console.log(`TAB ${tab}: error=${err > 0}`)
    } else {
      console.log(`TAB ${tab}: button not found`)
    }
  }

  const legacy = hits.filter((h) => LEGACY_RE.test(h))
  const fapi = hits.filter((h) => h.includes('/fapi/'))
  console.log('---')
  console.log('fapi calls:', JSON.stringify([...new Set(fapi)], null, 0))
  console.log('LEGACY .php calls:', JSON.stringify([...new Set(legacy)], null, 0))
  console.log('pageErrors:', pageErrors.slice(0, 5))

  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
