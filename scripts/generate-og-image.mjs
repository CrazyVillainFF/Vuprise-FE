import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Renders the 1200x630 social share card from the same visual language as the
// app (dark theme, white wordmark, ring mark) and writes it to public/ so it
// ships with the build. Run manually: node scripts/generate-og-image.mjs

const outPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/share-card.png');

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden; position: relative;
    background: #000000; color: #ffffff;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    display: flex; align-items: center; justify-content: center;
  }
  .glow { position: absolute; inset: -25%; background: radial-gradient(circle at 50% 46%, rgba(255,255,255,.17), rgba(255,255,255,.05) 36%, transparent 70%); }
  .ring { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 500px; height: 500px; border: 1.5px solid rgba(255,255,255,.32); border-radius: 50%; }
  .ring.small { width: 620px; height: 620px; border-color: rgba(255,255,255,.12); }
  .content { position: relative; text-align: center; padding: 0 96px; }
  .mark { font-size: 104px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; }
  .divider { width: 68px; height: 1.5px; background: rgba(255,255,255,.42); margin: 30px auto; }
  .tagline { font-size: 35px; font-weight: 500; color: rgba(255,255,255,.88); line-height: 1.35; }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="ring small"></div>
  <div class="ring"></div>
  <div class="content">
    <div class="mark">Vuprise</div>
    <div class="divider"></div>
    <div class="tagline">A network for what&rsquo;s next</div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outPath });
  console.log(`Wrote ${outPath}`);
} finally {
  await browser.close();
}
