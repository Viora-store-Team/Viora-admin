/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS diagnostic script. */
const fs = require('node:fs');
const { chromium } = require('C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = [];
const base = 'http://localhost:3100';
const user = { id:1, name:'QA Admin', email:'qa@example.test', role:'ADMIN', isActive:true };
const pagination = {page:1,limit:15,total:0,totalPages:0};
async function run() {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 async function scenario(name, fn, overrides={}) {
  if(process.argv[2] && !name.includes(process.argv[2])) return;
  const context = await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('token','qa-local-fixture'));
  const page = await context.newPage(); const requests=[]; const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://viora-backend-tuqg.onrender.com/api/**', async route=>{
   const path = new URL(route.request().url()).pathname.replace('/api','');
   requests.push({path,method:route.request().method(),query:new URL(route.request().url()).search});
   if(overrides[path]) return overrides[path](route);
   let body={success:true};
   if(path==='/admin/me') body.user=user;
   else if(path==='/notifications/count') body.unread=0;
   else if(path==='/notifications') Object.assign(body,{notifications:[],unread:0});
   else if(path==='/admin/stores') Object.assign(body,{stores:[],pagination});
   else if(path==='/admin/users') Object.assign(body,{users:[],pagination});
   else if(path==='/admin/categories') body.categories=[];
   else if(path==='/admin/occasions') body.occasions=[];
   else if(path==='/admin/collections') body.collections=[];
   else if(path==='/admin/orders') Object.assign(body,{orders:[],pagination});
   else if(path==='/admin/support/tickets') Object.assign(body,{tickets:[],pagination});
   else if(path==='/admin/ratings') Object.assign(body,{ratings:[],pagination});
   else if(path==='/admin/content') body.pages=[];
   else if(path.startsWith('/admin/content/')) body.page={key:path.split('/').at(-1),title:'QA Content',html:'<p>QA original content</p>',isPublished:false,updatedAt:null};
   else if(path==='/admin/banners') body.banners=[];
   else if(path!='/health') return route.fulfill({status:404,json:{success:false,message:'QA not found'}});
   return route.fulfill({status:200,json:body});
  });
  try { const evidence=await fn(page,requests); output.push({name,evidence,errors}); }
  catch(e){output.push({name,testError:e.message,errors});}
  console.log(JSON.stringify(output.at(-1)));
  await context.close();
 }
 await scenario('protected route without token',async p=>{
  await p.addInitScript(()=>localStorage.removeItem('token'));
  await p.goto(base+'/stores');await p.waitForURL('**/login');return {path:new URL(p.url()).pathname};
 });
 await scenario('auth server 503 produces blank protected page',async p=>{
  await p.goto(base+'/stores');await p.waitForTimeout(1000);
  return {url:p.url(),text:(await p.locator('body').innerText()).trim(),token:!!await p.evaluate(()=>localStorage.getItem('token'))};
 },{'/admin/me':r=>r.fulfill({status:503,json:{success:false,message:'QA unavailable'}})});
 await scenario('click active store tab hangs loading',async(p,req)=>{
  await p.goto(base+'/stores');await p.getByRole('button',{name:'الكل',exact:true}).waitFor();await p.waitForTimeout(300);
  const before=req.filter(r=>r.path==='/admin/stores').length;
  await p.getByRole('button',{name:'الكل',exact:true}).click();await p.waitForTimeout(700);
  return {before,after:req.filter(r=>r.path==='/admin/stores').length,spinners:await p.getByRole('status').count(),text:(await p.locator('main').innerText()).slice(-500)};
 });
 await scenario('catalog empty API response invents records',async p=>{
  await p.goto(base+'/categories');await p.getByRole('button',{name:'فلاتر ووسوم المناسبات',exact:true}).click();await p.waitForTimeout(500);
  return {text:(await p.locator('main').innerText()).slice(0,2200)};
 });
 await scenario('content errors silently show saveable defaults',async p=>{
  await p.goto(base+'/content');await p.waitForTimeout(800);
  return {text:(await p.locator('main').innerText()).slice(0,1800),editorLength:await p.locator('[contenteditable]').innerText().then(s=>s.length).catch(()=>0)};
 },Object.fromEntries(['/admin/content','/admin/content/terms','/admin/content/privacy','/admin/content/about','/admin/content/faq'].map(path=>[path,r=>r.fulfill({status:503,json:{success:false,message:'QA unavailable'}})])));
 await scenario('content HTML executes event handlers',async p=>{
  await p.goto(base+'/content');await p.waitForTimeout(700);
  return {executed:await p.evaluate(()=>document.documentElement.dataset.qaXss==='executed')};
 },{'/admin/content/terms':r=>r.fulfill({status:200,json:{success:true,page:{key:'terms',title:'QA',html:'<img src="/qa-missing-image" onerror="document.documentElement.dataset.qaXss=\'executed\'">',isPublished:false,updatedAt:null}}})});
 await scenario('401 without forceLogout leaves app mounted',async p=>{
  await p.goto(base+'/stores');await p.waitForTimeout(700);
  return {url:p.url(),token:!!await p.evaluate(()=>localStorage.getItem('token')),sidebar:await p.locator('nav').count(),text:(await p.locator('main').innerText()).slice(-700)};
 },{'/admin/stores':r=>r.fulfill({status:401,json:{success:false,message:'QA expired'}})});
 await scenario('notifications failure falsely displays empty state',async p=>{
  await p.goto(base+'/stores');await p.getByRole('button',{name:'الإشعارات',exact:true}).click();await p.waitForTimeout(300);
  return {falseEmpty:await p.getByText('لا توجد إشعارات حالياً').isVisible()};
 },{'/notifications':r=>r.fulfill({status:503,json:{success:false,message:'QA unavailable'}})});
 for(const path of ['/users','/orders','/support','/banners','/reviews','/reports','/delivery','/reports/1']) await scenario('route smoke '+path,async p=>{
  await p.goto(base+path);await p.waitForTimeout(800);return {url:p.url(),text:(await p.locator('main').innerText()).slice(0,250)};
 });
 for(const path of ['/stores/abc','/users/0','/reports/-1']) await scenario('invalid id '+path,async p=>{
  await p.goto(base+path);await p.waitForTimeout(500);return {spinners:await p.getByRole('status').count(),text:(await p.locator('main').innerText()).slice(0,200)};
 });
 await scenario('content save failure has no error',async(p,requests)=>{
  await p.goto(base+'/content');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'حفظ ونشر الصفحة',exact:true}).click();await p.waitForTimeout(400);
  return {put:requests.filter(r=>r.method==='PUT'),errorVisible:(await p.locator('body').innerText()).includes('QA save failed')};
 },{'/admin/content/terms':r=>r.request().method()==='PUT'?r.fulfill({status:500,json:{success:false,message:'QA save failed'}}):r.fulfill({status:200,json:{success:true,page:{key:'terms',title:'QA',html:'<p>QA original content</p>',isPublished:false,updatedAt:null}}})});
 await scenario('review aggregates only use current page and search stays local',async(p,requests)=>{
  await p.goto(base+'/reviews');await p.waitForTimeout(400);
  const text=(await p.locator('main').innerText()).slice(0,550);
  const before=requests.filter(r=>r.path==='/admin/ratings').length;
  await p.locator('input[type="search"]').fill('review on page two');await p.waitForTimeout(400);
  return {text,before,after:requests.filter(r=>r.path==='/admin/ratings').length,query:requests.filter(r=>r.path==='/admin/ratings').map(r=>r.query)};
 },{'/admin/ratings':r=>r.fulfill({status:200,json:{success:true,ratings:[{id:1,rating:5,comment:'QA review',createdAt:'2026-09-01',isHidden:false,storeId:1,storeName:'QA store'}],pagination:{page:1,limit:10,total:100,totalPages:10}}})});
 const store={id:1,name:'QA Store',status:'PENDING',isActive:false,owner:{id:2,name:'QA Owner',email:'qa-owner@example.test',phone:null,emailVerified:true,isActive:false,createdAt:'2026-01-01'},categories:[],productsCount:0,ordersCount:0,revenue:'0',createdAt:'2026-01-01',updatedAt:'2026-01-01',reviewedAt:null,reviewedBy:null,rejectionReason:null};
 await scenario('deep approval ignores owner activation failure',async(p,requests)=>{
  await p.goto(base+'/stores/1');await p.getByRole('button',{name:'قبول المتجر',exact:true}).click();
  await p.getByRole('dialog').getByRole('button',{name:'قبول المتجر',exact:true}).click();await p.waitForTimeout(500);
  return {writes:requests.filter(r=>r.method==='PATCH'),falseSuccess:await p.getByText('تم قبول وتنشيط المتجر بنجاح',{exact:true}).isVisible(),activationErrorVisible:(await p.locator('body').innerText()).includes('QA activation failed')};
 },{'/admin/stores/1':r=>r.fulfill({json:{success:true,store}}),'/admin/stores/1/approve':r=>r.fulfill({json:{success:true,store:{...store,status:'APPROVED'}}}),'/admin/users/2/activate':r=>r.fulfill({status:500,json:{success:false,message:'QA activation failed'}})});
 await scenario('deep failed notification read is shown as success',async p=>{
  await p.goto(base+'/stores');await p.getByRole('button',{name:'الإشعارات',exact:true}).click();await p.getByText('QA notification',{exact:true}).click();
  await p.getByRole('button',{name:'الإشعارات',exact:true}).click();await p.waitForTimeout(200);
  return {text:await p.locator('body').innerText().then(t=>t.includes('1 غير مقروء')),badge:await p.locator('[title="1 إشعار جديد"]').count()};
 },{'/notifications/count':r=>r.fulfill({json:{success:true,unread:1}}),'/notifications':r=>r.fulfill({json:{success:true,notifications:[{id:1,title:'QA notification',body:'QA',type:'OTHER',readAt:null,createdAt:'2026-01-01',data:{}}]}}),'/notifications/1/read':r=>r.fulfill({status:500,json:{success:false,message:'QA read failed'}})});
 await scenario('deep content save response overwrites another active document',async p=>{
  await p.goto(base+'/content');await p.waitForTimeout(300);await p.getByRole('button',{name:'حفظ ونشر الصفحة',exact:true}).click();
  await p.getByRole('button').filter({hasText:'سياسة الخصوصية'}).click();await p.waitForTimeout(1200);
  return {editor:await p.locator('[contenteditable]').innerText(),text:(await p.locator('main').innerText()).includes('عنوان الصفحة (سياسة الخصوصية)')};
 },{'/admin/content/terms':async r=>{if(r.request().method()==='PUT')await new Promise(resolve=>setTimeout(resolve,800));return r.fulfill({json:{success:true,page:{key:'terms',title:'QA Terms',html:r.request().method()==='PUT'?'<p>QA SAVED TERMS</p>':'<p>QA terms before save</p>',isPublished:true,updatedAt:null}}});}});
 await scenario('auth empty and invalid login blocked locally',async(p,requests)=>{
  await p.goto(base+'/login');await p.locator('button[type="submit"]').click();
  const empty=await p.locator('#email').getAttribute('aria-invalid');
  await p.locator('#email').fill('bad-email');await p.locator('button[type="submit"]').click();
  return {emptyInvalid:empty,invalidEmail:await p.locator('#email').getAttribute('aria-invalid'),loginRequests:requests.filter(r=>r.path==='/admin/login').length};
 });
 await scenario('auth login error displayed',async p=>{
  await p.goto(base+'/login');await p.locator('#email').fill('qa@example.test');await p.locator('#password').fill('QA-only');await p.locator('button[type="submit"]').click();
  await p.getByText('QA incorrect credentials',{exact:true}).waitFor();return {alert:await p.getByText('QA incorrect credentials',{exact:true}).innerText(),buttonEnabled:await p.locator('button[type="submit"]').isEnabled()};
 },{'/admin/login':r=>r.fulfill({status:401,json:{success:false,message:'QA incorrect credentials'}})});
 await scenario('auth forceLogout redirects and clears token',async p=>{
  await p.goto(base+'/stores');await p.waitForURL('**/login');await p.getByText('QA session expired',{exact:true}).waitFor();return {url:p.url(),token:!!await p.evaluate(()=>localStorage.getItem('token')),alert:await p.getByText('QA session expired',{exact:true}).innerText()};
 },{'/admin/stores':r=>r.fulfill({status:401,json:{success:false,forceLogout:true,message:'QA session expired'}})});
 await browser.close(); fs.writeFileSync(process.argv[2]?`audit/${process.argv[2]}-browser-results.json`:'audit/browser-results.json',JSON.stringify(output,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1});
