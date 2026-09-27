import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const auditDirectory = fileURLToPath(new URL('.', import.meta.url));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ json: { success: true } }));
  const results = [];
  for (const [name, width, height] of [['desktop', 1440, 900], ['laptop', 1024, 768], ['tablet', 768, 1024], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${process.env.LOGIN_QA_URL || 'http://localhost:3000'}/login`);
    await page.getByRole('heading', { name: 'مرحباً بعودتك.' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('main').evaluate(async element => {
      await Promise.all(element.getAnimations({ subtree: true }).filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished));
    });
    await page.screenshot({ path: path.join(auditDirectory, `login-${name}-redesign.png`), fullPage: true });
    results.push(await page.evaluate(({ name, width, height }) => ({
      name, width, height,
      pageWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > width,
      formVisible: document.querySelector('button[type="submit"]').getBoundingClientRect().bottom < height,
      imageLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0),
      cairoLoaded: [...document.fonts].some(font => font.family.replaceAll('"', '') === 'Viora Cairo' && font.status === 'loaded'),
    }), { name, width, height }));
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  results.push({ reducedMotion: await page.locator('form').evaluate(element => getComputedStyle(element.parentElement).animationName) });
  const report = JSON.stringify({ results, errors }, null, 2);
  await writeFile(path.join(auditDirectory, 'login-visual-results.json'), `${report}\n`);
  console.log(report);
  await browser.close();
  if (errors.length || results.some(result => result.horizontalOverflow || result.formVisible === false || result.imageLoaded === false || result.cairoLoaded === false)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
