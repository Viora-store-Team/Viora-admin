# Viora Admin

لوحة مالك المنصة لـ **فيورا** — تطبيق Next.js مستقل.

لوحة التاجر بريبو منفصل: [Viora-Dashboard](https://github.com/Viora-store-Team/Viora-Dashboard).

## التشغيل

```bash
npm install
npm run dev
```

بتفتح على `/login`. حساب المشرف بينزرع من متغيّرات البيئة على السيرفر
(`ADMIN_EMAIL` · `ADMIN_PASSWORD`) — ما في تسجيل من الواجهة.


## التحقق من التغييرات

```bash
npm ci
npm run lint
npm run build
npm test
npm audit
```

اختبارات Playwright تشغّل نسخة production على المنفذ 3100 وتحاكي API ببيانات اختبار؛ لا تحتاج حساباً حقيقياً. محلياً يلزم Chrome، وفي CI يُثبّت Chromium. أعد البناء بعد تغييرات التطبيق قبل تشغيل الاختبارات.

الاتصال الحقيقي هو الافتراضي. البيانات التجريبية تتطلب NEXT_PUBLIC_ADMIN_MOCK=true في وضع التطوير فقط.
