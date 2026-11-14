# إعادة تصميم لوحة الإدارة بهوية فيورا — Design

التاريخ: 2026-11-14 · الحالة: بانتظار موافقة يوسف على الوثيقة

## 1. الهدف والسبب

لوحة الإدارة حالياً شكلها مش موحّد مع تطبيقات فيورا (الموبايل وتطبيق التاجر)،
والسايدبار البرغندي الحالي سيئ. المطلوب إعادة تصميم كاملة **للشكل فقط**:
تعامل مبسط وواضح، نفس هوية وألوان وخط التطبيقات، مسافات صحيحة، حركة سلسة،
وكل عنصر قابل للضغط بيبيّن إنه قابل للضغط.

المرجع: `Viora-Mobile/lib/app/theme/app_design_tokens.dart` و
`Viora-Merchant/lib/app/theme/app_design_tokens.dart` +
`Viora-Merchant/lib/shared/widgets/forms/viora_{form,select}_field.dart`.
الموك-أب المعتمد للسايدبار: الخيار A في
`.superpowers/brainstorm/1057-1794649245/content/sidebar.html` (مش ملتزم بالريبو).

## 2. الأهداف / خارج النطاق / الفشل

**أهداف**
- خط ثمانية (Thmanyah Sans 400/500/700) بكل اللوحة.
- اللون الأساسي `#511016` وألوان النص والحالات من توكنز الموبايل.
- خلفية الصفحة بيضا صافية `#FFFFFF`.
- سايدبار أبيض جديد، مقسّم لمجموعات، مع عدّادات.
- كل الأزرار والحقول والسيلكت والجداول والدايلوجات من مكوّنات مشتركة موحّدة.
- `cursor-pointer` على كل زر ورابط وصف جدول قابل للضغط، وكل عنصر تفاعلي.
- حركة CSS خفيفة 150–200ms، وبتنطفي مع `prefers-reduced-motion`.
- كل الصفحات: تسجيل الدخول، الرئيسية، المتاجر (+تفاصيل)، المستخدمين (+تفاصيل)،
  التصنيفات، التقييمات، البلاغات (+تفاصيل)، الطلبات، أكواد الخصم، الإشعارات،
  البنرات، المحتوى، المالية، الدعم (+تفاصيل)، صفحات الخطأ/التحميل/404.

**خارج النطاق**
- أي تغيير بالسلوك أو البيانات أو الـ API أو النصوص (إلا لو نص بيلزم للشكل).
- الدارك مود (التوكنز بتنكتب بطريقة بتسمح فيه لاحقاً بس ما بننفّذه).
- مكتبات UI جديدة (shadcn/Radix/framer-motion) — ممنوع إضافة dependencies.

**فشل حتى لو اشتغل تقنياً**
- أي صفحة بتنكسر وظيفياً أو اختبار e2e بيفشل بسبب تغيير سلوك.
- ألوان أو أحجام مكتوبة يدوياً (hex / `bg-rose-500` …) بدل التوكنز.
- عناصر قابلة للضغط بدون pointer أو بدون حالة hover/focus.
- حركة ثقيلة أو بطيئة (>250ms) أو بتعمل layout shift.

## 3. القيود

- Next.js 16 + React 19 + Tailwind v4 (CSS-first، `@theme` بـ `globals.css`، ما في
  `tailwind.config`). اقرأ `node_modules/next/dist/docs/` قبل استخدام أي API
  (حسب `AGENTS.md`).
- RTL (`dir="rtl"` على الجذر). استخدم خصائص منطقية (`ps/pe/ms/me/start/end`).
- أيقونات `lucide-react` الموجودة (نفس أسلوب أيقونات التطبيقات: stroke بنهايات
  دائرية)، `strokeWidth` = 1.75.
- `npm run lint` (max-warnings=0) و`npm run typecheck` و`npm run build` لازم ينجحوا.
- رخصة الخط: الرخصة بتقول مجاني داخل التطبيقات وممنوع إعادة توزيع الملفات.
  **قرار يوسف (2026-11-14): الملفات بتنضاف للريبو (`src/app/fonts/`) وبتنخدم
  على الويب، والرخصة مسؤوليته.** الملفات بتنحط كما هي بدون أي تعديل.

## 4. الأساليب اللي انفكّر فيها

1. **التوكنز أولاً ← المكوّنات الأساسية ← مسح الصفحات** *(المختار)*. أقل لمس
   للمنطق، الاختبارات بتضل، وبيتقسم طبيعياً لمهام مستقلة.
2. shadcn/ui (Radix): مكوّنات جاهزة بس dependencies جديدة وإعادة كتابة كل
   الاستخدامات — مخاطرة بدون فايدة واضحة للوحة بسيطة.
3. إعادة كتابة كل صفحة من الصفر: أسرع للشكل وأخطر على السلوك والاختبارات.

اختار يوسف ترك "الكيف" لنا؛ اخترنا (1).

## 5. نظام التصميم (مقرَّر)

### 5.1 الخط
- الملفات: `Viora-Mobile/assets/fonts/thmanyahsans-{Regular,Medium,Bold}.otf`
  ← تنسخ كما هي إلى `src/app/fonts/` وتنحمّل بـ `next/font/local`
  (variable `--font-thmanyah`، `display: swap`). Cairo بينشال.
- الأوزان: 400 عادي، 500 للـ labels والأزرار والروابط، 700 للعناوين. **ما في 600** —
  أي `font-semibold`/`font-extrabold`/`font-black` بيتحوّل لـ `font-medium` أو `font-bold`.
- السلّم (px): 28 H1 · 24 H2 · 20 عنوان صفحة · 18 · 16 · 14 (الأساسي للجداول والحقول)
  · 12 · 11. ارتفاع السطر ~1.5 للنص و1.2 للعناوين.

### 5.2 الألوان (توكنز `@theme` — أسماء جديدة بتحل محل القديمة)
| توكن | قيمة | مصدره |
|---|---|---|
| `primary` | `#511016` | burgundy500 |
| `primary-hover` | `#744045` | burgundy400 |
| `primary-soft` | `#F5EBEB` | backgroundBrandTint (الرابط النشط، hover الصفوف) |
| `primary-subtle` | `#DCCFD0` | burgundy100 |
| `heading` / نص أساسي | `#200609` | textPrimary |
| `text-secondary` | `#666666` | textSecondary |
| `text-tertiary` / placeholder | `#999999` | textTertiary |
| `icon` (أيقونات داكنة) | `#310A0D` | iconPrimary |
| `on-primary` | `#FFFFFF` | نص فوق البرغندي |
| `app-bg` | `#FFFFFF` | طلب يوسف: أبيض صافي |
| `surface` | `#FFFFFF` | |
| `surface-muted` | `#FAF7F5` | backgroundSurfaceWarm (رأس الجدول، hover خفيف) |
| `field-readonly` | `#F6F7F7` | backgroundFieldReadOnly |
| `chip` / `chip-text` | `#E8E4E2` / `#534743` | تبويبات وشيبس غير نشطة |
| `border` | `#E6E6E6` | borderDivider (حدود الحقول والكروت والجداول) |
| `border-strong` | `#CCCCCC` | borderDefault (hover الحقول) |
| `success` / `-soft` | `#0E9A34` / `#E3F4E8` | orderDeliveredGreen |
| `warning` / `-soft` | `#E07A5F` / `#FDF2E9` | orderBadgePending |
| `info` / `-soft` | `#2B6CB0` / `#EBF8FF` | orderBadgeShipping |
| `danger` / `-soft` | `#CC0000` / `#FFE5E5` | textError / red tint |
| `star` | `#F59E0B` | ratingStar |

- توكن `color-icon` القديم كان معناه "أبيض فوق البرغندي" — بيتسمّى `on-primary`
  وكل استخداماته بتتحدّث. `field-bg`/`field-label`/`placeholder` بيتشالوا أو بيتوجّهوا
  للتوكنز الجديدة.
- ممنوع أي hex أو لون Tailwind خام (`bg-rose-500`، `text-white`، `bg-black/5` …)
  خارج `globals.css`؛ ألوان الرسوم البيانية بتنحط كتوكنز `chart-1..4`.
- الظل: `shadow-card` = `0 1px 2px rgba(27,41,102,.06)`، `shadow-pop` =
  `0 8px 24px rgba(27,41,102,.10)` (للقوائم المنسدلة والدايلوجات).

### 5.3 المسافات والزوايا والأحجام
- شبكة 4px: 4/8/12/16/20/24/32/40/48. داخل الصفحة `p-6` (`p-4` موبايل)، بين
  الأقسام `gap-6`، بين عناصر الفلتر `gap-3`.
- زوايا: حقول وأزرار 12px (`rounded-xl`)، كروت وجداول ودايلوجات 16px
  (`rounded-2xl`)، بادجات وتبويبات `rounded-full`، روابط السايدبار 10px.
- ارتفاع الحقول والأزرار md: 48px؛ sm: 36px؛ أزرار الأيقونة 40×40.

### 5.4 الحركة
- `transition` 150ms للألوان/الخلفيات/الحدود، 200ms للظهور.
- دايلوج: fade للخلفية + `scale(.96)→1` و`opacity` للمحتوى، 200ms ease-out.
- قائمة منسدلة/سيلكت: `translateY(-4px)→0` + opacity، 150ms.
- دروار السايدبار بالموبايل: slide 250ms. طيّ السايدبار بالديسكتوب: width 200ms.
- الأزرار: `active:scale-[.98]`.
- `@media (prefers-reduced-motion: reduce)` بيلغي كل الـ transitions/animations.

### 5.5 المؤشر والتفاعل
- قاعدة عامة بـ `globals.css`: `button:not(:disabled), [role=button], a[href],
  select, summary, label[for], [role=option], [role=tab], [role=menuitem]
  { cursor: pointer }`، و`:disabled { cursor: not-allowed }`.
- صفوف الجداول القابلة للفتح: `cursor-pointer` + hover `primary-soft`.
- `focus-visible`: حلقة 2px بلون `primary` بإزاحة 2px على كل عنصر تفاعلي.

## 6. المكوّنات (مقرَّر)

كلها بـ `src/components/ui`. الواجهة (props) بتضل متوافقة قدر الإمكان عشان
الصفحات ما تنكسر؛ أي إضافة اختيارية.

- **Button**: variants `primary` (برغندي/أبيض)، `secondary` (أبيض + حد `border`
  + نص `heading`، hover `surface-muted`)، `ghost` (نص برغندي، hover `primary-soft`)،
  `danger` (أحمر صلب)، `danger-soft`. أحجام sm 36 / md 48 / lg 52. خط 500.
  دعم `loading` (سبنر + تعطيل) و`icon`.
- **IconButton** جديد: 40×40، `rounded-xl`، خلفية `surface-muted`، hover
  `primary-soft` + أيقونة برغندي، `aria-label` إجباري.
- **Input / textarea**: مطابق `VioraFormField`: label فوق (14/500/`heading`)،
  `gap-2`، حقل أبيض، حد `border`، hover `border-strong`، focus حد `primary` + حلقة
  `primary/15`، خطأ حد `danger` + رسالة 12px تحت، readonly خلفية `field-readonly`.
- **Select**: مكوّن **مخصّص** بدل `<select>` الأصلي (القائمة الأصلية ما بتتنسّق):
  زر trigger بنفس شكل Input + سهم `ChevronDown` بيلف 180° لما تفتح، قائمة
  بيضا `rounded-xl` + `shadow-pop` + حد، الخيار المختار عليه ✓ وخلفية
  `primary-soft`، hover `surface-muted`. ARIA: trigger `role="combobox"`
  `aria-expanded` `aria-controls`، القائمة `role="listbox"`، الخيارات
  `role="option"` `aria-selected`. كيبورد: أسهم، Enter/Space، Escape، Home/End،
  كتابة حرف للقفز. إغلاق بالضغط برّا. القائمة بتفتح لتحت أو لفوق حسب المساحة،
  وبتنحط بـ portal عشان ما تنقص جوّا الدايلوجات/الجداول. لو القائمة أطول من
  ~8 خيارات بيصير فيها scroll. نفس الـ props الحالية (`label,id,value,onChange,
  options,placeholder,error,required,disabled`).
- **SearchInput**: نفس Input مع أيقونة بحث بالبداية وزر مسح.
- **Tabs / فلاتر الحالة**: pills — النشط `primary`/أبيض، غير النشط `chip`/`chip-text`،
  ارتفاع 36، مع عدّاد اختياري.
- **Badge / StatusBadge**: pill، 12px/500، خلفية `*-soft` ونص اللون — نجاح، تحذير،
  معلومات، خطر، محايد (`chip`).
- **Card**: أبيض، حد `border`، `rounded-2xl`، `p-5`/`p-6`، بدون ظل أو `shadow-card`.
- **Table** (`TableShell/Thead/Td` + `Tr` جديد): غلاف أبيض بحد `border`
  و`rounded-2xl`، رأس `surface-muted` بنص `text-secondary` 13–14/500، خلايا
  `px-4 py-3.5`، فواصل `border`، `Tr` بـ prop `onClick` بيضيف pointer + hover
  + دعم Enter من الكيبورد (`tabIndex=0`).
- **Modal** جديد (أساس لكل الدايلوجات): backdrop `heading/40`، لوحة بيضا
  `rounded-2xl` `shadow-pop`، رأس (عنوان 18/700 + زر إغلاق IconButton)، جسم،
  footer للأزرار (الأساسي بالبداية). Escape، focus trap، منع scroll الخلفية،
  حركة 5.4. أحجام sm/md/lg. `ConfirmDialog/NoteDialog/ReasonDialog` +
  دايلوجات التصنيفات وأكواد الخصم والطلبات والمالية بتنبني عليه.
- **Toggle**: track 36×20، نشط `primary`، غير نشط `#E0DBD9` (توكن `track`).
- **Pagination، EmptyState، ErrorBanner، Spinner، ToastViewport، PageHeader،
  StatCard، TrendChart**: بيتحدّثوا للتوكنز والسلّم الجديد.
- **Skeleton** (اختياري للمنفّذ): خلفية `chip` مع shimmer خفيف.

## 7. القشرة (Shell)

### 7.1 السايدبار (الخيار A)
- عرض 264px، أبيض، حد `border` على جهة النهاية (`border-e` بالـ RTL = يسار).
- الأعلى: لوغو 36px + "فيورا" 18/700 + "لوحة الإدارة" 12/`text-tertiary`،
  وزر طيّ (IconButton شفاف) على الديسكتوب.
- مجموعات (عنوان 12/500/`text-tertiary`، `pt-4 pb-1.5 px-3`):
  - (بدون عنوان) الرئيسية `LayoutGrid`
  - **الإدارة**: المتاجر `Store`، المستخدمين `Users`، الطلبات `ShoppingBag`،
    التصنيفات `Layers`
  - **المراقبة**: التقييمات `Star`، البلاغات `Flag`، الدعم `Headphones`
  - **التسويق**: أكواد الخصم `TicketPercent`، إشعارات للزبائن `Megaphone`،
    بنرات التطبيق `Image`
  - **الإعدادات والمالية**: المحتوى `FileText`، المالية `Wallet`
- الرابط: 40px، `px-3`، `gap-3`، `rounded-[10px]`، 14/500 `text-secondary`؛ hover
  `surface-muted` + `heading`؛ النشط `primary-soft` + `primary` + 700.
- عدّاد اختياري بآخر الرابط (pill برغندي/أبيض 11/700، بيختفي لو 0، "99+" فوق 99):
  الدعم = `fetchSupportTickets({status:"OPEN"})`، المتاجر = `fetchStores` بحالة
  `PENDING`، البلاغات = `fetchReports` بحالة `PENDING`. كلهم بـ `limit: 1` وقراءة
  `pagination.total` — نفس حيلة التوب-بار الحالية، بدون endpoints جديدة. hook واحد
  مشترك (`useNavCounts`) بيحدّث كل 45 ثانية وبيغذّي السايدبار وأيقونة الدعم
  بالتوب-بار (بدل الـ polling المكرر). فشل الطلب = بدون عدّاد، بصمت.
- الأسفل: كرت المستخدم (حد `border`، `rounded-xl`، أفاتار دائري `primary-soft`
  بحرف برغندي، الاسم 14/700، الدور 12/`text-tertiary`) بيفتح قائمة "تسجيل الخروج"
  (نفس السلوك الحالي + ConfirmDialog).
- الطيّ (ديسكتوب): 76px، أيقونات بس مع `title`، المجموعات بتصير فواصل رفيعة.
- الموبايل (<lg): دروار من اليمين 288px + backdrop، نفس المحتوى موسّع دايماً.
- `NAV_ITEMS` بـ `src/config/nav.ts` بيصير فيه `group`؛ `getActiveNavItem` بيضل.
  الدعم بيصير رابط بالسايدبار (حالياً بس أيقونة بالتوب-بار).

### 7.2 التوب-بار
- 64px، أبيض، حد سفلي `border`، `sticky`. زر القائمة (موبايل)، عنوان الصفحة
  20/700، وعلى النهاية: زر التثبيت (PWA)، الدعم (IconButton + عدّاد)، الإشعارات.
- قائمة الإشعارات المنسدلة بتاخد شكل القوائم الجديد (`shadow-pop`، حركة 5.4).

### 7.3 تسجيل الدخول
- صفحة بيضا، كرت بالنص (max 400px) بحد `border` و`rounded-2xl`، لوغو فوق،
  عنوان 24/700، حقول وزر من المكوّنات الجديدة، زر بعرض كامل.

## 8. مسح الصفحات (مقرَّر)
- كل `<button>` خام ← `Button`/`IconButton` (إلا لو العنصر مش زر مرئي، زي صف
  شجرة التصنيفات — ساعتها بس بيتحدّث للتوكنز + pointer).
- كل `<select>`/`<input>`/`<textarea>` خام ← `Select`/`Input`/`SearchInput`.
- الجداول ← `TableShell/Thead/Td/Tr`.
- كل الدايلوجات ← `Modal`.
- ترويسة كل صفحة: `PageHeader` (عنوان 24/700 + وصف 14/`text-secondary` + أزرار
  الإجراءات على النهاية)، ثم شريط الفلاتر (`gap-3`)، ثم المحتوى.
- ألوان Tailwind الخام ← توكنز؛ `font-semibold/extrabold/black` ← 500/700.

## 9. الاختبارات
- الاختبارات اللي بتستخدم `selectOption` على `combobox` (`tests/e2e/admin.spec.ts`
  سطور 142، 145، 277) بتتحدّث لتفتح الـ Select المخصّص وتختار الـ `option` بالاسم
  — نفس السيناريو، بس طريقة التفاعل. ما في تغيير آخر على الاختبارات إلا لو
  بيعتمد على class أو نص اتغيّر للشكل فقط.
- إضافة اختبار e2e للـ Select (فتح، كيبورد، اختيار، Escape).
- كل مرحلة بتنتهي بـ `npm run lint && npm run typecheck && npm run build`
  و`npm test` (Playwright مع الـ mock الموجود).

## 10. التنفيذ (Opus يخطّط، Codex ينفّذ)
- Opus بيكتب خطة لكل مهمة بـ `docs/superpowers/plans/`، وCodex CLI
  (`codex exec -s workspace-write`) بينفّذها، وOpus بيراجع الـ diff ويشغّل
  الفحوصات ويتحقق بالمتصفح.
- الترتيب: (1) الأساس: الخط + التوكنز + القواعد العامة ← (2) المكوّنات الأساسية
  + Modal + Select ← (3) القشرة + تسجيل الدخول ← (4) مسح الصفحات بمهام متوازية
  على ملفات منفصلة ← (5) تحقق بصري نهائي.
- كل مهمة بكومِت لحالها.

## 10.1 قرارات Opus بعد مراجعة المنفّذ
- **النص هو المرجع** لو اختلف عن الموك-أب. اللوغو: `public/icons/original-logo.png`.
- **Select** بدون أي dependency (ولا floating-ui): portal + حساب موقع بسيط
  (`getBoundingClientRect`، يفتح لفوق لو ما في مساحة تحت، بيتحدّث مع scroll/resize).
  اختيار واحد فقط — ما في multi-select بالمشروع. ما في selects جوّا صفوف الجداول.
  للاختبارات: helper مشترك `tests/e2e/helpers/select.ts` (`pickOption(page, label, optionName)`).
- **منع الألوان الخام آلياً**: سكربت `scripts/check-tokens.mjs` بيفشل لو لقى hex
  أو ألوان Tailwind خام (`gray|slate|rose|emerald|amber|sky|red|green|blue|white|black…`)
  أو `font-semibold|extrabold|black` بـ `src/**/*.tsx`، وبينضاف لـ `npm run lint`.
  استثناءات: `globals.css`، و`#` جوّا بيانات (ألوان المنتجات/التصنيفات).
- **ملكية `src/components/ui/*`**: بعد المرحلة 2 مهام المسح ممنوع تعدّل `ui/*`
  أو `globals.css` أو `nav.ts`. لو احتاجت إضافة، بتسجّلها بتقريرها وOpus بيعملها
  بمهمة منفصلة قبل/بعد.
- **نصوص القائمة** بتضل زي ما هي (مصادرها الحالية)؛ "الدعم" من `t.admin.nav.support`.
- **التوكنز الجديدة بتحل محل القديمة بكل مكان**: الرسوم البيانية، `themeColor`
  بـ `layout.tsx`، و`theme_color` بـ `manifest.ts` ← `#511016`. أيقونات PWA بتضل.

## 11. متروك للمنفّذ
- تفاصيل الـ markup الداخلية للمكوّنات طالما بتطابق المواصفات أعلاه.
- اختيار shimmer للـ Skeleton أو لا.
- توزيع أعمدة/مسافات دقيقة داخل الصفحات المعقدة (المحتوى، المالية، تفاصيل المتجر)
  ضمن شبكة 4px والقواعد أعلاه.
