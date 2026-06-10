import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5173';
const outDir = path.resolve('scripts/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('captured:', name);
}

const CHROME_PATH = 'C:\\Users\\jtran\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  // Desktop viewport
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const dp = await desktop.newPage();

  // 1. Login screen — light
  await dp.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('theme', 'light');
  });
  await dp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(1200);
  await shot(dp, '01-login-light.png');

  // 2. Login screen — dark
  await dp.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await sleep(500);
  await shot(dp, '02-login-dark.png');

  // 3. Program preview — light
  const dp2 = await desktop.newPage();
  await dp2.goto(`${BASE}/preview.html`, { waitUntil: 'networkidle' });
  await sleep(1500); // let fonts load
  await shot(dp2, '03-program-light.png');

  // 4. Program preview — dark
  const dp3 = await desktop.newPage();
  await dp3.goto(`${BASE}/preview.html?theme=dark`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await shot(dp3, '04-program-dark.png');

  // Mobile viewport — same preview
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobile.newPage();
  await mp.goto(`${BASE}/preview.html`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await shot(mp, '05-program-mobile-light.png');

  const mp2 = await mobile.newPage();
  await mp2.goto(`${BASE}/preview.html?theme=dark`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await shot(mp2, '06-program-mobile-dark.png');

  await browser.close();
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
