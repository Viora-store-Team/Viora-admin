/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS diagnostic script. */
const fs=require('node:fs');
const {chromium}=require('C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const base='https://viora-backend-tuqg.onrender.com/api';
 if(!process.env.QA_ADMIN_EMAIL || !process.env.QA_ADMIN_PASSWORD)throw Error('Set QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD');
 const credentials=JSON.stringify({email:process.env.QA_ADMIN_EMAIL,password:process.env.QA_ADMIN_PASSWORD});
 const session=await fetch(base+'/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:credentials}).then(r=>r.json());
 if(!session.token)throw Error('Login failed');
 const headers={Authorization:`Bearer ${session.token}`};
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.addInitScript(token=>localStorage.setItem('token',token),session.token);
 await context.route(base+'/**',route=>route.request().method()==='GET'?route.continue():route.abort());
 const results=[];const paths=['/','/stores','/users','/orders','/categories','/reviews','/support','/content','/banners','/reports','/delivery'];
 for(const [endpoint,key,prefix] of [['/admin/stores?limit=1','stores','/stores/'],['/admin/users?limit=1','users','/users/'],['/admin/support/tickets?limit=1','tickets','/support/']]){
  const body=await fetch(base+endpoint,{headers}).then(r=>r.json());if(body[key]?.[0])paths.push(prefix+body[key][0].id);
 }
 for(const path of paths){
  const page=await context.newPage();const errors=[];const responses=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base))responses.push({path:new URL(r.url()).pathname,status:r.status()});});
  await page.goto('http://localhost:3100'+path);await page.waitForTimeout(2200);
  const info={path,errors,responses,main:await page.locator('main').count(),spinners:await page.getByRole('status').count(),desktopOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
  if(path==='/orders'){
   const buttons=page.getByRole('button',{name:'مراجعة الطلب',exact:true});
   if(await buttons.count()){await buttons.first().click();await page.waitForTimeout(1300);info.orderDetailOpened=await page.getByText('تفاصيل الطلب',{exact:true}).count();}
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  info.mobileOverflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
  results.push(info);console.log(JSON.stringify(info));await page.close();
 }
 await browser.close();fs.writeFileSync('audit/live-browser-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
