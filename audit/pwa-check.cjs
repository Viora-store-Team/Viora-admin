/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS diagnostic script. */
const fs=require('node:fs');
const {chromium}=require('C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('https://viora-backend-tuqg.onrender.com/api/**',r=>r.fulfill({json:{success:true}}));
 const page=await context.newPage();const response=await page.goto('http://localhost:3100/login');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await page.screenshot({path:'audit/login-mobile.png',fullPage:true});
 const result={headers:await response.allHeaders(),manifest:await context.request.get('http://localhost:3100/manifest.webmanifest').then(r=>r.json())};
 result.cache=await page.evaluate(async()=>{const out={};for(const key of await caches.keys())out[key]=(await(await caches.open(key)).keys()).map(r=>new URL(r.url).pathname);return out});
 await context.setOffline(true);await page.goto('http://localhost:3100/stores');result.offlineText=await page.locator('body').innerText();
 await browser.close();fs.writeFileSync('audit/pwa-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1});
