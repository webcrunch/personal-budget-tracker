// Renders the link-preview card and the favicon PNGs into frontend/react-app/public/.
// Needs Playwright: node tools/social-cards/render.mjs (set PLAYWRIGHT to another install's
// node_modules/playwright if none is installed here)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(here, '..', '..', 'frontend', 'react-app', 'public');

const browser = await chromium.launch();
const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.goto(pathToFileURL(path.join(here, 'budget.html')).href);
await card.screenshot({ path: path.join(pub, 'og-budget.png') });

// The 512 px money bag at the sizes browsers and phones ask for. Inlined, since a page made with
// setContent may not load file: URLs. iOS fills a transparent touch icon with black, so that one
// gets a white background and a margin.
const bag = `data:image/png;base64,${readFileSync(path.join(pub, 'money_bag.png')).toString('base64')}`;
for (const [file, size, pad, bg] of [['favicon-32.png', 32, 0, 'transparent'], ['apple-touch-icon.png', 180, 20, 'white']]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;padding:${pad}px;background:${bg}"><img src="${bag}" width="${size - 2 * pad}" height="${size - 2 * pad}" style="display:block"></body>`);
  await page.screenshot({ path: path.join(pub, file), omitBackground: bg === 'transparent' });
  await page.close();
}

await browser.close();
