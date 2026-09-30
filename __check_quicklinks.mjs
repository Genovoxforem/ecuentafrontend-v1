import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.fill('input[name="username"]', 'Vox_admin');
await page.fill('input[name="password"]', '12345');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 });

const result = await page.evaluate(async () => {
  const res = await fetch('/quicklinks_ajax.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'type=getzraresponse',
  });
  const text = await res.text();
  return { status: res.status, contentType: res.headers.get('content-type'), text };
});
console.log('status:', result.status, 'content-type:', result.contentType);
console.log('---RAW---');
console.log(result.text);
console.log('---END---');

await browser.close();
