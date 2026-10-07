const { chromium } = require('playwright')
const TOKEN = '4b6b34517b9bd8c01bcd7ee2cf67d3c18c82cfc8155d805e0bbf4f1b2372e814'
const BASE = 'http://localhost:5173'
const LEGACY_RE = /\/commande\/(card|note|contact|document|agenda|stats\/index)|salesoredr_ajax|index_v2|expedition\/card|comm\/action\/card|custom\/consumption/

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const hits = []
  page.on('request', (req) => { const u = req.url(); if (u.includes('.php')) hits.push(u.replace(BASE, '')) })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  await ctx.addInitScript((t) => localStorage.setItem('ecuenta_token', t), TOKEN)

  // Order detail → Send email modal
  await page.goto(`${BASE}/orders/111`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2000)
  const emailBtn = page.locator('button:has-text("Send email"), button:has-text("Send Email")').first()
  if (await emailBtn.count()) {
    await emailBtn.click()
    await page.waitForTimeout(1500)
    const modalText = await page.locator('body').innerText()
    console.log('EMAIL modal opened:', modalText.includes('Send') && modalText.includes('Subject'))
    const errCount = await page.locator("text=/Couldn't load the email form/i").count()
    console.log('EMAIL defaults error:', errCount > 0)
    await page.keyboard.press('Escape')
    const closeBtn = page.locator('button:has-text("Cancel")').first()
    if (await closeBtn.count()) await closeBtn.click().catch(() => {})
  } else console.log('EMAIL button not found')

  // Add event modal (Events tab)
  const eventsTab = page.locator('button:has-text("Events")').first()
  if (await eventsTab.count()) {
    await eventsTab.click(); await page.waitForTimeout(1000)
    const addBtn = page.locator('button:has-text("Add Event"), button:has-text("New Event")').first()
    if (await addBtn.count()) {
      await addBtn.click(); await page.waitForTimeout(800)
      console.log('ADD EVENT modal opened:', (await page.locator('body').innerText()).includes('Label'))
      await page.keyboard.press('Escape')
      const cancel = page.locator('button:has-text("Cancel")').first()
      if (await cancel.count()) await cancel.click().catch(() => {})
    } else console.log('ADD EVENT button not found')
  }

  // Statistics page
  await page.goto(`${BASE}/orders/statistics`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const statsText = await page.locator('body').innerText()
  console.log('STATS shows 110 orders:', statsText.includes('110'))

  // Create order form — dictionaries
  await page.goto(`${BASE}/orders/create`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const shipSel = await page.locator('select').allTextContents()
  const all = shipSel.join(' | ')
  console.log('CREATE shipping methods loaded:', /Courier|In-Store/.test(all))
  console.log('CREATE payment terms loaded:', /receipt|30 days/i.test(all))
  console.log('CREATE warehouses loaded:', /M1 Warehouse|m3/.test(all))

  const legacy = [...new Set(hits.filter((h) => LEGACY_RE.test(h)))]
  const fapi = [...new Set(hits.filter((h) => h.includes('/fapi/')))]
  console.log('---')
  console.log('fapi calls:', JSON.stringify(fapi))
  console.log('LEGACY calls:', JSON.stringify(legacy))
  console.log('pageErrors:', pageErrors.slice(0, 5))
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
