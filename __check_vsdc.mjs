import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.fill('input[name="username"]', 'Vox_admin');
await page.fill('input[name="password"]', '12345');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 });

const result = await page.evaluate(async () => {
  const res = await fetch('/api/zra/vsdc-status/', { credentials: 'same-origin' });
  const text = await res.text();
  return { status: res.status, sample: text.slice(0, 500) };
});
console.log('vsdc-status:', JSON.stringify(result, null, 2));

await browser.close();
