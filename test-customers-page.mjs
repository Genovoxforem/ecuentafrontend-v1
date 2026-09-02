import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

// Capture API responses
const apiResponses = []
page.on('response', async (response) => {
  const url = response.url()
  if (url.includes('/api/customers') || url.includes('/societe/api')) {
    try {
      const body = await response.text()
      apiResponses.push({ url: url.substring(0, 120), status: response.status(), body: body.substring(0, 500) })
    } catch (e) {
      apiResponses.push({ url: url.substring(0, 120), status: response.status(), body: '(could not read)' })
    }
  }
})

function log(pass, msg) {
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${msg}`)
}

try {
  // Login
  console.log('\n=== Login ===')
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  await page.waitForSelector('input[name="username"]', { timeout: 15000 })
  await page.fill('input[name="username"]', 'vox_admin')
  await page.fill('input[name="password"]', '12345')
  const entityBtn = page.locator('button:has-text("Select business entity")').first()
  if (await entityBtn.isVisible().catch(() => false)) {
    await entityBtn.click()
    await page.waitForTimeout(800)
    await page.locator('button[type="button"]:has-text("Voxforem")').first().click()
    await page.waitForTimeout(500)
  }
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 30000 })
  log(true, `Logged in: ${page.url()}`)

  // Navigate to customers page
  console.log('\n=== Navigate to /customers ===')
  await page.goto('http://localhost:5173/customers', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000))
  console.log('\n=== PAGE TEXT (first 3000 chars) ===')
  console.log(bodyText)

  console.log('\n=== API RESPONSES ===')
  apiResponses.forEach((r) => {
    console.log(`\n  URL: ${r.url}`)
    console.log(`  Status: ${r.status}`)
    console.log(`  Body: ${r.body}`)
  })

  // Check for key elements
  console.log('\n=== Page Elements ===')
  const hasCustomerList = await page.locator('text=Customer List').first().isVisible().catch(() => false)
  log(hasCustomerList, 'Customer List title visible')

  const hasTotalCustomers = await page.locator('text=Total Customers').first().isVisible().catch(() => false)
  log(hasTotalCustomers, 'Total Customers stat visible')

  const hasNewCustomer = await page.locator('text=New Customer').first().isVisible().catch(() => false)
  log(hasNewCustomer, 'New Customer button visible')

  // Check if any customer rows are shown (table rows)
  const rowCount = await page.locator('table tbody tr').count().catch(() => 0)
  log(rowCount > 0, `Customer table has ${rowCount} rows`)

  // Check for loading/error states
  const hasLoading = await page.locator('text=Loading').first().isVisible().catch(() => false)
  log(!hasLoading, 'No loading state stuck')

  const hasError = await page.locator('text=Error').first().isVisible().catch(() => false)
  log(!hasError, 'No error state visible')

  await page.screenshot({ path: 'test-screenshots/customers-page.png', fullPage: true })
  log(true, 'Screenshot saved')

  console.log('\n=== Console Errors ===')
  log(errors.length === 0, `Console errors: ${errors.length}`)
  errors.forEach((e) => console.log(`  ERROR: ${e}`))

} catch (err) {
  console.error('Test failed:', err.message)
  await page.screenshot({ path: 'test-screenshots/customers-error.png', fullPage: true })
} finally {
  await browser.close()
}
