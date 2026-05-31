# FE polish + API integration — design

**Date:** 2026-05-31
**Scope:** `todo-app-fe` (Next.js 16 + React 19 + Tailwind 4)
**Goal:** Wire the FE to the existing Express/Drizzle backend at `http://localhost:3001` and apply a "modern minimal" visual polish (Linear/Vercel style). The current layout/UX is preserved exactly — only visual styling and data layer change.

---

## Context

- The FE today uses an in-memory `StoreProvider` with seed data; no HTTP calls.
- The BE exposes:
  - `GET/POST /habits`, `GET/PUT/DELETE /habits/:id` — habits CRUD, list returns `{ itemList, pageInfo }`.
  - `GET/POST /habits/:habitId/records`, `GET/PUT/DELETE /habits/:habitId/records/:id` — records CRUD. Unique on `(habitId, date)`. `note` is optional.
- IDs from BE are UUIDs.
- Visual baseline is wireframe (gray borders, no color). Target: clean monochrome with one accent color.

## Decisions (locked)

1. **Visual style:** Modern minimal (Linear/Vercel-style).
2. **API client:** Plain `fetch` wrapped in a thin typed module + React hooks. No TanStack Query / SWR.
3. **`note` field:** Not exposed in UI. Toggle stays a plain check/uncheck (POST/DELETE without note).
4. **Loading/errors:** Skeleton placeholders during initial load; toast notifications for action errors; full-page "Cannot connect" with Retry button for initial-load network failure.
5. **No new heavy dependencies.** Stock Tailwind 4 + React 19 only.

---

## Architecture

```
todo-app-fe/
  lib/
    api.ts          NEW: typed fetch wrapper, one fn per endpoint, throws ApiError
    store.ts        REWRITE: fetches data on mount, optimistic toggle, error → toast
    types.ts        small edits (note?, PageInfo, HabitInput)
    scheduling.ts   unchanged
  components/
    HabitRow.tsx           visual polish (custom checkbox, hover, badge)
    CreateHabitModal.tsx   visual polish (focus ring, chips, primary/ghost buttons)
    Calendar.tsx           visual polish (color scheme, today ring)
    Toast.tsx              NEW: bottom-right stacked, auto-dismiss
    Skeleton.tsx           NEW: pulse placeholder
  app/
    layout.tsx          sticky blurred header, design-token styles
    page.tsx            date+progress header card, polished list, skeletons
    habits/[id]/page.tsx  larger title, stat cards, polished calendar
    providers.tsx       wraps ToastProvider around StoreProvider
    globals.css         design tokens (colors, radii)
  .env.local         NEW (optional): NEXT_PUBLIC_API_URL=http://localhost:3001
```

Note on Next.js 16: per `todo-app-fe/AGENTS.md`, this is not the Next.js the model knows from training. Before writing any FE code that touches Next.js APIs (`app/`, navigation, metadata, etc.), the implementer reads relevant `node_modules/next/dist/docs/` files. Component logic in `components/` and pure helpers in `lib/` are not subject to this constraint.

---

## Visual language

### Design tokens (`globals.css`)

```css
:root {
  --background: #fafafa;
  --foreground: #0a0a0a;
  --muted: #71717a;       /* zinc-500 */
  --border: #e4e4e7;      /* zinc-200 */
  --surface: #ffffff;
  --accent: #2563eb;      /* blue-600 */
  --accent-hover: #1d4ed8;
  --success: #16a34a;
  --danger: #dc2626;
}
```

Exposed to Tailwind via `@theme inline` (Tailwind 4 native CSS-first config) so utilities like `bg-surface`, `border-border`, `text-accent`, `text-muted` work directly.

### Typography
- `Inter` (already wired) + `system-ui` fallback.
- Page title: `text-2xl font-semibold` (dashboard) / `text-3xl font-semibold` (detail).
- Section heading: `text-base font-medium`.
- Body: `text-sm`. Meta: `text-xs text-muted`.

### Shape & spacing
- Radii: `rounded-lg` (8px) on cards/modal, `rounded-md` (6px) on inputs/buttons, `rounded-full` for chips.
- Card padding: `p-4` to `p-6`.
- Borders: all `border-[#999]` / `border-[#ccc]` replaced with `border-border`.

### Micro-interactions
- Cards: `shadow-sm`, on hover `shadow-md`. Transitions `transition-colors duration-150` on interactive elements.
- Custom checkbox: `<button>` 20×20 px, `border-2`; checked → `bg-success border-success` + inline SVG ✓.
- Modal: backdrop `bg-black/40 backdrop-blur-sm`; card `animate-in fade-in zoom-in-95 duration-150`.
- Toast: slide-in from right, 3500 ms auto-dismiss, manual close (`×`).
- Skeleton: Tailwind `animate-pulse` on muted boxes.

### Iconography
No icon library. Use plain glyphs: `+`, `×`, `←`, inline SVG `✓`, and a single emoji 🔥 next to the streak count.

---

## API integration

### `lib/api.ts`

Single module, one function per endpoint, typed inputs/outputs. Base URL from `process.env.NEXT_PUBLIC_API_URL`, fallback `http://localhost:3001`.

```ts
class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T>;

export const habitsApi = {
  list: () => request<ListResult<Habit>>("/habits?limit=100"),
  get: (id) => request<Habit>(`/habits/${id}`),
  create: (data: HabitInput) => request<Habit>(`/habits`, { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request<Habit>(`/habits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request<{}>(`/habits/${id}`, { method: "DELETE" }),
};

export const recordsApi = {
  listByHabit: (habitId) => request<ListResult<HabitRecord>>(`/habits/${habitId}/records?limit=100`),
  create: (habitId, date) => request<HabitRecord>(`/habits/${habitId}/records`, { method: "POST", body: JSON.stringify({ date }) }),
  delete: (habitId, recordId) => request<{}>(`/habits/${habitId}/records/${recordId}`, { method: "DELETE" }),
};
```

`request` parses JSON, on `!res.ok` reads `body.error.{code, message}` from the BE error envelope and throws `ApiError`. Network failure (fetch reject) is rethrown as `ApiError("networkError", ..., 0)`.

### `lib/store.ts` (rewrite)

State shape:
```ts
{ habits: Habit[]; records: HabitRecord[]; loading: boolean; loadError: ApiError | null }
```

- **Mount:** call `habitsApi.list()`, then for each returned habit call `recordsApi.listByHabit(habit.id)` in parallel via `Promise.all`. Flatten records into a single array. Set `loading=false`. On any failure during initial load set `loadError` (no toast — page-level state instead).
- **`refetch()`:** same as mount, exposed for the Retry button.
- **`addHabit(input)`:** `habitsApi.create` → append result to state. Error → toast `"Could not create habit"`.
- **`toggleRecord(habitId, date)`:**
  - Find existing record by `(habitId, date)`.
  - **If exists:** optimistically remove from state → `recordsApi.delete(habitId, id)`. On error: re-insert the record and toast `"Could not update"`.
  - **If missing:** create local placeholder with `id="temp-<uuid>"` and add to state → `recordsApi.create(habitId, date)`. On success: replace placeholder with returned record. On error: remove placeholder and toast.
- **`deleteHabit(id)` / `updateHabit(...)`:** out of scope (BE supports it, but UI today does not expose it; YAGNI).

`StoreProvider` no longer seeds data.

### Toast system

- `components/Toast.tsx` exports:
  - `ToastProvider` — context provider holding `toasts: { id, message, kind }[]` and rendering the fixed bottom-right viewport.
  - `useToast()` hook exposing `{ show(message, kind?: "error" | "success") }`.
- `app/providers.tsx` wraps `<ToastProvider>` around `<StoreProvider>` so `useToast()` is callable from `store.ts` consumers and components.

### Loading & connection-error states

- During `loading`: dashboard renders skeleton header + 3 skeleton rows. Detail page renders skeleton stats + skeleton calendar.
- When `loadError` set: dashboard renders a centered card `"Cannot connect to the server. Make sure the API is running on <base url>."` + `Retry` button (calls `refetch()`). Detail page does the same.
- Per-action errors never block UI; they go to toast.

### Types (`lib/types.ts`)

```ts
export type Frequency = "Daily" | "Weekdays" | "Weekends" | "Custom days";
export interface Habit { id: string; name: string; description: string; frequency: Frequency; customDays: string[]; }
export interface HabitRecord { id: string; habitId: string; date: string; note?: string | null; }
export type HabitInput = Omit<Habit, "id">;
export interface PageInfo { offset: number; limit: number; total: number; }
export interface ListResult<T> { itemList: T[]; pageInfo: PageInfo; }
```

---

## Per-component changes

### `app/layout.tsx`
Sticky header `sticky top-0 z-40 bg-surface/80 backdrop-blur border-b border-border py-4`. Logo `font-semibold tracking-tight`. `<main>` keeps `max-w-3xl mx-auto px-6 py-8`.

### `app/page.tsx` (Dashboard)
- Top **header card** (replaces the bare date input):
  - Big date string e.g. `"Sunday, May 31"` (`text-2xl font-semibold`).
  - Right-aligned native `<input type="date">` for navigation, styled to match.
  - Progress row: `h-1.5 bg-border rounded-full` track with `bg-accent` fill `(completed/total)*100%`; label `"3 of 5 completed"` to the right.
- "Habits" heading + primary "Add Habit" button on the right.
- Habit list = stack of cards (one `HabitRow` each).
- Empty states: bigger padding, centered, muted text.

### `components/HabitRow.tsx`
- Card: `flex items-center gap-4 p-4 rounded-lg border border-border bg-surface hover:shadow-md transition-shadow`.
- Custom checkbox button on the left. Checked → green fill + ✓. Toggling calls `toggleRecord` (optimistic).
- Name `text-sm`, when completed: `line-through text-muted`.
- Frequency badge `text-xs px-2 py-0.5 rounded bg-border/50 text-muted`.
- "Detail" → `<Link>` styled as secondary button (`rounded-md border px-3 py-1.5 text-sm hover:bg-border/30`).

### `components/CreateHabitModal.tsx`
- Backdrop: `bg-black/40 backdrop-blur-sm`. Card: `rounded-xl shadow-xl bg-surface p-6 max-w-md w-full`.
- Inputs: `rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent`.
- Custom-day toggles as chips: `px-3 py-1 rounded-full border` + selected = `bg-accent text-white border-accent`.
- Create button = primary (`bg-accent text-white hover:bg-accent-hover`), Cancel = ghost.
- Error message in `text-xs text-danger`.

### `app/habits/[id]/page.tsx`
- Ghost back button `← Back`.
- Title `text-3xl font-semibold`, description `text-base text-muted`, frequency badge.
- Two stat cards side-by-side: each `rounded-lg border bg-surface p-4`; label `text-xs uppercase tracking-wide text-muted`; value `text-3xl font-semibold`. Streak value has 🔥 next to it.
- Calendar below.

### `components/Calendar.tsx`
- Same table structure. Cells: `aspect-square rounded-md` with no per-cell border.
- Colors:
  - Completed → `bg-success text-white font-medium`
  - Scheduled, not done → `bg-accent/10 text-accent`
  - Not scheduled → `bg-transparent text-muted/40`
  - Today → extra `ring-2 ring-accent` overlay
- Headers (Mon–Sun): `text-xs font-medium text-muted uppercase`.
- Legend below uses the same new colors.

### `components/Toast.tsx` (NEW)
- Fixed `bottom-6 right-6 z-50` stack with vertical spacing.
- Each toast: `rounded-lg shadow-lg px-4 py-3 text-sm bg-surface border-l-4` (color per kind: `border-danger`, `border-success`).
- Slide-in animation; auto-dismiss 3500 ms; manual close (`×`).

### `components/Skeleton.tsx` (NEW)
- `<div className="animate-pulse bg-border/40 rounded">` with `width`/`height` props or className.
- Dashboard initial state composes a header skeleton + 3 row skeletons.

---

## Out of scope
- Editing or deleting habits from UI (BE supports it, no current UX surface).
- Per-record `note` UI.
- Authentication.
- Dark mode.
- Pagination UI (we fetch `limit=100` which covers expected dataset).
- Tests (not requested; the BE has its own validation).

## Risks
- **Next.js 16 unknowns:** AGENTS.md flags it. Mitigate by reading relevant `node_modules/next/dist/docs/` files before touching `app/` files.
- **BE assumed running:** dev workflow assumes `cd todo-app-be && pnpm dev` + Postgres via `docker-compose up -d`. Connection-error UI covers the "BE not running" case gracefully.
- **Optimistic delete race:** if two toggles happen on the same `(habit, date)` before the first request returns, the second can see an inconsistent state. Acceptable for a personal habit-tracker scale; not mitigated.
