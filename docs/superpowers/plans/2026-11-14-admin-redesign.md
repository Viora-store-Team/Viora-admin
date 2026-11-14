# Admin Redesign (Viora identity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution in this repo:** each task is run by Codex CLI (`codex exec`). Opus reviews the diff, runs the checks and commits. **Codex never commits.** Run only the task you were given.

**Goal:** Restyle the entire Viora admin panel to the Viora mobile/merchant design system (Thmanyah font, `#511016`, white background, white grouped sidebar, unified components, smooth motion, pointer cursors) with **zero behaviour change**.

**Architecture:** Tokens first (`globals.css` `@theme`), then rebuild the shared primitives in `src/components/ui`, then the shell, then sweep the pages onto the primitives. Pages keep their logic. Only markup and classes change.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before using any Next API, per `AGENTS.md`), React 19, Tailwind v4 CSS-first (`@theme` in `src/app/globals.css`, no tailwind.config), lucide-react, Playwright (runs against `npm run start` on :3100, so **build first**), node `--test` unit tests in `tests/unit/*.test.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-14-admin-redesign-design.md`. Read it fully: sections 5–8 hold every colour, size and component rule. This plan references them as §5.2 etc. and does not repeat them.

## Global Constraints

- No new npm dependencies. No changes to API calls, data, routes, or user-facing copy. Copy changes only if the spec requires them.
- RTL: logical utilities only (`ps/pe/ms/me/start/end/border-s/border-e`). Never `pl/pr/ml/mr/left/right` for layout.
- Colours only via tokens from §5.2. No hex values and no raw Tailwind palette (`white|black|gray|slate|zinc|neutral|stone|red|rose|amber|emerald|green|blue|sky|yellow|orange`) in `src/**/*.tsx`. Exception: data colours (product/category swatch hex from the API).
- Font weights: 400 / 500 / 700 only (`font-normal|font-medium|font-bold`). Never `font-semibold|font-extrabold|font-black`.
- Radii: fields and buttons `rounded-xl` (12px), cards/tables/modals `rounded-2xl` (16px), pills `rounded-full`, sidebar links `rounded-[10px]`.
- Heights: md control 48px (`h-12`), sm 36px (`h-9`), lg 52px (`h-13`), icon button 40px (`size-10`).
- Motion: colours 150ms, enter/exit 200ms, `ease-out`, nothing > 250ms. Use only `transform`/`opacity` for movement. `prefers-reduced-motion` disables it all (global rule, Task 1).
- Icons: lucide-react, `strokeWidth={1.75}`, `aria-hidden="true"` when decorative.
- Each task must pass: `npm run typecheck`, `npm run lint`. Tasks 1–4 and 6 also: `npm run build && npm test && npm run test:unit`. Task 5 sub-tasks run only `npm run typecheck` and `npx eslint <files they touched>` (they run in parallel, and Opus runs build + e2e after).
- Keep existing `aria-*`, accessible names, `role`s and labels **exactly**, because the e2e tests select by them.

## Review Focus

1. **Select inside a Modal**: the listbox must render above the modal (portal, z-index above the modal layer). Escape closes only the listbox, and the modal stays open. Test in Task 6, Step 0 (the Modal itself is built in Task 3).
2. **Select near the viewport bottom / page scroll**: the list flips upward when there's no space below and follows the trigger on scroll/resize. Test in Task 3.
3. **Row click vs inner controls**: a table row with `onClick` must open on click and on Enter (it's focusable), while buttons/links inside the row must not also trigger the row. Test in Task 2 (stores table).
4. **Nav counts API failing**: a failing count request shows no badge and no toast/error, and the sidebar still renders. Test in Task 4.
5. **Long labels in narrow places**: long Arabic store names in table cells, the select trigger and the sidebar user name truncate with an ellipsis, without overflowing or wrapping the control height. Test in Task 3 (select trigger) and Task 4 (sidebar user).

---

### Task 1: Foundation — font, tokens, global rules, token checker

**Files:**
- Create: `src/app/fonts/thmanyahsans-Regular.otf`, `-Medium.otf`, `-Bold.otf` (byte-for-byte copies of `../Viora-Mobile/assets/fonts/thmanyahsans-*.otf`, unmodified)
- Modify: `src/app/layout.tsx` (Cairo → `localFont`, `themeColor` `#511016`)
- Modify: `src/app/manifest.ts` (`theme_color` `#511016`, keep `background_color` consistent with `#FFFFFF`)
- Modify: `src/app/globals.css`
- Modify: every file using the `icon` token (`grep -rn "\-icon\b\|-icon/" src --include=*.tsx`)
- Create: `scripts/check-tokens.mjs`, `tests/unit/checkTokens.test.mjs`
- Modify: `package.json` (add `"check:tokens": "node scripts/check-tokens.mjs"`, **not** yet part of `lint`)

**Interfaces:**
- Produces: Tailwind tokens from §5.2: `primary, primary-hover, primary-soft, primary-subtle, heading, text-secondary, text-tertiary, icon (#310A0D), on-primary (#FFFFFF), app-bg, surface, surface-muted, field-readonly, chip, chip-text, border, border-strong, track (#E0DBD9), success(-soft), warning(-soft), info(-soft), danger(-soft), star, chart-1..chart-4`. Shadows `--shadow-card`, `--shadow-pop` (§5.2). Font variable `--font-thmanyah`, wired to `--font-sans`.
- Produces: **legacy aliases kept until Task 6**: `field-bg` → `#FAF7F5`, `field-label` → `#666666`, `placeholder` → `#999999`. Comment them as `/* legacy — removed in Task 6 */`.
- Produces: keyframes `viora-fade-in`, `viora-pop-in` (opacity + `scale(.96)→1`), `viora-drop-in` (opacity + `translateY(-4px)→0`), `viora-toast-in` (keep).
- Produces: `findViolations(source: string, file: string): {line: number, rule: "hex"|"palette"|"weight"|"legacy", text: string}[]` exported from `scripts/check-tokens.mjs`. The CLI scans `src/**/*.tsx`, prints violations and exits 1 if any.

- [ ] **Step 1: Write failing unit tests** `tests/unit/checkTokens.test.mjs` (`node:test` + `assert`, import `findViolations` from `../../scripts/check-tokens.mjs`):
  - `flags hex in className`: `findViolations('<div className="text-[#712631]"/>','a.tsx')` → one `{rule:"hex", line:1}`
  - `flags raw palette`: `'bg-rose-500 text-white'` → two `palette`
  - `flags banned weights`: `'font-semibold font-extrabold font-black'` → three `weight`
  - `flags legacy tokens`: `'bg-field-bg text-field-label placeholder:text-placeholder'` → three `legacy`
  - `allows tokens`: `'bg-primary text-on-primary border-border font-medium'` → `[]`
  - `allows data hex`: a line containing `// tokens-allow` → `[]` (escape hatch for API swatch colours)
  - `ignores comments`: `'/* #fff */'` and `'// bg-white'` → `[]`
- [ ] **Step 2: Run** `npm run test:unit`. Expect FAIL (module missing).
- [ ] **Step 3: Implement `scripts/check-tokens.mjs`** with regexes per rule. Strip `//…` and `/*…*/` before matching. A line containing `tokens-allow` is skipped.
- [ ] **Step 4: Run** `npm run test:unit`. Expect PASS. Run `npm run check:tokens` and expect it to FAIL, listing existing violations (fine at this stage, because Task 6 makes it pass).
- [ ] **Step 5: Font.** Copy the three OTFs. In `layout.tsx`, use `localFont({ src: [{path:"./fonts/thmanyahsans-Regular.otf",weight:"400"},{…Medium,"500"},{…Bold,"700"}], variable:"--font-thmanyah", display:"swap" })`, remove Cairo, and set `--font-sans: var(--font-thmanyah), system-ui, sans-serif`.
- [ ] **Step 6: Tokens.** Rewrite `@theme` per §5.2 (values exact). `body { background: var(--color-app-bg); color: var(--color-heading); }`.
- [ ] **Step 7: Rename the white `icon` usages.** Replace every `text-icon`, `bg-icon`, `outline-icon`, `ring-icon`, `border-icon` (with any `/NN` opacity) by the same utility on `on-primary`. Only then set `--color-icon: #310A0D`.
- [ ] **Step 8: Global rules in `globals.css`** (outside `@theme`):
  - pointer rule from §5.5 (selector list verbatim) + `:disabled, [aria-disabled="true"] { cursor: not-allowed }`
  - `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }`
  - `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important } }`
  - the three new keyframes
- [ ] **Step 9: Verify.** `npm run typecheck && npm run lint && npm run build && npm test && npm run test:unit`. All PASS (same e2e results as the baseline).

---

### Task 2: Core primitives

**Files:**
- Modify: `src/components/ui/{Button,Input,SearchInput,Badge,Card,Tabs,Toggle,Table,Pagination,PageHeader,EmptyState,ErrorBanner,Spinner,ToastViewport,TrendChart}.tsx`
- Create: `src/components/ui/IconButton.tsx`
- Modify: `src/components/admin/StoresTable.tsx` (adopt `Tr`, the pilot for Review Focus #3)
- Test: `tests/e2e/admin.spec.ts` (append one test)

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces (later tasks rely on these exact APIs; existing props stay backward-compatible):
  - `Button` props: existing + `variant: "primary"|"secondary"|"ghost"|"danger"|"danger-soft"`, `size: "sm"|"md"|"lg"`, `loading?: boolean` (shows `Spinner`, sets `disabled` + `aria-busy`). Styles per §6.
  - `IconButton({ label: string; icon: React.ReactNode; variant?: "muted"|"ghost"; size?: "sm"|"md"; badge?: number; href?: string; …ButtonHTMLAttributes })`: renders `<Link>` when `href`, else `<button type="button">`. `aria-label={label}`, `title={label}`. `badge` > 0 shows a pill (`99+` cap). `muted` = `bg-surface-muted` hover `bg-primary-soft text-primary`; sizes md 40 / sm 32.
  - `Input`, `SearchInput`: same props. Visuals per §6 (white, `border-border`, hover `border-strong`, focus `border-primary ring-2 ring-primary/15`, label 14/500 `text-heading`, `gap-2`, error per §6, `read-only:bg-field-readonly`).
  - `Tabs`: same props. Pills per §6 (`h-9`, active `bg-primary text-on-primary`, inactive `bg-chip text-chip-text hover:bg-primary-subtle`), `count` shown as a small pill.
  - `Badge` tone `neutral` → `bg-chip text-chip-text`; pill 12/500 `px-3 py-1`.
  - `Card`: `bg-surface border border-border rounded-2xl`; `variant="muted"` → `bg-surface-muted`.
  - `Table.tsx` exports `TableShell, Thead, Td` (same signatures) + **new** `Tr({ children, onClick?, className? })`. With `onClick`: `tabIndex={0}`, `role` unchanged (row), `cursor-pointer`, `hover:bg-primary-soft`, `focus-visible:bg-primary-soft`, Enter/Space triggers `onClick`, and it ignores events whose target is inside `button, a, input, select, textarea, [role=combobox], [role=switch]` (use `closest()`). `TableShell`: `bg-surface border border-border rounded-2xl overflow-hidden`. `Thead`: `bg-surface-muted text-text-secondary text-[13px] font-medium`, `px-4 py-3`. `Td`: `px-4 py-3.5`. Row dividers `divide-y divide-border`.
  - `Toggle`: track `w-9 h-5`, on `bg-primary`, off `bg-track`, thumb white with `shadow-card`, 150ms.
  - `TrendChart`: series colours from `var(--color-chart-N)`, axis/grid `var(--color-border)` / `var(--color-text-tertiary)`, tooltip styled as a card with `shadow-pop`.
  - `ToastViewport`: white card, `border-border`, `shadow-pop`, tone icon colour, `viora-toast-in`.
- [ ] **Step 1: Write the failing e2e test** in `tests/e2e/admin.spec.ts`: `test("store rows open by click and keyboard but not via inner controls")`. Route `/admin/stores` to return `[store]`. Go to `/stores`. Assert the first body row has `tabindex="0"` and CSS `cursor: pointer`. Focus it and press Enter, and expect the URL `/stores/1`. Go back, click the row, and expect `/stores/1`.
- [ ] **Step 2: Run** `npm run build && npx playwright test -g "store rows open"`. Expect FAIL (no tabindex).
- [ ] **Step 3: Implement** all primitives listed above. Then adopt `Tr` in `StoresTable.tsx` (replace its `<tr onClick>`).
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npm run build && npm test`. Expect PASS.

---

### Task 3: Modal, Select, dialog migration, select test helper

**Files:**
- Create: `src/components/ui/Modal.tsx`, `src/lib/useFloating.ts`, `tests/e2e/helpers/select.ts`, `tests/e2e/select.spec.ts`
- Modify: `src/components/ui/Select.tsx` (full rewrite, same props), `src/components/ui/{ConfirmDialog,NoteDialog,ReasonDialog}.tsx`
- Modify: `src/app/(panel)/orders/page.tsx` (only the status `<select>` → `Select`, the pilot page for the e2e test)
- Modify: `tests/e2e/admin.spec.ts` lines 142, 145, 277 (use the helper)

**Interfaces:**
- Consumes: Task 2 `Button`, `IconButton`.
- Produces:
  - `Modal({ open: boolean; onClose: () => void; title: string; description?: React.ReactNode; size?: "sm"|"md"|"lg"; footer?: React.ReactNode; children?: React.ReactNode; closeOnBackdrop?: boolean /* default true */; labelledById?: string })`. Portal to `document.body`. Layer `z-50`. Backdrop `bg-heading/40` + `viora-fade-in`, panel `viora-pop-in` 200ms. `role="dialog" aria-modal="true" aria-labelledby`. Escape → `onClose` (**unless a descendant listbox is open**: check `event.defaultPrevented`, because Select calls `preventDefault` on its Escape). Focus trap, restore focus on close, lock `body` scroll. Sizes: sm `max-w-sm`, md `max-w-lg`, lg `max-w-2xl`. Header = title 18/700 + `IconButton` close (`label="إغلاق"`), body `px-6 pb-6`, footer `flex gap-3 justify-end pt-4 border-t border-border`, mobile full-width bottom-sheet style below `sm` is optional.
  - `ConfirmDialog/NoteDialog/ReasonDialog`: **same props and same accessible names/text**, re-implemented on `Modal`.
  - `useFloating(open: boolean, triggerRef: RefObject<HTMLElement>, opts?: { offset?: number; maxHeight?: number }) → { style: React.CSSProperties; placement: "bottom"|"top" }`: `position: fixed`, width = trigger width, flips to `top` when space below < min(maxHeight, 280) and space above is larger, recomputes on scroll (capture) and resize via `requestAnimationFrame`.
  - `Select`: same props as today (`label,id,value,onChange,options,placeholder,error,required,disabled,className`). Trigger is a `<button type="button" role="combobox" id={id} aria-haspopup="listbox" aria-expanded aria-controls={`${id}-listbox`} aria-labelledby={label id}>` so `getByRole("combobox",{name})` and `getByLabel(label)` both still find it. The selected label or placeholder is shown in `text-text-tertiary`, `truncate`, and the `ChevronDown` rotates 180° when open. The listbox is portalled, `role="listbox"`, `z-[60]`, styles per §6, `viora-drop-in`, `max-h-72 overflow-auto`. Each option has `role="option" aria-selected data-value={value}` and a `Check` icon when selected. Keyboard: ArrowUp/Down/Home/End move the active option (`aria-activedescendant`), Enter/Space selects and closes, Escape closes (+`preventDefault` + `stopPropagation`) and refocuses the trigger, Tab closes, and a printable char jumps to the next option whose label starts with it. Outside pointerdown closes. Opening scrolls the selected option into view. Hidden `<input type="hidden" name={id} value={value}>` keeps form semantics.
  - `pickOption(page: Page, field: Locator, value: string): Promise<void>` in `tests/e2e/helpers/select.ts`: if `await field.evaluate(e => e.tagName) === "SELECT"`, use `field.selectOption(value)`. Otherwise click `field`, then click ``page.locator(`[role="listbox"] [role="option"][data-value="${value}"]`)``. This works for both native and custom selects, so the page sweeps never need to touch `admin.spec.ts`.
- [ ] **Step 1: Write the failing tests** in `tests/e2e/select.spec.ts` (copy the `beforeEach` API mock pattern from `admin.spec.ts`), on `/orders`, field `page.getByLabel("حالة الطلب",{exact:true})`:
  - `select opens, selects by click, and reaches the server`: pick `DELIVERED` via `pickOption`, and the request has `status=DELIVERED`. The trigger shows the option's label.
  - `select keyboard`: focus the trigger, press ArrowDown (opens), ArrowDown, Enter. `aria-expanded` is `false` and the value changed. Reopen and press Escape: the listbox is hidden and focus is back on the trigger.
  - `select flips up near the viewport bottom`: set the viewport to height 500, scroll the trigger to `y > 380` (via `page.evaluate` scrolling/padding), open it, and the listbox bounding box bottom ≤ trigger box top.
  - `trigger keeps its height`: set the viewport width to 375, pick the option with the longest label, and the trigger `boundingBox().height` equals 48 and its label element has computed `text-overflow: ellipsis`.
  - (The "Select inside Modal" test lives in Task 6, because the first modal containing a select is created in sweep 5d.)
- [ ] **Step 2: Update** `admin.spec.ts` 142/145/277 to `await pickOption(page, page.getByRole("combobox",{name:"المتجر"}), "1")` etc.
- [ ] **Step 3: Run** `npm run build && npx playwright test select.spec.ts`. Expect FAIL.
- [ ] **Step 4: Implement** `useFloating`, `Select`, `Modal`, then migrate the 3 dialogs and the orders status filter.
- [ ] **Step 5: Run** `npm run typecheck && npm run lint && npm run build && npm test`. Expect PASS (all e2e, including the 3 updated lines that still hit native selects elsewhere).

---

### Task 4: Shell — sidebar, top bar, nav counts, login, system pages

**Files:**
- Modify: `src/config/nav.ts`, `src/components/layout/{Sidebar,SidebarLink,Topbar,AppShell,NotificationsDropdown}.tsx`, `src/components/pwa/PwaProvider.tsx`
- Create: `src/lib/admin/useNavCounts.ts`
- Modify: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/auth.module.css` (delete if no longer needed), `src/app/{error,loading,not-found}.tsx`
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**
- Consumes: Tasks 2–3 primitives.
- Produces:
  - `NavItem { href: string; label: string; icon: LucideIcon; group: NavGroup | null; countKey?: NavCountKey }`, `type NavGroup = "manage"|"monitor"|"marketing"|"settings"`, `NAV_GROUP_LABELS: Record<NavGroup,string>` = `{manage:"الإدارة", monitor:"المراقبة", marketing:"التسويق", settings:"الإعدادات والمالية"}`. Order, icons and membership exactly per §7.1. Support added: `{ href:"/support", label:t.admin.nav.support, icon:Headphones, group:"monitor", countKey:"support" }`. `getActiveNavItem` keeps its signature.
  - `type NavCountKey = "stores"|"reports"|"support"`, `useNavCounts(): Partial<Record<NavCountKey, number>>`: calls `fetchStores({page:1,limit:1,status:"PENDING"})`, `fetchReports({page:1,limit:1,status:"PENDING"})` and `fetchSupportTickets({page:1,limit:1,status:"OPEN"})` (check each function's real param names in `src/lib/admin/api.ts`), reading `pagination.total`. Polls every 45s, cancels on unmount, and drops failures silently (no toast).
  - The Topbar support `IconButton` reads `useNavCounts().support`, and the Topbar's own polling is removed. Mount `useNavCounts` once in `AppShell` and pass the counts down as props, to avoid double polling.
  - Visual spec: §7.1 (sidebar A), §7.2 (topbar), §7.3 (login). Reference mockup: `.superpowers/brainstorm/1057-1794649245/content/sidebar.html` (option A). The text spec wins on any difference. Collapsed width 76px (`w-[76px]`), expanded 264px (`w-66`), mobile drawer 288px. Keep `id="mobile-sidebar"`, all existing `aria-*`, the logout flow and the `t.nav.*` labels.
- [ ] **Step 1: Write failing tests** `tests/e2e/shell.spec.ts` (same API mock pattern; override `/admin/stores` to return `pagination.total: 3` when `status=PENDING` and `/admin/support/tickets` to return status 500):
  - `sidebar shows grouped nav`: at `/stores`, inside `getByRole("navigation")`, the texts "الإدارة", "المراقبة", "التسويق" are visible. The link "المتاجر" has `aria-current="page"`. The link to `/support` exists.
  - `nav count badge`: the "المتاجر" link contains the text "3".
  - `failing count is silent`: the "الدعم" link has no number badge, and `getByLabel("إشعارات العمليات").getByRole("alert")` has count 0.
  - `long user name truncates`: mock `/admin/me` with a 60-char name. The user button's height is unchanged (≤ 64) and the name element has `text-overflow: ellipsis`.
  - `mobile drawer`: viewport 375×812, click "فتح القائمة" (`t.nav.openMenu`), the drawer is visible, Escape closes it.
- [ ] **Step 2: Run** `npm run build && npx playwright test shell.spec.ts`. Expect FAIL.
- [ ] **Step 3: Implement** nav.ts, useNavCounts, Sidebar/SidebarLink/Topbar/AppShell/NotificationsDropdown (dropdown → `shadow-pop`, `viora-drop-in`, `rounded-2xl`), PwaProvider buttons → `Button`/`IconButton`, login/auth layout/system pages per §7.3.
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npm run build && npm test`. Expect PASS.

---

### Task 5: Page sweeps (4 parallel sub-tasks, disjoint files)

Every sub-task applies §8 to **its files only**:
- raw `<button>` → `Button`/`IconButton`. Tree rows and clickable cards keep their element but get tokens, pointer and focus styles.
- raw `<select>` → `Select`; raw `<input>`/`<textarea>` → `Input`/`SearchInput`.
- tables → `TableShell/Thead/Td/Tr` (`Tr onClick` replaces `<tr onClick>`).
- hand-built dialogs (`fixed inset-0 …`/`role="dialog"`) → `Modal`.
- page top → `PageHeader`; filter bars `flex flex-wrap gap-3`; sections `gap-6`.
- remove every hex/palette/banned weight (`npm run check:tokens` must list **none of your files**). Data swatch hex lines get `// tokens-allow`.

**Forbidden in Task 5:** editing `src/components/ui/*`, `src/app/globals.css`, `src/config/nav.ts`, `src/components/layout/*`, `tests/**`, `package.json`. If a primitive is missing a capability, **stop and report** it in your final message (Opus adds it). Do not work around it with raw markup.

**Verify (each sub-task):** `npm run typecheck` and `npx eslint <your files>` PASS, and `node scripts/check-tokens.mjs | grep -E "<your paths>"` prints nothing. Do NOT run build/e2e (parallel runs collide). Opus runs `npm run build && npm test` after all four.

- **5a: Dashboard & stores.** `src/app/(panel)/page.tsx`, `src/app/(panel)/stores/page.tsx`, `src/app/(panel)/stores/[id]/page.tsx`, `src/components/dashboard/{OperationsStats,StatCard}.tsx`, `src/components/admin/{StoresTable,StoreOrdersSection,StoreProductsSection,InfoGrid,StatusBadge,MockNotice}.tsx`. Note: the OperationsStats filters "المتجر"/"التصنيف" become `Select` with the **same labels and option values**.
- **5b: People, orders, moderation.** `src/app/(panel)/{users,users/[id],orders,reviews,reports,reports/[id],support,support/[id]}/page.tsx`, `src/components/admin/{UsersTable,OrderPromoLines,ReviewCard,ReportsTable,SupportTicketsTable}.tsx`. Keep the label "حالة الطلب" and the orders filter values.
- **5c: Catalog & marketing.** `src/app/(panel)/{categories,promo-codes,broadcasts,banners}/page.tsx`, `src/components/admin/{CategoryTree,CategoryDetailDialog,CategoryFormDialog,CategorySizesPicker,CategorySizesSummary,CategoryColorsBadge,PromoCodeFormDialog,PromoCodesTable,BroadcastsTable}.tsx`. Category/size colour swatches are data, so use `// tokens-allow`.
- **5d: Content & finance.** `src/app/(panel)/{content,finance}/page.tsx`, `src/components/admin/StaticPageEditor.tsx`. The finance page has dialogs and 3 selects, so it gets the most `Modal`/`Select` work. The content page's 19 buttons are mostly editor toolbar buttons → `IconButton` (variant `ghost`, size `sm`) with the existing `aria-label`s.

---

### Task 6: Lock-in and final verification

**Files:**
- Modify: `src/app/globals.css` (delete the legacy aliases `field-bg`, `field-label`, `placeholder`), `package.json` (`"lint": "eslint --max-warnings=0 && node scripts/check-tokens.mjs"`), any file still flagged.

- [ ] **Step 0: Select-in-Modal test** (Review Focus #1) in `tests/e2e/select.spec.ts`: on `/finance`, open the dialog that contains a `Select` (find it in `src/app/(panel)/finance/page.tsx`, mock its API data like `admin.spec.ts` does), open the Select, and the listbox is visible and on top (`document.elementFromPoint` at the listbox centre is inside the listbox). Press Escape: the listbox is hidden and `getByRole("dialog")` is still visible. Press Escape again: the dialog closes.
- [ ] **Step 1:** Remove the legacy aliases and run `npm run check:tokens`. Fix every remaining hit until it exits 0.
- [ ] **Step 2:** Wire `check:tokens` into `lint`.
- [ ] **Step 3: Run** `npm run typecheck && npm run lint && npm run build && npm test && npm run test:unit`. All PASS.
- [ ] **Step 4 (Opus):** Visual pass in the browser on every route at 1440×900 and 375×812: font, white background, sidebar A, hover and pointer on buttons and rows, select open/close, modal motion, reduced motion. Fix findings directly or in a follow-up Codex task.
