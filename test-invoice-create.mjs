import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const screenshotsDir = './test-screenshots/invoice-create'

function log(pass, msg) {
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${msg}`)
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

// Collect console errors
const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})

try {
  // ── Login ──────────────────────────────────────────────────────────
  console.log('\n=== Login ===')
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  // SPA needs time to load the login chunk and render
  await page.waitForTimeout(5000)
  await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 30000 })
  await page.fill('input[name="username"]', 'vox_admin')
  await page.fill('input[name="password"]', '12345')
  // Select business entity if dropdown exists
  const entityBtn = page.locator('button:has-text("Select business entity")').first()
  if (await entityBtn.isVisible().catch(() => false)) {
    await entityBtn.click()
    await delay(800)
    // Pick first entity option (the dropdown items are buttons with text)
    const firstEntity = page.locator('div[class*="relative"] button[type="button"]:has-text("Voxforem")').first()
    if (await firstEntity.isVisible().catch(() => false)) {
      await firstEntity.click()
      await delay(500)
    } else {
      // Fallback: pick any visible option button in the dropdown
      const anyEntity = page.locator('button[type="button"].block').first()
      if (await anyEntity.isVisible().catch(() => false)) {
        await anyEntity.click()
        await delay(500)
      }
    }
  }
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 30000 })
  log(true, `Logged in, URL: ${page.url()}`)

  // ── Navigate to invoice create/quick ───────────────────────────────
  console.log('\n=== Navigate to /invoices/create/quick ===')
  await page.goto(`${BASE}/invoices/create/quick`, { waitUntil: 'domcontentloaded' })
  await delay(3000)
  log(true, `On invoice create page: ${page.url()}`)

  // ── Check page header ──────────────────────────────────────────────
  console.log('\n=== Page header ===')
  const headerText = await page.textContent('h2').catch(() => '')
  log(headerText?.includes('Quick Invoice'), `Header shows "Quick Invoice": "${headerText}"`)

  // ── Check customer select (SearchableSelect) ───────────────────────
  console.log('\n=== Customer SearchableSelect ===')
  const customerBtn = page.locator('button:has-text("Select a customer"), button:has-text("Loading")').first()
  const customerBtnVisible = await customerBtn.isVisible().catch(() => false)
  log(customerBtnVisible, 'Customer SearchableSelect button visible')

  if (customerBtnVisible) {
    await customerBtn.click()
    await delay(1000)
    // Check if search input appeared
    const searchInput = page.locator('input[placeholder="Search…"]').first()
    const searchVisible = await searchInput.isVisible().catch(() => false)
    log(searchVisible, 'Search input appeared after clicking customer select')

    // Check if customer options appeared
    const customerOptions = page.locator('.z-50 button:has-text("vox")').count()
    if (searchVisible) {
      // Type to search
      await searchInput.fill('vox')
      await delay(1000)
    }
    await page.screenshot({ path: `${screenshotsDir}/01-customer-dropdown.png`, fullPage: false })
    log(true, 'Customer dropdown screenshot taken')
    // Close it
    await page.keyboard.press('Escape')
    await delay(500)
  }

  // ── Check invoice date field ───────────────────────────────────────
  console.log('\n=== Invoice date ===')
  const dateInput = page.locator('input[type="date"]').first()
  const dateVisible = await dateInput.isVisible().catch(() => false)
  log(dateVisible, 'Invoice date input visible')

  // ── Check invoice type select ──────────────────────────────────────
  console.log('\n=== Invoice type ===')
  const typeBtn = page.locator('button:has-text("Standard Invoice")').first()
  const typeVisible = await typeBtn.isVisible().catch(() => false)
  log(typeVisible, 'Invoice type SearchableSelect visible')

  // ── Check invoice lines section ─────────────────────────────────────
  console.log('\n=== Invoice lines ===')
  const addLineBtn = page.locator('button:has-text("Add Line")').first()
  const addLineVisible = await addLineBtn.isVisible().catch(() => false)
  log(addLineVisible, 'Add Line button visible')

  // Add a line
  if (addLineVisible) {
    await addLineBtn.click()
    await delay(500)
    const lineCount = await page.locator('input[placeholder="Description"]').count()
    log(lineCount === 2, `After adding line: ${lineCount} description inputs (expected 2)`)
  }

  // ── Check payment details section ──────────────────────────────────
  console.log('\n=== Payment details ===')
  const bankBtn = page.locator('button:has-text("Select bank account")').first()
  const bankVisible = await bankBtn.isVisible().catch(() => false)
  log(bankVisible, 'Bank account SearchableSelect visible')

  const payModeBtn = page.locator('button:has-text("Select payment mode")').first()
  const payModeVisible = await payModeBtn.isVisible().catch(() => false)
  log(payModeVisible, 'Payment mode SearchableSelect visible')

  // ── Check totals card ──────────────────────────────────────────────
  console.log('\n=== Totals card ===')
  const totalTtc = await page.textContent('text=Total TTC').catch(() => null)
  log(!!totalTtc, 'Total TTC label found')

  // ── Check shipment details (collapsible) ───────────────────────────
  console.log('\n=== Shipment details ===')
  const shipBtn = page.locator('button:has-text("Shipment Details")').first()
  const shipVisible = await shipBtn.isVisible().catch(() => false)
  log(shipVisible, 'Shipment Details section visible')

  if (shipVisible) {
    await shipBtn.click()
    await delay(500)
    const gdnInput = page.locator('input[placeholder="GDN Number"]').first()
    // GDN might not have placeholder - check by label
    const gdnVisible = await page.locator('text=GDN No.').first().isVisible().catch(() => false)
    log(gdnVisible, 'Shipment details expanded (GDN No. label visible)')
  }

  // ── Check footer buttons ───────────────────────────────────────────
  console.log('\n=== Footer buttons ===')
  const saveDraftBtn = page.locator('button:has-text("Save Draft")').first()
  const saveDraftVisible = await saveDraftBtn.isVisible().catch(() => false)
  log(saveDraftVisible, 'Save Draft button visible')

  const savePrintBtn = page.locator('button:has-text("Save & Print")').first()
  const savePrintVisible = await savePrintBtn.isVisible().catch(() => false)
  log(savePrintVisible, 'Save & Print button visible')

  const cancelBtn = page.locator('a:has-text("Cancel")').first()
  const cancelVisible = await cancelBtn.isVisible().catch(() => false)
  log(cancelVisible, 'Cancel link visible')

  // ── Full page screenshot ───────────────────────────────────────────
  console.log('\n=== Screenshot ===')
  await page.screenshot({ path: `${screenshotsDir}/02-full-page.png`, fullPage: true })
  log(true, 'Full page screenshot taken')

  // ── Test form validation (click Save Draft without filling) ────────
  console.log('\n=== Form validation ===')
  if (saveDraftVisible) {
    await saveDraftBtn.click()
    await delay(500)
    const errorMsg = await page.textContent('text=Customer is required').catch(() => null)
    log(!!errorMsg, 'Validation error "Customer is required" shown')
    await page.screenshot({ path: `${screenshotsDir}/03-validation-error.png`, fullPage: false })
  }

  // ── Console errors ─────────────────────────────────────────────────
  console.log('\n=== Console errors ===')
  log(consoleErrors.length === 0, `Console errors: ${consoleErrors.length}`)
  consoleErrors.forEach((e) => console.log(`  ERROR: ${e}`))

} catch (err) {
  console.error('Test failed with error:', err.message)
  await page.screenshot({ path: `${screenshotsDir}/error.png`, fullPage: true })
} finally {
  await browser.close()
}
