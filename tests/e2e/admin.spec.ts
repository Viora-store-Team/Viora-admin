import { test, expect, type Page } from "@playwright/test";

const api = "https://viora-backend-tuqg.onrender.com/api";
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
  await expect(page.getByText("QA save failed",{exact:true})).toBeVisible();
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
  await expect(page.getByText("QA read failed",{exact:true})).toBeVisible();await expect(page.getByText("1 غير مقروء",{exact:true})).toBeVisible();
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

test("missing delivery service does not show mocked health",async({page})=>{
  await page.goto("/delivery");await expect(page.getByText("هذه الميزة غير متاحة من الخادم حالياً. أعد المحاولة لاحقاً.")).toBeVisible();
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
