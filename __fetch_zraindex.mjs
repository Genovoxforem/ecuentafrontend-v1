import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.fill('input[name="username"]', 'Vox_admin');
await page.fill('input[name="password"]', '12345');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 });

const result = await page.evaluate(async () => {
  const res = await fetch('/custom/zra/zraindex.php?mainmenu=zra', { credentials: 'same-origin' });
  const text = await res.text();
  return { status: res.status, len: text.length, text };
});
console.log('status:', result.status, 'len:', result.len);
writeFileSync('D:/Ecuent-v1/latest-ecunta-v2/ecuentafrontend-v1/__zraindex.html', result.text);

await browser.close();
