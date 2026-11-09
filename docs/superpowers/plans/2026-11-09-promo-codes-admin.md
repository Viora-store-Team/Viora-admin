# Promo Codes — Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the platform admin a «أكواد الخصم» page to create Viora (platform-funded) codes, browse every code (Viora and stores) with usage and cost, and stop any code; and show promo money in finance (settlements + Viora promo cost) and in the order detail.

**Architecture:** Same layers the panel already uses: typed fetchers in `src/lib/admin/api.ts` over `adminFetch`, types in `src/lib/admin/types.ts`, pure helpers in a new `src/lib/admin/promo.ts` (payload building, validation, labels — unit-tested with `node --test`), a client page `src/app/(panel)/promo-codes/page.tsx` built on `useAdminList`, and a form dialog component. Finance and order screens only gain read-only fields.

**Tech Stack:** Next.js (App Router, this repo's version — read `node_modules/next/dist/docs/` before writing per `AGENTS.md`), React 19, TypeScript, Tailwind, lucide-react, Playwright e2e, `node --test` unit tests.

**Spec:** `C:\Users\Yousef\OneDrive\Desktop\Viora-BackEnd\docs\superpowers\specs\2026-11-08-promo-codes-design.md` §6.3 (Arabic). **API contract (binding):** `C:\Users\Yousef\OneDrive\Desktop\Viora-BackEnd\MOBILE-PROMO.md` §4 (الأدمن), §5, §6 (item shape and create rules), §7.

**Repo:** `C:\Users\Yousef\OneDrive\Desktop\Viora-Admin`

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (`AGENTS.md`). Client pages start with `"use client"` like the existing `(panel)` pages.
- Reuse the panel's UI kit only (`PageHeader`, `Card`, `Table`/`Th`/`Td`, `Tabs`, `Select`, `SearchInput`, `Pagination`, `Badge`, `Button`, `Input`, `ConfirmDialog`, `EmptyState`, `ErrorBanner`, `Spinner`, `dispatchToast`, `formatCurrency`/`formatDateTime` from `@/lib/format`). No new dependency. Arabic UI copy; reuse `t.*` from `@/lib/strings` where a key exists; new copy can live in the page/component like `banners/page.tsx` does, or under a new `t.admin.promo` block in `strings.ts`.
- **No commits, branches or pushes** unless the user asks.
- Endpoints (all under the admin session, `adminFetch`):
  - `GET /admin/promo-codes?owner=platform|store&storeId=&status=active|ended&q=&page=&limit=` → `{ success, promoCodes, pagination }`. `owner` is case-insensitive; `q` matches part of the **code**.
  - `POST /admin/promo-codes` → 201 `{ promoCode }` (always `owner: "PLATFORM"`).
  - `PATCH /admin/promo-codes/:id/stop` (no body, idempotent, any code) → `{ promoCode }`; unknown id → 404 `PROMO_NOT_FOUND`.
  - Item: `id, code, owner ("PLATFORM"|"STORE"), store ({id,name}|null), type ("PERCENT"|"FREE_DELIVERY"), percent, maxDiscount, minOrder, startsAt, endsAt, stoppedAt, status ("ACTIVE"|"ENDED"), usesCount, discountTotal` (money as strings).
  - `GET /admin/settlements` rows also carry `discountAmount`, `deliveryWaived` (strings) and `promoFundedBy` (`"PLATFORM"|"STORE"|null`). `GET /admin/settlements/summary` returns `platformPromoCost` (string) among its totals.
  - `GET /admin/orders/:id`: `money.discount`, `money.deliveryWaived`, `money.promo` (`{code, fundedBy, type, percent, freeDelivery}` | null) like the customer view; `group.promo` (`{code, owner, type, percent, store}`) and `group.discountTotal`; `settlement.discountAmount`, `settlement.deliveryWaived`.
- Create rules (validated client-side, server stays the authority): `code` 4–20 `[A-Za-z0-9]` (sent trimmed + upper-case); `type` `PERCENT` | `FREE_DELIVERY`; `percent` integer 1–90 (only `PERCENT`); `maxDiscount` optional positive, ≤ 2 decimals (only `PERCENT`); `minOrder` optional positive, ≤ 2 decimals; `duration` `12H` | `1D` | `3D` | `7D` | `CUSTOM`; `CUSTOM` needs `endsAt` (`new Date(local).toISOString()`) 1 h–90 d from now. Omit empty optionals.
- Server errors: show `fieldErrors`/`errors` per field under the matching input (`code`, `type`, `percent`, `maxDiscount`, `minOrder`, `duration`, `endsAt`); `PROMO_CODE_TAKEN` → "هذا الكود مستخدم، اختر كوداً آخر" under the code field; anything else → `ErrorBanner` in the dialog + toast. Never show raw JSON.
- Completion checks (run in the repo): `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm test` (Playwright; it starts `npm run start` on port 3100 and intercepts the API, so no backend is needed), `npm run audit`, then `git diff --check` and `git status --short`. If Chrome/Playwright cannot run here, say so and report the other checks.

## Review Focus

1. **Admin double-clicks "إنشاء"** → one POST; button disabled with a spinner. Test in Task 2 (e2e `create sends one request`).
2. **Code already taken** → message under the code field, dialog stays open with the other values intact. Test in Task 2 (e2e `taken code shows under the field`).
3. **Stopping a store's code** from the admin list → confirm dialog names the store; row moves to "منتهية" after success; 404 refreshes the list and shows a toast. Test in Task 2 (e2e `stop asks to confirm and refreshes`).
4. **Custom end in the admin's local time** → sent as UTC ISO; out-of-range shows a field error. Test in Task 1 (unit `custom end converts to UTC and validates range`).
5. **Finance for a period with only platform codes** → "تكلفة أكواد Viora" card shows `platformPromoCost`; settlements rows show the discount with a "Viora"/"المتجر" badge; rows without promo show "—". Test in Task 3 (e2e `finance shows promo cost and columns`).

---

### Task 1: Types, API fetchers, pure helpers

**Files:**
- Modify: `src/lib/admin/types.ts` (promo types; `AdminOrderDetail.money` gains `discount`, `deliveryWaived`, `promo`; `AdminOrderGroup` gains `promo`, `discountTotal`; settlement on order detail gains `discountAmount`, `deliveryWaived`)
- Modify: `src/lib/admin/api.ts` (`fetchPromoCodes`, `createPromoCode`, `stopPromoCode`, `fetchSettlementSummary`; `AdminSettlement` gains `discountAmount?`, `deliveryWaived?`, `promoFundedBy?`, `storeDue?`, `collectedAmount?`)
- Create: `src/lib/admin/promo.ts`
- Test: `tests/unit/promo.test.mjs`

**Interfaces:**
- Types: `PromoOwner = "PLATFORM" | "STORE"`, `PromoType = "PERCENT" | "FREE_DELIVERY"`, `PromoStatus = "ACTIVE" | "ENDED"`, `PromoDuration = "12H" | "1D" | "3D" | "7D" | "CUSTOM"`, `interface AdminPromoCode { id; code; owner; store: {id:number; name:string} | null; type; percent: number | null; maxDiscount: string | null; minOrder: string | null; startsAt; endsAt; stoppedAt: string | null; status; usesCount: number; discountTotal: string }`.
- Fetchers: `fetchPromoCodes(params: ListParams & { owner?: "platform" | "store" | ""; status?: "active" | "ended"; storeId?: number }): Promise<Paged<"promoCodes", AdminPromoCode>>`; `createPromoCode(body: PromoCreateBody): Promise<ApiResponse & { promoCode?: AdminPromoCode }>`; `stopPromoCode(id: number): Promise<ApiResponse & { promoCode?: AdminPromoCode }>`; `fetchSettlementSummary(): Promise<ApiResponse & { platformPromoCost?: string; [k: string]: unknown }>` (read the summary fields at the root or under `summary`, whichever the backend returns — check `settlement.admin.controller.js` in the backend repo).
- `promo.ts` (pure, no React): `interface PromoForm { code; type; percent; maxDiscount; minOrder; duration; customEnd /* "YYYY-MM-DDTHH:mm" from <input type="datetime-local"> */ }`; `type PromoFormErrors = Partial<Record<keyof PromoForm | "endsAt", string>>`; `buildPromoBody(form: PromoForm, now: Date): { body: PromoCreateBody } | { errors: PromoFormErrors }` (validation copy below); `promoValueLabel(p: AdminPromoCode): string` ("خصم 10%" / "توصيل مجاني"); `promoOwnerLabel(p): string` ("Viora" / store name); `serverPromoErrors(res: ApiResponse): PromoFormErrors` (reads `fieldErrors[field].code === "PROMO_CODE_TAKEN"` → taken copy, else `errors[field]` text).
- Validation copy (Arabic): code "الكود من 4 لـ 20 حرف إنجليزي أو رقم"; percent "النسبة رقم صحيح من 1 لـ 90"; money "مبلغ موجب بخانتين عشريتين بالأكثر"; custom missing "اختر وقت انتهاء الكود"; custom range "النهاية لازم تكون بعد ساعة على الأقل وخلال 90 يوم"; taken "هذا الكود مستخدم، اختر كوداً آخر".

- [ ] **Step 1: Write failing unit tests** (`tests/unit/promo.test.mjs`, style of `media-upload.test.mjs`):
  - `percent form builds the body` — `{code:" ramal10 ", type:"PERCENT", percent:"10", maxDiscount:"", minOrder:"50", duration:"1D"}` → `{code:"RAMAL10", type:"PERCENT", percent:10, minOrder:50, duration:"1D"}`.
  - `free delivery drops percent and max discount`.
  - `custom end converts to UTC and validates range` — now `2026-11-09T10:00:00Z`; `customEnd` 30 min later → error on `endsAt`; 91 days → error; 2 days later → `endsAt` equals `new Date(customEnd).toISOString()`.
  - `invalid code/percent/money produce field errors` — "AB!", "95", "1.234".
  - `serverPromoErrors maps PROMO_CODE_TAKEN and plain field errors`.
  - `labels` — `promoValueLabel` for percent/free; `promoOwnerLabel` for platform/store.
- [ ] **Step 2:** `npm run test:unit` → FAIL. **Step 3:** Implement types, fetchers, helpers. **Step 4:** `npm run test:unit` and `npm run typecheck` → PASS.

---

### Task 2: «أكواد الخصم» page and create dialog

**Files:**
- Modify: `src/config/nav.ts` (`{ href: "/promo-codes", label: "أكواد الخصم", icon: TicketPercent }` after `/orders`)
- Create: `src/app/(panel)/promo-codes/page.tsx`
- Create: `src/components/admin/PromoCodesTable.tsx`, `src/components/admin/PromoCodeFormDialog.tsx`
- Modify: `src/lib/strings.ts` only if you choose the `t.admin.promo` block

**Interfaces:**
- Consumes Task 1 fetchers/helpers, `useAdminList`.
- Page: `PageHeader` title "أكواد الخصم" + primary button "كود Viora جديد"; owner `Tabs` (الكل / Viora / المتاجر → `owner` "" / "platform" / "store"); status `Select` (فعّالة / منتهية, default فعّالة); `SearchInput` (placeholder "ابحث بالكود"); table; `Pagination`; `EmptyState` ("لا توجد أكواد مطابقة"); `ErrorBanner` with retry.
- Table columns: الكود (LTR, bold) · الجهة (Badge "Viora" or store name) · الخصم (`promoValueLabel`) · الشروط (min order / max discount or "—") · المدة ("ينتهي {formatDateTime}" / "انتهى …" / "موقوف …") · الاستعمال (`usesCount`) · مجموع الخصم (`formatCurrency(discountTotal)`) · الحالة (Badge success/neutral) · إجراء ("إيقاف" button on active rows only, with a per-row spinner).
- Stop: `ConfirmDialog` (tone danger) title "إيقاف الكود؟", body names the code and, for store codes, "كود متجر {store}"; confirm → `stopPromoCode(id)` → success toast "تم إيقاف الكود" + list reload; 404 `PROMO_NOT_FOUND` → toast "الكود غير موجود" + reload; other errors → toast with `message`.
- Create dialog (`PromoCodeFormDialog`, pattern of `CategoryFormDialog` with `useDialog`): fields code (LTR, upper-cases on input, max 20), type (two radio-style buttons), percent + max discount (percent only), min order, duration select (12 ساعة / يوم / 3 أيام / أسبوع / مخصص), `<input type="datetime-local">` for custom; info line "الخصم على حساب Viora — المتاجر بتستلم سعرها كامل."; submit "إنشاء" disabled + spinner while busy (a `useRef` guard against double submit); on success close, toast "تم إنشاء الكود", reload list.

- E2E: extend `tests/e2e/admin.spec.ts` — add `/admin/promo-codes` fixtures to the route table and POST/PATCH handling keyed on method, with a small in-test store of codes so create/stop change what the next GET returns.

- [ ] **Step 1: Write the failing e2e tests:**
  - `promo page lists codes with owner and status` — one platform and one store code; owner tab "المتاجر" sends `owner=store` (assert the request URL).
  - `create sends one request` — fill the dialog, double-click "إنشاء" → exactly one POST with body `{code:"VIORA10", type:"PERCENT", percent:10, duration:"1D"}`; dialog closes; new row visible.
  - `taken code shows under the field` — POST answers 409 `{success:false, errorCode:"PROMO_CODE_TAKEN", errors:{code:"x"}, fieldErrors:{code:{code:"PROMO_CODE_TAKEN"}}}` → text "هذا الكود مستخدم، اختر كوداً آخر" next to the code input; dialog still open; percent value kept.
  - `client validation blocks bad input` — code "AB", percent "95" → messages shown, no POST.
  - `stop asks to confirm and refreshes` — click "إيقاف" on the store code → dialog mentions the store name → confirm → one PATCH `/admin/promo-codes/2/stop` → row disappears from the active list; a second scenario answering 404 shows the not-found toast and reloads.
- [ ] **Step 2:** `npm run build` then `npm test -- tests/e2e/admin.spec.ts` → the new tests FAIL (no `/promo-codes` page yet).
- [ ] **Step 3:** Implement nav, page, table, dialog; keep every piece of logic that can be pure in `promo.ts`.
- [ ] **Step 4:** `npm run lint`, `npm run typecheck`, `npm run build`, `npm test -- tests/e2e/admin.spec.ts` → PASS. Manual smoke with `NEXT_PUBLIC_ADMIN_MOCK` is **not** required (the mock layer is dev-only; see Task 4).

---

### Task 3: Promo money in finance and order detail

**Files:**
- Modify: `src/app/(panel)/finance/page.tsx` (settlements table + summary card)
- Modify: `src/app/(panel)/orders/page.tsx` and `src/components/admin/StoreOrdersSection.tsx` (order detail money block)
- Modify: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Finance: load `fetchSettlementSummary()` alongside the existing calls; a `StatCard`/small card "تكلفة أكواد Viora" = `formatCurrency(platformPromoCost)` with hint "خصومات وتوصيل مجاني مولتها Viora". Settlements table gains columns "الخصم" (`discountAmount` > 0 ? `− formatCurrency` : "—") and "توصيل مجاني" (`deliveryWaived` > 0 ? amount : "—") and a "على حساب" badge (`promoFundedBy`: PLATFORM → "Viora", STORE → "المتجر", null → nothing). While there, show `storeDue` in the amount column when `amount` is missing (`settlement.amount ?? settlement.storeDue`) — the backend sends `storeDue`, not `amount`.
- Order detail (both places that render `AdminOrderDetail.money`): when `money.promo` or `group.promo` exists, add lines "كود {code} ({Viora|المتجر})", "الخصم − X" (`money.discount`), "توصيل مجاني − X" (`money.deliveryWaived`), and "الإجمالي بعد الخصم" from `money.payableTotal ?? money.finalTotal`. No promo → unchanged.

- [ ] **Step 1: Write failing e2e tests:** `finance shows promo cost and columns` (summary fixture with `platformPromoCost:"30.00"`; settlements with one PLATFORM row discount "10.00", one STORE row waived "6.00", one plain row → "—"); `order detail shows promo lines` (order fixture with `money.discount:"20.00"`, `money.promo.code:"PMONEYP"`, `group.promo.owner:"PLATFORM"`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** `npm run build && npm test` → PASS.

---

### Task 4: Final verification

- [ ] **Step 1:** `npm run lint` (0 warnings), `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm test`, `npm run audit` → all pass; report any that cannot run here.
- [ ] **Step 2:** `git diff --check` clean; `git status --short` shows only this plan's files.
- [ ] **Step 3:** Report: not done — the dev-only mock layer (`NEXT_PUBLIC_ADMIN_MOCK`) has no promo handlers (ruling: mock is development-only and the e2e suite intercepts the real API paths); live check against a backend with the promo migration.
