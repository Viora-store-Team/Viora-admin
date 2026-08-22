# لوحة مالك المنصة — احتياجات الباك إند والمشاكل المفتوحة

هذا الملف مخرَج المرحلة الأولى من قسم الأدمن: الواجهات كلها مبنية وشغّالة على
بيانات تجريبية، وهاي قائمة الـAPIs المطلوبة + المشاكل اللي لازم تنحسم.

---

## ١ · كيف ينتقل القسم من البيانات التجريبية للـAPI الحقيقي

نقطة التبديل **ملف واحد**: [`src/lib/admin/client.ts`](src/lib/admin/client.ts)

```
USE_MOCK = process.env.NEXT_PUBLIC_ADMIN_MOCK !== "false"
adminFetch(endpoint, options) → USE_MOCK ? mockFetch(...) : apiFetch(...)
```

**خطوات الربط:**

1. حطّ `NEXT_PUBLIC_ADMIN_MOCK=false` بملف `.env.local`.
2. جرّب الصفحات — كل وحدة بتعرض الخطأ الراجع من السيرفر بشكل سليم.
3. لما تخلص كل المسارات: احذف مجلد `src/lib/admin/mock/` وخلّي جسم `adminFetch`
   يستدعي `apiFetch` مباشرة.

**ولا صفحة بتتغيّر.** الصفحات بتستورد من `src/lib/admin/api.ts` بس، وما بتعرف
مين اللي ردّ عليها. تم اختبار هذا فعلياً: مع `NEXT_PUBLIC_ADMIN_MOCK=false`
الواجهة أرسلت `GET /api/admin/stores?page=1&limit=15` للسيرفر الحقيقي وعرضت
رسالة "المسار غير موجود" الراجعة منه بشريط خطأ مع زر إعادة محاولة — بلا شاشة
بيضاء ولا استثناء.

**متغيّرات البيئة الجديدة:**

| المتغيّر | القيمة | الغرض |
|---|---|---|
| `NEXT_PUBLIC_ADMIN_MOCK` | `false` لتعطيل الـmock | التبديل للـAPI الحقيقي |
| `NEXT_PUBLIC_ADMIN_MOCK_FAIL` | `network` \| `server` \| `empty` | محاكاة الأعطال لاختبار حالات الخطأ والفراغ |

---

## ٢ · العقد المشترك لكل المسارات

كل مسارات `/admin/*` لازم تلتزم بنفس مغلّف الرد المستخدم حالياً بالمشروع:

**نجاح** — الكيان بالمستوى الأعلى، **مش** جوّا `data`:
```jsonc
{ "success": true, "stores": [...], "pagination": { "page": 1, "limit": 15, "total": 23, "totalPages": 2 } }
```

**فشل**:
```jsonc
{ "success": false, "message": "رسالة عربية جاهزة للعرض", "errors": { "reason": "السبب لازم يكون 10 أحرف على الأقل" } }
```

- شكل الترقيم ثابت: `{ page, limit, total, totalPages }`.
- أخطاء 400 خريطة مسطّحة `{ field: message }`.
- الرسائل بالعربي وبتنعرض للمستخدم مباشرة (نفس السياسة الحالية).
- المبالغ **نص Decimal** (`"5775.00"`) مش رقم — زي `price` بالمنتجات.
- التواريخ `YYYY-MM-DD`، والطوابع الزمنية ISO كاملة (`occurredAt`, `lastCheckAt`).

---

## ٣ · قائمة الـAPIs المطلوبة

### Dashboard

| المسار | الغرض |
|---|---|
| `GET /admin/overview?range=7d\|30d\|90d` | كل إحصائيات اللوحة بطلب واحد |

**الرد المتوقع** (`overview`):
```
activeStores, totalStores, pendingStores   عدّادات المتاجر
customers, merchants                        عدّادات المستخدمين حسب الدور
orders: { total, today }                    الطلبات
gmv                                         القيمة الإجمالية (نص Decimal)
openReports                                 عدد البلاغات المفتوحة
registrationGrowth: [{ date, customers, merchants }]   سلسلة زمنية بطول المدى
ordersTrend:        [{ date, count, value }]           سلسلة زمنية
topStores:          [{ id, name, orders, revenue }]    أعلى 5 متاجر
```
**الصفحة**: `/admin` — [`src/app/admin/page.tsx`](src/app/admin/page.tsx)

> `range` بيحدّد عدد النقاط بالسلسلتين (7 · 30 · 90 نقطة يومية).

---

### Stores

| المسار | الغرض | ملاحظات |
|---|---|---|
| `GET /admin/stores` | قائمة المتاجر | `?page&limit&q&status` — `q` بيبحث بالاسم والمدينة واسم المالك · `status` = `ACTIVE\|SUSPENDED\|PENDING` |
| `GET /admin/stores/:id` | تفاصيل متجر | |
| `POST /admin/stores/:id/verify` | توثيق المتجر | |
| `DELETE /admin/stores/:id/verify` | إلغاء التوثيق | |
| `POST /admin/stores/:id/suspend` | إيقاف المتجر | body `{ reason }` **إلزامي** (10–500 حرف) |
| `POST /admin/stores/:id/reactivate` | إعادة التفعيل | |

**الشكل الخفيف للقائمة** (`stores[]`): `id, name, logoUrl, city, ownerId, ownerName, status, isVerified, productsCount, ordersCount, createdAt`

**شكل التفاصيل** (`store`) = الشكل الخفيف + :
```
description, address, phone, coverUrl
categories: [{ id, name }]
owner: { id, name, email, phone, status }
stats:  { products, orders, revenue, rating, reviews }   rating = null لما ما في تقييمات
verifiedAt:  string | null
suspension:  { reason, at, by } | null                   by = اسم المشرف المنفّذ
```

> ⚠️ **كل عمليات التعديل لازم ترجّع كائن المتجر المحدّث كامل** — الواجهة بتعيد بذر
> حالتها من الرد بدل إعادة جلب، فرد ناقص بيخلّي الشاشة تعرض بيانات قديمة.

**الصفحات**: `/admin/stores` · `/admin/stores/[id]`

---

### Users

| المسار | الغرض | ملاحظات |
|---|---|---|
| `GET /admin/users` | قائمة المستخدمين | `?page&limit&q&role&status` — `q` بيبحث بالاسم والبريد والهاتف · `role` = `MERCHANT\|CUSTOMER` |
| `GET /admin/users/:id` | تفاصيل مستخدم | |
| `POST /admin/users/:id/suspend` | إيقاف الحساب | body `{ reason }` **إلزامي** |
| `POST /admin/users/:id/reactivate` | إعادة التفعيل | |

**الشكل الخفيف** (`users[]`): `id, name, email, phone, role, status, emailVerified, storeId, storeName, ordersCount, createdAt`

**التفاصيل** (`user`) = الخفيف + `updatedAt, lastLoginAt, suspension, storeStatus`

> ⚠️ العقد الحالي بيسمح بنفس البريد **مرّتين** (سجل `CUSTOMER` وسجل `MERCHANT`
> منفصلين بـ id وكلمة مرور). فالبحث بالإيميل بيرجّع صفّين — **سلوك صحيح**،
> والواجهة بتعرض شارة الدور بوضوح وبتشرحه للمشرف بنص ثابت.

**الصفحات**: `/admin/users` · `/admin/users/[id]`

---

### Categories

| المسار | الغرض |
|---|---|
| `GET /admin/categories` | شجرة التصنيفات + `productsCount` لكل عقدة |
| `POST /admin/categories` | إنشاء — body `{ name, imageUrl?, parentId?, sizeGroup? }` |
| `PATCH /admin/categories/:id` | تعديل الاسم والصورة فقط |

**الشكل** = نفس `GET /categories` العام بالضبط + `productsCount`:
```
[{ id, name, slug, imageUrl, sizeGroup: null, productsCount,
   children: [{ id, name, slug, imageUrl, sizeGroup, productsCount }] }]
```

> ⚠️ **نقطة التوافق الحرجة**: `sizeGroup` على التصنيف الفرعي بيقود منظومة
> المقاسات كلها — `CategoryPicker` بيستنتجه، و`GET /sizes?sizeGroup=` بيعتمد
> عليه، و`VariantsEditor` بينبني عليه. أي تصنيف فرعي بلا `sizeGroup` صحيح
> بيكسر إنشاء المنتجات فوراً. الواجهة بتفرضه كحقل إلزامي من قائمة مغلقة
> (`CLOTHING` · `SHOES` · `KIDS` · `ONE_SIZE`) و**ما بتسمح بتعديله بعد الإنشاء**.

> كل عمليات التصنيفات بترجّع **الشجرة الكاملة** بعد التعديل — أبسط من إعادة
> الجلب وبيضمن اتفاق الواجهة والسيرفر على الشكل النهائي.

**الصفحة**: `/admin/categories`

---

### Reports & Reviews

| المسار | الغرض | ملاحظات |
|---|---|---|
| `GET /admin/reports` | قائمة البلاغات | `?page&limit&q&targetType&status` |
| `GET /admin/reports/:id` | تفاصيل + لقطة المحتوى المبلّغ عنه | |
| `PATCH /admin/reports/:id` | معالجة/رفض — body `{ status, note? }` | |
| `POST /admin/reviews/:id/hide` | إخفاء تقييم — body `{ reason }` **إلزامي** | |
| `POST /admin/reviews/:id/unhide` | إلغاء الإخفاء | |

**البلاغ** (`reports[]`): `id, targetType (REVIEW\|PRODUCT\|STORE), targetId, targetPreview, reason, reporter: {id,name}, status (OPEN\|RESOLVED\|DISMISSED), createdAt`

**التفاصيل** (`report`) = ما سبق + `note, relatedCount, resolvedAt` + :
```
content: {
  review:  Review | null,
  product: { id, name, price, image, storeId, storeName, isActive } | null,
  store:   { id, name, logoUrl, city, status } | null
}
```

**التقييم** (`Review`):
```
id, targetType: "PRODUCT" | "STORE",   تقييم منتج أو تقييم عام للمتجر
targetId, targetName, rating (1..5), comment,
author: { id, name }, storeId, storeName,
isHidden, hiddenReason, hiddenAt, createdAt
```

> ⚠️ **`isHidden` بتحجب التقييم عن الزبون فقط — التاجر بيضل يشوفه.**
> هاي سياسة منتج مقرّرة، والواجهة بتعكسها حرفياً: شارة **«مخفي عن الزبائن ·
> ظاهر للتاجر»** بنبرة تحذير (مش خطر)، مع سبب الإخفاء وتاريخه. ما في مكان
> بالواجهة بيقول "محذوف".

**الصفحات**: `/admin/reports` · `/admin/reports/[id]`

---

### Content

| المسار | الغرض |
|---|---|
| `GET /admin/content/home` · `PUT /admin/content/home` | محتوى الصفحة الرئيسية |
| `GET /admin/content/pages` | كل الصفحات الثابتة |
| `GET/PUT /admin/content/pages/:key` | صفحة واحدة — `key` = `terms\|privacy\|about` |
| `GET /admin/banners` · `POST /admin/banners` | الإعلانات |
| `PATCH /admin/banners/:id` · `DELETE /admin/banners/:id` | تعديل/حذف إعلان |

```
HomeContent: { heroTitle, heroSubtitle, heroImageUrl, featuredStoreIds[], featuredCategoryIds[] }
StaticPage:  { key, title, body, updatedAt }        body نص عادي مش HTML
Banner:      { id, title, imageUrl, linkUrl, position, isActive, startsAt, endsAt }
```

> رفع صور الإعلانات بيستخدم **`POST /uploads` القائم** — ما في مسار رفع جديد.
> `PATCH /admin/banners/:id` بيستقبل `{ isActive }` لحاله للتفعيل السريع من
> البطاقة، فلازم يقبل تعديل جزئي بلا ما يطلب باقي الحقول.

**الصفحة**: `/admin/content` (ثلاث تبويبات)

---

### Delivery

| المسار | الغرض |
|---|---|
| `GET /admin/delivery/health` | حالة التكامل |
| `GET /admin/delivery/failures?page&limit` | سجل آخر حالات الفشل |

```
health:    { provider, status: "UP"|"DEGRADED"|"DOWN", lastCheckAt, successRate24h, avgResponseMs, failures24h }
failures[]:{ id, occurredAt, orderId, endpoint, httpStatus, message, retryable }
```

**الصفحة**: `/admin/delivery` — للقراءة فقط.

---

### Auth (مؤجَّل بقرارك — مطلوب لتفعيل القسم)

- توسيع `Role` ليشمل `ADMIN` بالعقد.
- `POST /auth/login` يقبل `role: "ADMIN"`.
- `GET /auth/me` يرجّع `role: "ADMIN"`.
- **تفويض من طرف الخادم على كل مسار `/admin/*`** — انظر المشكلة رقم ١.

---

## ٤ · المشاكل اللي لازم تنحسم

### ١ · الحماية غير موجودة فعلياً — أخطر نقطة

`/admin` **مفتوح حالياً** (مُضاف لـ`PUBLIC_PREFIXES` بتعليق `⚠️ مؤقت` في
[`AuthContext.tsx`](src/context/AuthContext.tsx)) عشان تقدر تتصفّح الواجهات
أثناء التطوير. وحتى لو انشال:

- التوكن بالـ`localStorage` وما في `proxy.ts` (بديل `middleware` بهاي النسخة
  من Next)، فـ**ما في أي طريقة لفرض حماية من طرف العميل**.
- `AuthContext` بيطرد أي `role !== "MERCHANT"`، وما في دور `ADMIN` بالعقد أصلاً.

**المطلوب**: السيرفر يفوّض كل مسار `/admin/*` بشكل مستقل. أي حماية بالواجهة
تجربة استخدام لا أمان.

### ٢ · منظومة التقييمات — القواعد محسومة، العقد التقني لا

اعتمدنا قواعدك (تقييم منتج + تقييم متجر، الإخفاء عن الزبون فقط). الباقي:
- الإخفاء علم `isHidden` ولا حذف ناعم؟
- هل يُعاد حساب متوسط تقييم المتجر بعد الإخفاء؟
- هل يُخطَر التاجر؟ وهل يقدر يردّ على تقييم؟

### ٣ · قواعد التصنيفات

- حذف تصنيف تحته منتجات — شو بيصير فيها؟ (**ما بنينا زر حذف** لهذا السبب)
- تغيير `sizeGroup` بعد وجود منتجات — بيبطّل كل `variantSizeId` القائمة.
  (**ما بنينا تعديل `sizeGroup`**)
- هل قائمة `sizeGroup` الرباعية مغلقة بقاعدة البيانات؟

### ٤ · علاقة إيقاف المتجر بإيقاف حساب المالك

**الافتراض الحالي: حالتان مستقلتان** — تُعرضان منفصلتين مع رابط تنقّل بين
صفحتَي المتجر والمالك. إذا قرّر الباك إند ترابطهما، التعديل عرض إضافي لا
إعادة بناء.

### ٥ · توثيق المتجر

**الافتراض: علم `isVerified` + طابع زمني + منفّذ العملية.** إذا كان مسار
مراجعة مستندات فهو صفحة إضافية غير مشمولة.

### ٦ · تكامل التوصيل

ما في أي ذكر لشركة توصيل بالمستودع كله. اسم المزوّد وشكل سجل الفشل **تخمين**.
مطلوب تحديد: مين الشركة؟ شو تعريف "الصحة"؟ هل للأدمن صلاحية إعادة إرسال طلب
فاشل؟ (بنينا الشاشة **للقراءة فقط** لهذا السبب)

### ٧ · إدارة المحتوى بلا مستهلك مرئي

ما في واجهة متجر بهذا المستودع، فالمحتوى بينتحرّر هون وبينستهلك برّا.
مطلوب تحديد: الصفحات الثابتة قائمة مغلقة ولا CRUD حر؟ وشو حقول البانر
المطلوبة فعلاً؟ كمان: اختيار المتاجر/التصنيفات المميّزة حالياً **إدخال يدوي
لأرقام معرّفات** لأنه ما في مسار اختيار — بيحتاج endpoint بحث/اختيار.

### ٨ · بيانات الطلبات على مستوى المنصة بلا مصدر

طلبات التاجر نفسها Mock بالكامل ([`src/data/dummyOrders.ts`](src/data/dummyOrders.ts))،
فـ"حجم الطلبات" و"القيمة الإجمالية" باللوحة ما إلهم مصدر حقيقي بالخلفية بعد.

### ٩ · Audit / Security — الإجابة على سؤالك

> **يحتاج دعم باك إند، وما بنيناه بالواجهة عمداً.**

سجل التدقيق لازم يُكتب من الخادم لحظة تنفيذ العملية (المنفّذ · النوع · الهدف ·
السبب · الوقت · IP). أي سجل تبنيه الواجهة بيكون قابل للتزوير وناقص — العمليات
اللي بتصير برّا اللوحة (سكربتات · دعم فني · وظائف مجدولة) ما رح تظهر فيه
إطلاقاً، وهذا بيخليه **أسوأ من غياب السجل** لأنه بيعطي ثقة زائفة.

**اللي عملناه بدل هيك**: كل عملية حسّاسة بتبعت `reason` صراحةً بجسم الطلب
(`suspend` للمتجر والمستخدم، `hide` للتقييم). الواجهة **بتغذّي** السجل ما
بتملكه، ومكوّن `ReasonDialog` بيفرض ذلك بنيوياً — زر التأكيد معطّل لحد ما
ينكتب سبب صالح، فما في مسار يوصل للسيرفر بلا سبب.

**القرار المطلوب**: هل نضيف لاحقاً
`GET /admin/audit-logs?page&limit&actorId&action&targetType` بشكل سجل ثابت؟
عند اعتماده تنضاف صفحة `/admin/audit` — صفحة قائمة عادية بتندرج تماماً تحت
`useAdminList` بلا أي تغيير معماري.

### ١٠ · ملاحظة تقنية صغيرة

مكوّن `Input` المشترك ما بينشر `...rest` على الـ`textarea` بفرع `multiline`،
يعني `onBlur` و`autoFocus` بينضاعوا بصمت مع الحقول متعددة الأسطر.
تحايلنا عليها داخل `ReasonDialog` بدل ما نعدّل مكوّن مشترك مع نماذج التاجر —
لكنها تستاهل إصلاح لاحقاً.
