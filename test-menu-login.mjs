import { chromium } from 'playwright'

const BASE = 'http://localhost:5174'
const screenshotsDir = './test-screenshots'

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const results = []
  function log(ok, msg) {
    const status = ok ? 'PASS' : 'FAIL'
    const line = `[${status}] ${msg}`
    console.log(line)
    results.push({ ok, msg })
  }

  try {
    // ── 1. Load the login page ──────────────────────────────────────────
    console.log('\n=== Step 1: Load login page ===')
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await delay(1000)
    await page.screenshot({ path: `${screenshotsDir}/01-login-page.png`, fullPage: false })
    log(true, 'Login page loaded')

    // ── 2. Fill in credentials and submit ───────────────────────────────
    console.log('\n=== Step 2: Login as vox_admin / 12345 ===')
    const loginInput = await page.locator('input[name="login"], input[placeholder*="login" i], input[type="text"]').first()
    const passwordInput = await page.locator('input[type="password"]').first()

    if (await loginInput.count() > 0) {
      await loginInput.fill('vox_admin')
      log(true, 'Filled login field with vox_admin')
    } else {
      log(false, 'Could not find login input')
    }

    if (await passwordInput.count() > 0) {
      await passwordInput.fill('12345')
      log(true, 'Filled password field with 12345')
    } else {
      log(false, 'Could not find password input')
    }

    // Find and click the submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In"), button:has-text("sign in"), button:has-text("login"), button:has-text("log in")').first()
    if (await submitBtn.count() > 0) {
      await submitBtn.click()
      log(true, 'Clicked submit button')
    } else {
      // Try pressing Enter
      await passwordInput.press('Enter')
      log(true, 'Pressed Enter to submit')
    }

    // Wait for navigation away from /login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => {})
    await delay(3000)
    await page.screenshot({ path: `${screenshotsDir}/02-after-login.png`, fullPage: false })
    log(true, `Post-login URL: ${page.url()}`)

    // ── 3. Check if we landed on dashboard ──────────────────────────────
    console.log('\n=== Step 3: Verify dashboard loaded ===')
    const isDashboard = page.url().includes('/dashboard') || page.url().includes('/home') || page.url().endsWith(BASE.replace('http://localhost:5173', '')) || page.url().pathname === '/'
    log(isDashboard, `Current URL is dashboard: ${page.url()}`)

    // ── 4. Test Legacy Sidebar ──────────────────────────────────────────
    console.log('\n=== Step 4: Test Legacy Sidebar ===')

    // Check for sidebar presence
    const sidebarEl = page.locator('aside, [class*="ec-side-navbar"], [class*="rail"]').first()
    const sidebarVisible = await sidebarEl.count() > 0
    log(sidebarVisible, 'Sidebar element present')

    // Check for logo in sidebar
    const sidebarLogo = page.locator('aside img, nav img').first()
    const logoVisible = await sidebarLogo.count() > 0
    log(logoVisible, 'Logo image present in sidebar/navbar area')

    // Check for menu items / nav sections
    const menuItems = page.locator('button[title], nav button, aside button')
    const menuCount = await menuItems.count()
    log(menuCount > 0, `Menu items found: ${menuCount}`)

    // Check for the rail icons (section icons)
    const railButtons = page.locator('aside button[title]')
    const railCount = await railButtons.count()
    log(railCount > 0, `Rail section icons found: ${railCount}`)

    await page.screenshot({ path: `${screenshotsDir}/03-legacy-sidebar.png`, fullPage: false })

    // ── 5. Test breadcrumb ──────────────────────────────────────────────
    console.log('\n=== Step 5: Test Breadcrumb ===')
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
    const breadcrumbVisible = await breadcrumb.count() > 0
    log(breadcrumbVisible, 'Breadcrumb nav element present')

    if (breadcrumbVisible) {
      const breadcrumbText = await breadcrumb.textContent()
      log(true, `Breadcrumb text: "${breadcrumbText?.trim()}"`)
    }

    // ── 6. Test theme toggle (dark/light mode) ──────────────────────────
    console.log('\n=== Step 6: Test Dark/Light Theme Toggle ===')

    // Find the theme toggle buttons
    const lightBtn = page.locator('button:has(svg.lucide-sun), button[title*="light" i]').first()
    const darkBtn = page.locator('button:has(svg.lucide-moon), button[title*="dark" i]').first()

    // Check current theme
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    log(true, `Initial theme class on <html>: "${htmlClass}"`)

    // Toggle to dark
    if (await darkBtn.count() > 0) {
      await darkBtn.click()
      await delay(1000)
      const darkClass = await page.evaluate(() => document.documentElement.className)
      log(darkClass.includes('dark'), `After dark toggle, <html> class: "${darkClass}"`)
      await page.screenshot({ path: `${screenshotsDir}/04-dark-mode.png`, fullPage: false })
    } else {
      log(false, 'Dark mode toggle button not found')
    }

    // Toggle back to light
    if (await lightBtn.count() > 0) {
      await lightBtn.click()
      await delay(1000)
      const lightClass = await page.evaluate(() => document.documentElement.className)
      log(!lightClass.includes('dark'), `After light toggle, <html> class: "${lightClass}"`)
      await page.screenshot({ path: `${screenshotsDir}/05-light-mode.png`, fullPage: false })
    } else {
      log(false, 'Light mode toggle button not found')
    }

    // ── 7. Test Modern Sidebar ──────────────────────────────────────────
    console.log('\n=== Step 7: Test Modern Sidebar ===')

    const modernBtn = page.locator('button:has-text("Modern"), button[title*="Modern" i]').first()
    if (await modernBtn.count() > 0) {
      await modernBtn.click()
      await delay(2000)
      log(true, 'Switched to Modern sidebar')
      await page.screenshot({ path: `${screenshotsDir}/06-modern-sidebar.png`, fullPage: false })

      // Check modern sidebar elements
      const modernAside = page.locator('aside')
      const modernVisible = await modernAside.count() > 0
      log(modernVisible, 'Modern sidebar visible')

      // Check logo in modern sidebar
      const modernLogo = page.locator('aside img').first()
      const modernLogoVisible = await modernLogo.count() > 0
      log(modernLogoVisible, 'Logo visible in modern sidebar')

      // Test dark mode with modern sidebar
      if (await darkBtn.count() > 0) {
        await darkBtn.click()
        await delay(1000)
        await page.screenshot({ path: `${screenshotsDir}/07-modern-dark-mode.png`, fullPage: false })
        log(true, 'Modern sidebar in dark mode screenshot taken')
      }

      // Test light mode with modern sidebar
      if (await lightBtn.count() > 0) {
        await lightBtn.click()
        await delay(1000)
        await page.screenshot({ path: `${screenshotsDir}/08-modern-light-mode.png`, fullPage: false })
        log(true, 'Modern sidebar in light mode screenshot taken')
      }

      // Click a menu section to test expansion
      const menuSectionBtns = page.locator('aside button:has(span)')
      const sectionCount = await menuSectionBtns.count()
      log(sectionCount > 0, `Modern sidebar menu sections found: ${sectionCount}`)

      if (sectionCount > 0) {
        await menuSectionBtns.first().click()
        await delay(1000)
        await page.screenshot({ path: `${screenshotsDir}/09-modern-expanded.png`, fullPage: false })
        log(true, 'Clicked first menu section in modern sidebar')
      }
    } else {
      log(false, 'Modern sidebar toggle button not found')
    }

    // ── 8. Switch back to Legacy and test menu navigation ───────────────
    console.log('\n=== Step 8: Test Legacy Menu Navigation ===')

    const legacyBtn = page.locator('button:has-text("Legacy"), button[title*="Legacy"]').first()
    if (await legacyBtn.count() > 0) {
      await legacyBtn.click()
      await delay(2000)
      log(true, 'Switched back to Legacy sidebar')
    }

    // ── 8b. Test rail tab clicking when sidebar is open ─────────────────
    console.log('\n=== Step 8b: Test rail tab clicking (sidebar open) ===')

    // Ensure sidebar is open
    const menuToggle = page.locator('button[title*="Expand"], button[title*="Collapse"]').first()
    if (await menuToggle.count() > 0) {
      const toggleTitle = await menuToggle.getAttribute('title')
      if (toggleTitle && toggleTitle.toLowerCase().includes('expand')) {
        await menuToggle.click()
        await delay(1000)
        log(true, 'Opened sidebar via toggle')
      }
    }

    // Click the second rail tab (should switch sections)
    const railButtonsOpen = page.locator('aside button[title]')
    const railCountOpen = await railButtonsOpen.count()
    log(railCountOpen > 1, `Rail buttons found (open): ${railCountOpen}`)

    if (railCountOpen > 1) {
      const firstTitle = await railButtonsOpen.first().getAttribute('title')
      const secondTitle = await railButtonsOpen.nth(1).getAttribute('title')
      await railButtonsOpen.nth(1).click()
      await delay(500)
      // The submenu heading is an uppercase span inside the submenu panel
      const heading = page.locator('div.w-64 span, aside + div span').first()
      let headingText = ''
      try {
        headingText = (await heading.textContent({ timeout: 5000 })) ?? ''
      } catch {
        headingText = '(not found)'
      }
      log(true, `Tab switch: clicked "${secondTitle}", heading shows "${headingText?.trim()}"`)
      await page.screenshot({ path: `${screenshotsDir}/10b-rail-tab-switch.png`, fullPage: false })
    }

    // ── 8c. Test rail tab clicking when sidebar is collapsed ────────────
    console.log('\n=== Step 8c: Test rail tab clicking (sidebar collapsed) ===')

    // Collapse the sidebar
    const collapseBtn = page.locator('button[title*="Collapse"]').first()
    if (await collapseBtn.count() > 0) {
      await collapseBtn.click()
      await delay(1000)
      log(true, 'Collapsed sidebar')

      // Now click a rail tab — should re-open the sidebar
      const railBtnsCollapsed = page.locator('aside button[title]')
      if (await railBtnsCollapsed.count() > 1) {
        await railBtnsCollapsed.nth(2).click()
        await delay(1000)
        const submenuPanel = page.locator('aside + div, div.w-64')
        const panelVisible = await submenuPanel.first().isVisible().catch(() => false)
        log(panelVisible, 'Sidebar re-opened after clicking rail tab while collapsed')
        await page.screenshot({ path: `${screenshotsDir}/10c-rail-collapsed-click.png`, fullPage: false })
      }
    } else {
      log(false, 'Collapse button not found')
    }

    // ── 9. Navigate to a specific page and check breadcrumb updates ─────
    console.log('\n=== Step 9: Test Breadcrumb on Navigation ===')

    // Try navigating to a known route
    await page.goto(`${BASE}/sales-dashboard`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
    await delay(2000)
    await page.screenshot({ path: `${screenshotsDir}/11-sales-dashboard.png`, fullPage: false })

    const breadcrumbAfterNav = page.locator('nav[aria-label="Breadcrumb"]')
    if (await breadcrumbAfterNav.count() > 0) {
      const breadcrumbText = await breadcrumbAfterNav.textContent()
      log(true, `Breadcrumb on sales-dashboard: "${breadcrumbText?.trim()}"`)
    } else {
      log(false, 'Breadcrumb not found after navigation')
    }

    // ── 10. Check console errors ────────────────────────────────────────
    console.log('\n=== Step 10: Check Console Errors ===')

    // Collect any console errors
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await delay(2000)
    log(consoleErrors.length === 0, `Console errors: ${consoleErrors.length}${consoleErrors.length > 0 ? ' — ' + consoleErrors.join('; ') : ''}`)

  } catch (err) {
    log(false, `Exception: ${err.message}`)
    await page.screenshot({ path: `${screenshotsDir}/error.png`, fullPage: false }).catch(() => {})
  } finally {
    await browser.close()
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n=== SUMMARY ===`)
  console.log(`Passed: ${passed} | Failed: ${failed} | Total: ${results.length}`)
  if (failed > 0) {
    console.log(`\nFailed checks:`)
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.msg}`))
  }
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
