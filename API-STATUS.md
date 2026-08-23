# حالة ربط لوحة الأدمن بالـ API — فحص حيّ 2026-08-23

كل سطر تحت **مفحوص فعلياً** على `https://viora-backend-tuqg.onrender.com/api`
بتوكن أدمن حقيقي — مش مأخوذ من توثيق.

## الدخول

```
POST /api/admin/login   { "email": "owner@viora.com", "password": "admin@admin" }
→ 200 { success, message, user: { id: 398, role: "ADMIN", … }, token }
```

التوكن `Bearer` بيفتح كل شي تحت `/api/admin`، وكمان بيشتغل على `GET /api/auth/me`.
اللوحة بتستعمل `/admin/me` مش `/auth/me` — الاتنين بيرجّعوا نفس الشكل بتوكن
أدمن، بس `/auth/me` بيقبل توكن تاجر أو زبون كمان.

ما في `POST /admin/logout` (404) — الخروج محلي بمسح التوكن.

## المسارات الموجودة فعلاً (12)

| المسار | الحالة |
|---|---|
| `POST /admin/login` | ✅ مربوط · شاشة `/login` |
| `GET /admin/me` | ✅ مربوط · `AuthContext` |
| `GET /auth/me` | ✅ شغّال بتوكن الأدمن — مش مستعمل |
| `GET /admin/stats?period=7\|30\|90` | ✅ مربوط · صفحة `/` |
| `GET /admin/stores?page&limit&q&status` | ✅ مربوط · صفحة `/stores` |
| `GET /admin/stores/:id` | ✅ مربوط · `/stores/[id]` · 404 «المتجر غير موجود» |
| `PATCH /admin/stores/:id/approve` | ✅ مربوط ومفحوص end-to-end |
| `PATCH /admin/stores/:id/reject` | ✅ مربوط ومفحوص end-to-end |
| `GET /admin/users?page&limit&q&role&isActive` | ✅ مربوط · صفحة `/users` |
| `GET /admin/users/:id` | ✅ مربوط · 404 «المستخدم غير موجود» |
| `PATCH /admin/users/:id/suspend` | ✅ مربوط ومفحوص end-to-end |
| `PATCH /admin/users/:id/activate` | ✅ مربوط ومفحوص end-to-end |

### ملاحظات دقيقة (كلها انفحصت)

- `?days=` و`?range=` بتنتجاهل بصمت بـ `/admin/stats` — الاسم الصح **`period`**
  بالأيام كرقم (7 · 30 · 90 · 365 · 1 كلها اشتغلت).
- القبول والرفض ميثودهم **PATCH** مش POST — POST بيرجّع 404 من الراوتر.
- **القرار قابل للتبديل بالاتجاهين** — انفحص فعلياً على متجر 180:
  `REJECTED → APPROVED` مشي، والقبول **بيمسح `rejectionReason` لـ`null`**
  وبيحدّث `reviewedAt` وبيختم `reviewedBy`.
- `reviewedBy` شكله `{ id, name, email }` — انتأكد بعد أول قرار حقيقي.
- شروط `reason` بـ reject لسا **مجهولة** من طرف السيرفر: التحقق بيصير بعد
  ما يلاقي المتجر فما بينقاس على معرّف وهمي، ورفض ناجح مرّ بسبب من ١٠
  أحرف. الواجهة بتفرض 10–500 حرف، وأي 400 بمفتاح `reason` بينعرض بالحوار.
- **فلتر المستخدمين اسمه `isActive`** بقيمة `"true"`/`"false"` — **مش
  `status`**. `?status=` بينتجاهل بصمت: `status=ACTIVE` و`status=SUSPENDED`
  رجّعوا نفس الإجمالي (55) بينما `isActive=false` رجّع 0.
- `role` بيقبل `MERCHANT` · `CUSTOMER` بس — `ADMIN` بيرجّع 400.
- الإيقاف اسمه `suspend` والتفعيل `activate` (**مش `reactivate`**)، والتنين
  بـ PATCH **وبلا جسم إطلاقاً** — انفحص فعلياً على المستخدم 427: الطلب
  انبعت بلا body ونجح. ما في حقل سبب بأي مكان برد المستخدم، فالإيقاف
  باللوحة صار تأكيد بسيط بلا `ReasonDialog`.
- **إيقاف الحساب ما بيلمس قرار مراجعة المتجر** — انفحص: بعد إيقاف مالك
  متجر 180 ضل المتجر `APPROVED`. المفهومين مستقلين تماماً.
- تفاصيل المستخدم بتبدّل مفتاح المبلغ حسب الدور: التاجر بياخد `revenue`
  والزبون `totalSpent`.
- التواريخ بترجع **طوابع ISO كاملة** (`2026-08-23T07:03:03.280Z`) مش أيام
  مجرّدة — `formatDate` بـ `lib/format.ts` اتعدّلت تاخد الشكلين.

## المسارات اللي الواجهة بتناديها وما إلها وجود (404)

`/admin/overview` · `/admin/categories` · `/admin/reports` ·
`/admin/reviews/:id/hide` · `/admin/content/home` · `/admin/content/pages` ·
`/admin/banners` · `/admin/delivery/*`

الصفحات اللي بتناديها لسا شغّالة على `src/lib/admin/mock/` مع شريط تنبيه.

وكمان ما إلها وجود بديلات المتاجر اللي كانت الواجهة تفترضها:
`/admin/stores/:id/verify` · `/suspend` · `/reactivate` — كلها 404 بكل الميثودز.
الواجهة اتعدّلت لمفهوم القبول/الرفض تبع الباك إند بدل ما تطلب مسارات جديدة.

## الفروق اللي اتعدّلت من طرف الواجهة

| كانت الواجهة تفترض | الباك إند فعلاً |
|---|---|
| `status: ACTIVE \| SUSPENDED \| PENDING` | `status: PENDING \| APPROVED \| REJECTED` + `isActive` منفصل |
| `isVerified` + `verifiedAt` | ما إلهم وجود — بدالهم `reviewedAt` + `reviewedBy` |
| `ownerId` · `ownerName` مفلطحين | `owner: { id, name, email, phone, emailVerified, isActive, createdAt }` |
| `owner.status` | `owner.isActive` (بولياني) |
| `stats: { products, orders, revenue, rating, reviews }` | عدّادات مفلطحة — **ما في تقييمات بالعقد** |
| `suspension: { reason, at, by }` | `rejectionReason` + `reviewedAt` + `reviewedBy` |
| `overview` بمفتاح واحد | `stats` · `topStores` · `charts` · `period` بالمستوى الأعلى |
| `topStores[].id` مفلطح | `topStores[].store.id` متداخل |
| `ordersTrend[{ date, count, value }]` | `charts.orders[{ date, orders, revenue }]` |
| المستخدم `status: ACTIVE\|SUSPENDED` | `isActive` بولياني — بلا حالة نصية |
| `suspension: { reason, at, by }` للحساب | ما إله وجود — الإيقاف بلا سبب ولا منفّذ ولا تاريخ |
| `storeId` · `storeName` مفلطحين | `store: { id, name, status, isActive } \| null` |
| `lastLoginAt` | ما بيرجع — انشال من الشاشة |
| `?status=` للمستخدمين | `?isActive=true\|false` |
| `POST …/reactivate` | `PATCH …/activate` |

`reviewedBy` بيرجع `null` قبل أول مراجعة، وبعدها `{ id, name, email }`.

## مسارات عامة ممكن تنفع لاحقاً

`GET /categories` (8 تصنيفات) · `GET /sizes` (46) · `GET /stores` · `GET /products`

## بيانات تالفة بقاعدة البيانات

صفّين اسمهم انكسر ترميزه **قبل ما ينحفظ** — الحروف الأصلية انبدلت فعلياً،
فما إلهم استرجاع لا من الواجهة ولا من أي مكان تاني:

| المتجر | الحقول | الشكل |
|---|---|---|
| 28 | `name` · `city` | علامات استفهام ASCII — `"???? ????? 2275120742"` |
| 180 | `name` · `city` · `owner.name` | `U+FFFD` (المحرف البديل) |

> متجر 180 صفّ تجريبي انعمل أثناء الفحص (`probe1787485403@example.com`) —
> امسحه وقت ما تحب.

الواجهة بتكشفهم وبتعرض «متجر #28» بدل الرموز المكسّرة، مع تنبيه بصفحة
التفاصيل — شوف [`src/lib/brokenText.ts`](src/lib/brokenText.ts). **هاد عرض
مش إصلاح**؛ الإصلاح الحقيقي تصحيح الصف أو حذفه بقاعدة البيانات.
