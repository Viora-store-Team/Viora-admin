/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS diagnostic script. */
const fs=require('node:fs');
(async()=>{
 const base='https://viora-backend-tuqg.onrender.com/api';
 if(!process.env.QA_ADMIN_EMAIL || !process.env.QA_ADMIN_PASSWORD)throw Error('Set QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD');
 const credentials=JSON.stringify({email:process.env.QA_ADMIN_EMAIL,password:process.env.QA_ADMIN_PASSWORD});
 const session=await fetch(base+'/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:credentials}).then(r=>r.json());
 const headers={Authorization:`Bearer ${session.token}`};
 const list=await fetch(base+'/admin/stores?limit=3',{headers}).then(r=>r.json());
 const results=[];
 for(const store of list.stores||[]){
  const path='/admin/stores/'+store.id;
  const r=await fetch(base+path,{headers});const b=await r.json();
  results.push({path,status:r.status,success:b.success,keys:Object.keys(b),message:b.success?undefined:b.message});
 }
 for(const path of ['/admin/categories','/admin/orders','/admin/users','/admin/content','/admin/banners','/admin/support/tickets','/notifications']){
  const r=await fetch(base+path);const b=await r.json();results.push({path,authenticated:false,status:r.status,success:b.success});
 }
 console.log(JSON.stringify(results,null,2));fs.writeFileSync('audit/detail-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
