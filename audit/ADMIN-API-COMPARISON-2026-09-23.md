# مقارنة مجموعة Postman مع Viora Admin

المصدر: Viora API — Admin.postman_collection (1).json المرفق من المستخدم. فُحصت تعريفات 47 طلباً وأوصافها ومعاملاتها. لم تُشغّل سكربتات المجموعة أو طلبات الكتابة، ولم تُنسخ كلمات المرور أو التوكنات إلى المشروع.

## ما استفدنا منه الآن

- GET /admin/orders يدعم status وstoreId بالإضافة إلى page وlimit: أضيفت الفلاتر للواجهة والطلب، مع إعادة الترقيم للصفحة الأولى ومسح الفلاتر. البحث النصي والتاريخ ليسا موثقين لهذا المسار؛ لم نرسل معاملات تخمينية.
- التقييم المخفي مستبعد من متوسط المنتج والمتجر حسب Hide Rating: صُححت المتوسطات ونسبة التقييمات الإيجابية لتستعمل التقييمات الظاهرة فقط. تبقى المخفية في قائمة المراجعة وعدّاد المخفي والإجمالي الإداري.
- statusCounts للطلبات مستقل عن فلتر الحالة ومتأثر بفلتر المتجر، ويجب عدم حسابه من صفحة واحدة. هذا متوافق مع إصلاح قائمة طلبات المتجر السابق.

## مسارات موثقة إضافية غير مربوطة بعد

| المسار | الفائدة | ما يلزم لإتمام الربط |
|---|---|---|
| GET /admin/settlements | دفتر مالي للطلبات المغلقة، مع فلاتر from/to/storeId/outcome | مثال رد ناجح يحدد غلاف القائمة، أنواع الحقول والترقيم |
| GET /admin/settlements/summary | المجاميع المالية وbyStore لأعلى 20 متجر | مثال رد ناجح يحدد مكان المجاميع وشكل صفوف byStore |
| PATCH /admin/stores/:id/commission | نسبة خاصة بالمتجر؛ 0 اتفاق بلا عمولة، null يعيد افتراضي المنصة | شكل رد التعديل وحقول القراءة الحالية في تفاصيل المتجر قبل بناء محرر مالي |

العمولة 0–100 بدقة منزلتين، على المنتجات فقط، والتغيير لا يعدّل صفوف التسويات القديمة. دفتر التسويات لا يساوي مراقبة صحة خدمة التوصيل، وbyStore ليس قائمة كاملة بكل المتاجر.

المجموعة لا تحتوي أي saved responses لكل الطلبات الـ47. تعريف المسار لا يثبت أنه منشور ويعمل الآن. يوجد تناقض توثيقي: وصف الطلبات يقول إنه لا توجد عمولات أو تسويات، بينما آخر ثلاثة طلبات توثقها صراحةً. ينبغي اعتماد ردود النسخة المنشورة قبل عرض أرقام مالية أو الادعاء بتحصيل رسوم التوصيل.

## المتبقي لا تحسمه المجموعة

- تفاصيل المتاجر GET /admin/stores/:id موثقة بالفعل وبنفس المسار المستعمل. هذا لا يصلح خطأ 500 السابق ولا يثبت زواله.
- المناسبات والمجموعات والبلاغات ومراقبة التوصيل ليست في هذه المجموعة. عدم ذكرها لا يثبت غيابها من كل الباك إند، لكنه لا يوفر بديلاً للمسارات التي أعادت 404 في التدقيق السابق.
- لا يوجد مسار تجميع للتقييمات هنا؛ يبقى حساب جميع الصفحات الحالي بحده الصريح مناسباً للحجم الصغير.
- حالات الحساب والمتجر مستقلة: approve/reject للمراجعة، suspend/activate للمتجر، suspend/activate للمستخدم. مسار تفعيل المستخدم يعيد 409 إن كان فعالاً أصلاً؛ ينبغي إبقاء إدارة الحساب قراراً واضحاً وتجنب إعادة تنفيذها دون داعٍ.
- لا توجد عقود MFA أو إبطال الجلسات أو سجل التدقيق أو تعارض نسخ المحتوى في المجموعة.

## جرد المسارات

| الطريقة | المسار | اسم الطلب |
|---|---|---|
| GET | /health | Health Check |
| GET | /health/db | Database Health |
| POST | /admin/login | Admin Login |
| GET | /admin/me | My Profile 🔒 |
| GET | /admin/stats?period=30&limit=5 | Dashboard Stats 🔒 |
| GET | /admin/stores?status=PENDING&page=1&limit=20 | Stores — Pending 🔒 |
| GET | /admin/stores/{{reviewStoreId}} | Store Detail 🔒 |
| GET | /admin/orders?page=1&limit=20 | All Orders 🔒 Admin |
| GET | /admin/stores/{{reviewStoreId}}/orders?page=1&limit=20 | Store Orders 🔒 Admin |
| GET | /admin/orders/{{adminOrderId}} | Order Detail 🔒 Admin |
| PATCH | /admin/stores/{{reviewStoreId}}/approve | Approve Store 🔒 |
| PATCH | /admin/stores/{{reviewStoreId}}/reject | Reject Store 🔒 |
| PATCH | /admin/stores/{{reviewStoreId}}/suspend | Suspend Store 🔒 |
| PATCH | /admin/stores/{{reviewStoreId}}/activate | Activate Store 🔒 |
| PATCH | /admin/stores/{{reviewStoreId}}/feature | Feature Store 🔒 |
| PATCH | /admin/stores/{{reviewStoreId}}/unfeature | Unfeature Store 🔒 |
| DELETE | /admin/stores/{{deleteStoreId}} | Delete Store 🔒 ⚠️ |
| GET | /admin/users?page=1&limit=20 | Users — All 🔒 |
| GET | /admin/users/{{manageUserId}} | User Detail 🔒 |
| PATCH | /admin/users/{{manageUserId}}/suspend | Suspend User 🔒 |
| PATCH | /admin/users/{{manageUserId}}/activate | Activate User 🔒 |
| DELETE | /admin/users/{{deleteUserId}} | Delete User 🔒 ⚠️ |
| GET | /admin/content | Content — List 🔒 |
| GET | /admin/content/terms | Content — Get 🔒 |
| PUT | /admin/content/terms | Content — Save 🔒 |
| PUT | /admin/content/faq | Content — Save FAQ 🔒 |
| GET | /admin/banners | Banners — List 🔒 |
| PUT | /admin/banners/1 | Banners — Save Slot 1 🔒 |
| GET | /admin/ratings?page=1&limit=20 | Ratings — All 🔒 |
| PATCH | /admin/ratings/{{ratingId}}/hide | Hide Rating 🔒 |
| PATCH | /admin/ratings/{{ratingId}}/unhide | Unhide Rating 🔒 |
| GET | /admin/categories | Categories — Tree 🔒 |
| GET | /admin/categories/{{manageCategoryId}} | Category Detail 🔒 |
| POST | /uploads | Upload Category Image 🔒 |
| POST | /admin/categories | Create Root Category 🔒 |
| POST | /admin/categories | Create Sub Category 🔒 |
| PATCH | /admin/categories/{{manageCategoryId}} | Update Category 🔒 |
| PATCH | /admin/categories/{{manageCategoryId}}/deactivate | Hide Category 🔒 |
| PATCH | /admin/categories/{{manageCategoryId}}/activate | Show Category 🔒 |
| PATCH | /admin/categories/reorder | Reorder Categories 🔒 |
| DELETE | /admin/categories/{{manageCategoryId}} | Delete Category 🔒 |
| GET | /admin/support/tickets?page=1&limit=20 | Support Tickets — All 🔒 |
| GET | /admin/support/tickets/{{supportTicketId}} | Support Ticket Detail 🔒 |
| PATCH | /admin/support/tickets/{{supportTicketId}}/resolve | Resolve Support Ticket 🔒 |
| GET | /admin/settlements?page=1&limit=20 | Settlements 🔒 Admin |
| GET | /admin/settlements/summary | Settlement Summary 🔒 Admin |
| PATCH | /admin/stores/{{storeId}}/commission | Set Store Commission 🔒 Admin |

## التحقق من التعديلات

نجح بناء Next.js مع TypeScript ونجح lint بلا تحذيرات. اختبارات الربط تحاكي الشبكة ولا تمثل تحققاً حياً من السيرفر.
نجحت الاختبارات الآلية الـ27، بما فيها فلترة الطلبات واستبعاد المخفي من المتوسطات.

تحديث بطلب المستخدم: أُزيلت ميزتا المناسبات والمجموعات من الواجهة والكود والربط والبيانات التجريبية؛ لم تعودا ضمن المتطلبات المتبقية.

تحديث 2026-09-24: شوهدت صفحة تفاصيل المتجر 623 في جلسة المستخدم تعرض بيانات المتجر والمالك وحالة مقبول/نشط. لم يعد هذا المسار مطلوباً كـendpoint ناقص؛ نتيجة 500 السابقة تاريخية ولا تعمم على الحالة الحالية. تعذرت إعادة تحميل الصفحة آلياً بسبب واجهة إضافة متصفح مفتوحة، ولم يُتحقق من كود HTTP أو جميع المتاجر.

إصلاح القبول والرفض: أزيلت طلبات تفعيل/إيقاف المالك التابعة لقرار مراجعة المتجر. تُستخدم حالة السيرفر كما هي، مع تحديث رسائل التأكيد. نجح البناء وlint وثلاثة اختبارات قبول/رفض بمحاكاة الشبكة قبل تعديل نص الرفض الأخير.
