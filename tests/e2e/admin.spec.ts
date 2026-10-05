import { test, expect, type Page } from "@playwright/test";

const api = "https://api.vioragaza.com/api";
const user = {id:1, name:"QA Admin", email:"qa@example.test", role:"ADMIN", isActive:true};
const pagination = {page:1,limit:15,total:0,totalPages:0};
const store = {id:1,name:"QA Store",status:"PENDING",isActive:false,owner:{id:2,name:"QA Owner",email:"owner@example.test",phone:null,emailVerified:true,isActive:false,createdAt:"2026-01-01"},categories:[],productsCount:0,ordersCount:0,revenue:"0",createdAt:"2026-01-01",updatedAt:"2026-01-01",reviewedAt:null,reviewedBy:null,rejectionReason:null};
const content = (key: string, html = `<p>QA ${key} content</p>`) => ({success:true,page:{key,title:`QA ${key}`,html,isPublished:false,updatedAt:null}});

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("token","qa-fixture"));
  await page.route(`${api}/**`, async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    const data: Record<string,unknown> = {
      "/health": {success:true}, "/admin/me": {success:true,user},
      "/notifications/count": {success:true,unread:0},
      "/notifications": {success:true,notifications:[],unread:0,pagination},
      "/admin/stores": {success:true,stores:[],pagination},
      "/admin/stores/1": {success:true,store},
      "/admin/users": {success:true,users:[],pagination},
      "/admin/categories": {success:true,categories:[]},
      "/admin/orders": {success:true,orders:[],pagination},
      "/admin/support/tickets": {success:true,tickets:[],pagination},
      "/admin/ratings": {success:true,ratings:[],pagination},
    };
    if (path.startsWith("/admin/content/")) return route.fulfill({json:content(path.split("/").at(-1)!)});
    return route.fulfill({status:data[path]?200:404,json:data[path]||{success:false,message:"Unavailable"}});
  });
});

async function loadedContent(page: Page) {
  await page.goto("/content");
  await expect(page.getByRole("textbox",{name:"محتوى الصفحة"})).toHaveText("QA terms content");
}

test("protected pages redirect visitors without a token",async({page})=>{
  await page.addInitScript(()=>localStorage.removeItem("token"));
  await page.goto("/stores");await expect(page).toHaveURL(/\/login$/);
});

test("auth failure is recoverable and retains token",async({page})=>{
  let calls=0;
  await page.route(`${api}/admin/me`,r=>r.fulfill(++calls===1?{status:503,json:{success:false,message:"QA auth unavailable"}}:{json:{success:true,user}}));
  await page.goto("/stores");await expect(page.getByText("QA auth unavailable")).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("token"))).toBe("qa-fixture");
  await page.getByRole("button",{name:"إعادة المحاولة"}).click();
  await expect(page.getByRole("button",{name:"الكل",exact:true})).toBeVisible();
});

for(const forceLogout of [false,true]) test(`401 redirects with forceLogout=${forceLogout}`,async({page})=>{
  await page.route(`${api}/admin/stores?*`,r=>r.fulfill({status:401,json:{success:false,forceLogout,message:"QA expired"}}));
  await page.goto("/stores");await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("QA expired",{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("token"))).toBeNull();
});

for(const path of ["/stores","/users","/support"]) test(`selected tab does not hang ${path}`,async({page})=>{
  await page.goto(path);const button=page.getByRole("button",{name:"الكل",exact:true}).first();
  await expect(button).toBeVisible();await expect(page.locator('[role="status"].animate-spin')).toHaveCount(0);
  await button.click();await expect(page.locator('[role="status"].animate-spin')).toHaveCount(0);
});

test("dashboard shows one order and revenue card for the selected period",async({page})=>{
  const requestedPeriods:number[]=[];
  await page.route(`${api}/admin/stats?*`,route=>{
    const period=Number(new URL(route.request().url()).searchParams.get("period"));
    requestedPeriods.push(period);
    return route.fulfill({json:{success:true,period:{days:period,from:"2026-01-01",to:"2026-01-30"},stats:{
      stores:{active:1,pending:0,rejected:0,suspended:0,total:1},
      users:{merchants:1,customers:2,total:3,newMerchants:period===7?1:2,newCustomers:period===7?3:5},
      orders:{total:900,inPeriod:period},revenue:{total:"99999999.00",inPeriod:String(period*100)},reports:{open:0}
    },topStores:[],charts:{signups:[],orders:[]}}});
  });

  await page.goto("/");
  await expect(page.getByText("طلبات الفترة",{exact:true})).toHaveCount(1);
  await expect(page.getByText("إيرادات الفترة",{exact:true})).toHaveCount(1);
  const orderValue=()=>page.getByText("طلبات الفترة",{exact:true}).evaluate(el=>el.parentElement?.parentElement?.lastElementChild?.textContent||"");
  const revenueValue=()=>page.getByText("إيرادات الفترة",{exact:true}).evaluate(el=>el.parentElement?.parentElement?.lastElementChild?.textContent||"");
  await expect.poll(async()=>await orderValue()).toContain("30");
  await expect.poll(async()=>(await revenueValue()).replace(/,/g,"")).toContain("3000");

  await page.getByRole("button",{name:"آخر 7 أيام",exact:true}).click();
  await expect.poll(()=>requestedPeriods.at(-1)).toBe(7);
  await expect.poll(async()=>await orderValue()).toContain("7");
  await expect.poll(async()=>(await revenueValue()).replace(/,/g,"")).toContain("700");
});

for(const path of ["/stores/abc","/users/0","/reports/-1","/support/abc"]) test(`invalid id renders not found ${path}`,async({page})=>{
  await page.goto(path);await expect(page.getByText("العنصر غير موجود",{exact:true})).toBeVisible();
  await expect(page.locator('[role="status"].animate-spin')).toHaveCount(0);
});

test("catalog only loads categories and has no removed sections",async({page})=>{
  const removedRequests:string[]=[];
  page.on("request",request=>{if(/\/admin\/(occasions|collections)/.test(request.url()))removedRequests.push(request.url());});
  await page.goto("/categories");
  await expect(page.getByRole("button",{name:"تصنيف رئيسي",exact:true}).first()).toBeVisible();
  await expect(page.getByText(/فلاتر ووسوم المناسبات|المجموعات المميزة/)).toHaveCount(0);
  expect(removedRequests).toEqual([]);
});

test("content load failure blocks publishing",async({page})=>{
  await page.route(`${api}/admin/content/**`,r=>r.fulfill({status:503,json:{success:false,message:"QA load failed"}}));
  await page.goto("/content");await expect(page.getByText("QA load failed",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"حفظ ونشر الصفحة",exact:true})).toBeDisabled();
  await expect(page.getByRole("textbox",{name:"محتوى الصفحة"})).toBeEmpty();
});

test("content save errors are visible",async({page})=>{
  await page.route(`${api}/admin/content/terms`,r=>r.fulfill(r.request().method()==="PUT"?{status:500,json:{success:false,message:"QA save failed"}}:{json:content("terms")}));
  await loadedContent(page);await page.getByRole("button",{name:"حفظ ونشر الصفحة",exact:true}).click();
  await expect(page.getByRole("main").getByText("QA save failed",{exact:true})).toBeVisible();
  await expect(page.getByLabel("إشعارات العمليات").getByRole("alert")).toContainText("QA save failed");
});

test("successful content publishing uses the site-wide toast",async({page})=>{
  await loadedContent(page);await page.getByRole("button",{name:"حفظ ونشر الصفحة",exact:true}).click();
  await expect(page.getByLabel("إشعارات العمليات").getByRole("status")).toContainText("تم حفظ الصفحة بنجاح");
});

test("saved content never overwrites another document",async({page})=>{
  let finish!:()=>void;const pending=new Promise<void>(resolve=>finish=resolve);
  await page.route(`${api}/admin/content/terms`,async r=>{
    if(r.request().method()==="PUT"){await pending;await r.fulfill({json:content("terms","<p>QA saved terms</p>")});}
    else await r.fulfill({json:content("terms")});
  });
  await loadedContent(page);await page.getByRole("button",{name:"حفظ ونشر الصفحة",exact:true}).click();
  await page.getByRole("button").filter({hasText:"سياسة الخصوصية"}).click();finish();
  await expect(page.getByRole("button",{name:"حفظ ونشر الصفحة",exact:true})).toBeEnabled();
  await expect(page.getByRole("textbox",{name:"محتوى الصفحة"})).toHaveText("QA privacy content");
});

test("HTML handlers and unsafe URLs are removed",async({page})=>{
  await page.route(`${api}/admin/content/terms`,r=>r.fulfill({json:content("terms",'<img src="/missing" onerror="window.qaXss=true"><a href="javascript:alert(1)">link</a><p style="text-align: center; background:url(https://example.test/track)">safe</p>')}));
  await page.goto("/content");const editor=page.getByRole("textbox",{name:"محتوى الصفحة"});
  await expect(editor).toContainText("safe");await expect(editor.locator("img,[onerror],[href^='javascript:']")).toHaveCount(0);
  expect(await editor.innerHTML()).not.toContain("background");
  expect(await page.evaluate(()=>"qaXss" in window)).toBe(false);
});

for (const ownerActive of [true,false]) test(`approving store preserves owner active=${ownerActive} without account mutations`,async({page})=>{
  const mutations:string[]=[];
  const current={...store,owner:{...store.owner,isActive:ownerActive}};
  await page.route(`${api}/admin/stores/1`,r=>r.fulfill({json:{success:true,store:current}}));
  await page.route(`${api}/admin/stores/1/approve`,r=>{mutations.push("approve");return r.fulfill({json:{success:true,store:{...current,status:"APPROVED"}}});});
  await page.route(`${api}/admin/users/2/**`,r=>{mutations.push("account mutation");return r.fulfill({status:409,json:{success:false,message:"حساب المالك مفعل مسبقا"}});});
  await page.goto("/stores/1");await page.getByRole("button",{name:"قبول المتجر",exact:true}).click();
  await page.getByRole("dialog").getByRole("button",{name:"قبول المتجر",exact:true}).click();
  await expect(page.getByText("تم قبول المتجر بنجاح",{exact:true})).toBeVisible();
  expect(mutations).toEqual(["approve"]);
  await expect(page.getByText("حساب المالك مفعل مسبقا",{exact:true})).toHaveCount(0);
});

test("rejecting store does not suspend its owner",async({page})=>{
  const mutations:string[]=[];
  await page.route(`${api}/admin/stores/1/reject`,r=>{mutations.push("reject");return r.fulfill({json:{success:true,store:{...store,status:"REJECTED"}}});});
  await page.route(`${api}/admin/users/2/**`,r=>{mutations.push("account mutation");return r.fulfill({status:500,json:{success:false}});});
  await page.goto("/stores/1");await page.getByRole("button",{name:"رفض المتجر",exact:true}).click();
  await page.getByRole("dialog").getByRole("textbox").fill("الصور غير واضحة يرجى تحديثها");
  await page.getByRole("dialog").getByRole("button",{name:"رفض المتجر",exact:true}).click();
  await expect(page.getByText("تم رفض المتجر بنجاح",{exact:true})).toBeVisible();
  expect(mutations).toEqual(["reject"]);
});

test("notification errors do not look like an empty inbox",async({page})=>{
  await page.route(`${api}/notifications?*`,r=>r.fulfill({status:503,json:{success:false,message:"QA notifications failed"}}));
  await page.goto("/stores");await page.getByRole("button",{name:"الإشعارات",exact:true}).click();
  await expect(page.getByText("QA notifications failed",{exact:true})).toBeVisible();
  await expect(page.getByText("لا توجد إشعارات حالياً",{exact:true})).toHaveCount(0);
});

test("failed notification read preserves unread count",async({page})=>{
  await page.route(`${api}/notifications/count`,r=>r.fulfill({json:{success:true,unread:1}}));
  await page.route(`${api}/notifications?*`,r=>r.fulfill({json:{success:true,unread:1,notifications:[{id:1,title:"QA notification",body:"QA",type:"OTHER",readAt:null,createdAt:"2026-01-01"}]}}));
  await page.route(`${api}/notifications/1/read`,r=>r.fulfill({status:500,json:{success:false,message:"QA read failed"}}));
  await page.goto("/stores");await page.getByRole("button",{name:"الإشعارات",exact:true}).click();await page.getByText("QA notification",{exact:true}).click();
  await expect(page.getByText("QA read failed",{exact:true}).first()).toBeVisible();await expect(page.getByLabel("إشعارات العمليات").getByRole("alert")).toContainText("QA read failed");await expect(page.getByText("1 غير مقروء",{exact:true})).toBeVisible();
});

test("ratings search and analytics cover all pages",async({page})=>{
  await page.route(`${api}/admin/ratings?*`,r=>{
    const second=new URL(r.request().url()).searchParams.get("page")==="2";
    const ratings=second?[{id:11,rating:5,comment:"unique second page review",storeId:1,storeName:"QA Store",createdAt:"2026-09-01T00:00:00Z"}]:Array.from({length:10},(_,i)=>({id:i+1,rating:1,comment:`first ${i}`,storeId:1,storeName:"QA Store",createdAt:"2026-09-01T00:00:00Z"}));
    return r.fulfill({json:{success:true,ratings,pagination:{page:second?2:1,limit:10,total:11,totalPages:2}}});
  });
  await page.goto("/reviews");await expect(page.getByText("1.4",{exact:true}).first()).toBeVisible();
  await page.getByRole("searchbox").fill("unique second");await expect(page.getByText("unique second page review",{exact:true})).toBeVisible();
});

test("removed delivery page returns not found",async({page})=>{
  await page.goto("/delivery");await expect(page.getByRole("heading",{name:"الصفحة غير موجودة",exact:true})).toBeVisible();
  await expect(page.getByText("شركة وصّل للتوصيل",{exact:true})).toHaveCount(0);
});

 test("non JSON unauthorized response clears session",async({page})=>{
 await page.route(`${api}/admin/stores?*`,r=>r.fulfill({status:401,contentType:"text/plain",body:"Unauthorized"}));
 await page.goto("/stores");await expect(page).toHaveURL(/\/login$/);
 expect(await page.evaluate(()=>localStorage.getItem("token"))).toBeNull();
 });

test("missing rating date does not crash the list",async({page})=>{
 await page.route(`${api}/admin/ratings?*`,r=>r.fulfill({json:{success:true,ratings:[{id:1,rating:3,comment:"QA missing date"}],pagination:{page:1,limit:100,total:1,totalPages:1}}}));
 await page.goto("/reviews");await expect(page.getByText("QA missing date",{exact:true})).toBeVisible();
});
test("incomplete ratings never display partial totals",async({page})=>{
 await page.route(`${api}/admin/ratings?*`,r=>r.fulfill({json:{success:true,ratings:[],pagination:{page:1,limit:100,total:11,totalPages:1}}}));
 await page.goto("/reviews");await expect(page.getByText(/غير مكتمل|غير متطابق|ناقصة|اكتمال/).first()).toBeVisible();
});


test("documented order filters reach the server and reset pagination",async({page})=>{
  const requests: URL[]=[];
  await page.route(`${api}/admin/orders?*`,r=>{requests.push(new URL(r.request().url()));return r.fulfill({json:{success:true,orders:[],pagination}});});
  await page.goto("/orders");
  await page.getByLabel("حالة الطلب",{exact:true}).selectOption("DELIVERED");
  await expect.poll(()=>requests.at(-1)?.searchParams.get("status")).toBe("DELIVERED");
  await page.getByLabel("معرّف المتجر",{exact:true}).fill("12");
  await page.getByRole("button",{name:"تطبيق فلتر المتجر",exact:true}).click();
  await expect.poll(()=>requests.at(-1)?.searchParams.get("storeId")).toBe("12");
  expect(requests.at(-1)?.searchParams.get("status")).toBe("DELIVERED");
  expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
  await page.getByRole("button",{name:"مسح الفلاتر",exact:true}).click();
  await expect.poll(()=>requests.at(-1)?.searchParams.has("storeId")).toBe(false);
  expect(requests.at(-1)?.searchParams.has("status")).toBe(false);
});

test("hidden ratings remain reviewable but do not lower public averages",async({page})=>{
  await page.route(`${api}/admin/ratings?*`,r=>r.fulfill({json:{success:true,ratings:[
    {id:1,rating:5,comment:"QA visible",storeId:1,storeName:"QA Store"},
    {id:2,rating:1,isHidden:true,comment:"QA hidden",storeId:1,storeName:"QA Store"}
  ],pagination:{page:1,limit:100,total:2,totalPages:1}}}));
  await page.goto("/reviews");
  await expect(page.getByText("5.0",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("100%",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("QA hidden",{exact:true})).toBeVisible();
});


const supportFixture={id:7,subject:"QA complaint",message:"QA complaint message",status:"OPEN",user:{id:2,name:"QA merchant",email:"merchant@example.test",phone:null},createdAt:"2026-09-01T00:00:00Z",adminNote:null,resolvedAt:null,resolvedBy:null};
test("support list failure is not an empty inbox",async({page})=>{
 await page.route(`${api}/admin/support/tickets?*`,r=>r.fulfill({status:503,json:{success:false,message:"QA support unavailable"}}));
 await page.goto("/support");await expect(page.getByText("QA support unavailable",{exact:true})).toBeVisible();
 await expect(page.getByText("لا توجد تذاكر دعم",{exact:true})).toHaveCount(0);
});
test("support detail retry clears old error",async({page})=>{
 let calls=0;
 await page.route(`${api}/admin/support/tickets/7`,r=>r.fulfill(++calls===1?{status:503,json:{success:false,message:"QA retry ticket"}}:{json:{success:true,ticket:supportFixture}}));
 await page.goto("/support/7");await page.getByRole("button",{name:"إعادة المحاولة"}).click();
 await expect(page.getByText("QA complaint message",{exact:true})).toBeVisible();await expect(page.getByText("QA retry ticket",{exact:true})).toHaveCount(0);
});
for(const failed of [false,true]) test(`support resolution success=${!failed}`,async({page})=>{
 let body:unknown;
 await page.route(`${api}/admin/support/tickets/7`,r=>r.fulfill({json:{success:true,ticket:supportFixture}}));
 await page.route(`${api}/admin/support/tickets/7/resolve`,r=>{body=r.request().postDataJSON();return r.fulfill(failed?{status:500,json:{success:false,message:"QA resolve failed"}}:{json:{success:true,ticket:{...supportFixture,status:"RESOLVED",adminNote:"QA note"}}});});
 await page.goto("/support/7");await page.getByRole("button",{name:"إقفال التذكرة",exact:true}).click();await page.getByRole("dialog").getByRole("textbox").fill("QA note");await page.getByRole("dialog").getByRole("button",{name:"إقفال التذكرة",exact:true}).click();
 if(failed){await expect(page.getByRole("main").getByText("QA resolve failed",{exact:true})).toBeVisible();await expect(page.getByLabel("إشعارات العمليات").getByRole("alert")).toContainText("QA resolve failed");}
 else await expect(page.getByLabel("إشعارات العمليات").getByRole("status")).toContainText("تم إقفال التذكرة");expect(body).toEqual({adminNote:"QA note"});
 if(failed)await expect(page.getByRole("button",{name:"إقفال التذكرة",exact:true})).toBeVisible();
 else await expect(page.getByRole("button",{name:"إقفال التذكرة",exact:true})).toHaveCount(0);
});
test("unavailable reports do not show a misleading empty list",async({page})=>{
 await page.goto("/reports");await expect(page.getByText("هذه الميزة غير متاحة من الخادم حالياً. أعد المحاولة لاحقاً.",{exact:true})).toBeVisible();await expect(page.getByText("ما في بلاغات",{exact:true})).toHaveCount(0);
});

test("reports tolerate backend enum values that are not in the admin maps",async({page})=>{
 const report={id:9,targetType:"REVIEW",targetId:5,targetPreview:"QA review",reason:"QA reason",reporter:{id:2,name:"QA reporter"},status:"PENDING",createdAt:"2026-09-01T00:00:00Z",note:null,content:{review:null,product:null,store:null},relatedCount:0,resolvedAt:null};
 await page.route(`${api}/admin/reports*`,r=>r.fulfill({json:{success:true,reports:[report],pagination:{page:1,limit:15,total:1,totalPages:1}}}));
 await page.goto("/reports");
 await expect(page.getByText("مفتوح",{exact:true})).toBeVisible();
 await page.getByText("QA review",{exact:true}).click();
 await expect(page).toHaveURL(/\/reports\/9$/);
});

test("report detail normalizes the backend report shape",async({page})=>{
 const report={id:1,targetType:"STORE",targetId:1,reason:"FAKE_OR_SCAM",details:"very bad store",status:"PENDING",adminNote:null,createdAt:"2026-09-26T10:15:01.977Z",reporter:{id:8,name:"QA reporter",email:"reporter@example.test",phone:null},store:{id:1,name:"QA Store",logoUrl:null,status:"APPROVED",isActive:true}};
 await page.route(`${api}/admin/reports/1`,r=>r.fulfill({json:{success:true,report}}));
 await page.goto("/reports/1");
 await expect(page.getByText("متجر وهمي أو احتيالي",{exact:true}).first()).toBeVisible();
 await expect(page.getByText("very bad store",{exact:true})).toBeVisible();
 await expect(page.getByText("QA reporter",{exact:true})).toBeVisible();
 await expect(page.getByText("QA Store",{exact:true}).first()).toBeVisible();
 await expect(page.getByRole("button",{name:"تعليم كمعالج",exact:true})).toBeVisible();
});

for(const failed of [false,true]) test(`report resolution success=${!failed} with proposed contract`,async({page})=>{
 const report={id:8,targetType:"STORE",targetId:1,targetPreview:"QA Store",reason:"QA report reason",reporter:{id:2,name:"QA reporter"},status:"OPEN",createdAt:"2026-09-01T00:00:00Z",note:null,content:{review:null,product:null,store:null},relatedCount:0,resolvedAt:null};
 let body:unknown;
 await page.route(`${api}/admin/reports/8`,r=>{
   if(r.request().method()==="PATCH"){body=r.request().postDataJSON();return r.fulfill(failed?{status:500,json:{success:false,message:"QA report failed"}}:{json:{success:true,report:{...report,status:"RESOLVED"}}});}
   return r.fulfill({json:{success:true,report}});
 });
 await page.goto("/reports/8");await page.getByRole("button",{name:"تعليم كمعالج",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"تعليم كمعالج",exact:true}).click();
 if(failed){await expect(page.getByRole("main").getByText("QA report failed",{exact:true})).toBeVisible();await expect(page.getByLabel("إشعارات العمليات").getByRole("alert")).toContainText("QA report failed");}
 else await expect(page.getByLabel("إشعارات العمليات").getByRole("status")).toContainText("تم تعليم البلاغ كمعالج");expect(body).toEqual({status:"RESOLVED"});
});


test("top rated stores renders backend Decimal ratings and store links", async ({page}) => {
  await page.route(api + "/admin/stores/top-rated?*", route => route.fulfill({json:{
    success:true,
    stores:[
      {id:18,name:"QA Rated Store",logoUrl:null,district:"الرمال",ratingAvg:"4.80",ratingCount:12},
      {id:19,name:"QA Unrated Store",logoUrl:null,district:null,ratingAvg:null,ratingCount:0},
    ],
    pagination:{page:1,limit:10,total:1,totalPages:1},
  }}));
  await page.goto("/reviews");
  const row = page.getByRole("link", {name:/QA Rated Store/});
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("href", "/stores/18");
  await expect(row).toContainText("4.8");
  await expect(row).toContainText("12 تقييم منتج");
  await expect(row).toContainText("الرمال");
  await expect(page.getByText("QA Unrated Store", {exact:true})).toHaveCount(0);
  await expect(page.getByText("لا توجد تقييمات للمتاجر حالياً", {exact:true})).toHaveCount(0);
});
