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

## حالة الربط

القسم مربوط **على مرحلتين**، لأن الباك إند وصّل جزء من المسارات:

| الصفحة | المصدر |
|---|---|
| نظرة عامة `/` | ✅ `GET /admin/stats` |
| المتاجر `/stores` · `/stores/[id]` | ✅ `GET /admin/stores` + `PATCH …/approve` · `…/reject` |
| المستخدمون `/users` · `/users/[id]` | ✅ `GET /admin/users` + `PATCH …/suspend` · `…/activate` |
| التصنيفات · البلاغات · المحتوى · التوصيل | 🟡 بيانات تجريبية (`src/lib/admin/mock/`) |

الصفحات التجريبية بيظهر فوقها شريط تنبيه. التوزيع محدّد بمكان واحد:
[`src/lib/admin/client.ts`](src/lib/admin/client.ts) — لما يوصل مسار جديد
من الباك إند، ضيف بادئته لـ `LIVE_PREFIXES` وصفحته لـ `LIVE_PAGES`.

تفاصيل المسارات المفحوصة حيّاً: [`API-STATUS.md`](API-STATUS.md).
احتياجات الباك إند المتبقية: [`ADMIN-BACKEND-TODO.md`](ADMIN-BACKEND-TODO.md).
