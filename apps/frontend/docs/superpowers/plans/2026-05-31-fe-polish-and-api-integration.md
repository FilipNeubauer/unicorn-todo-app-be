# FE polish + API integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Next.js 16 FE to the existing Express/Drizzle backend at `http://localhost:3001` and apply a "modern minimal" visual polish (Linear/Vercel-style). Layout/UX is preserved exactly; only the data layer and styling change.

**Architecture:** A thin typed `fetch` wrapper (`lib/api.ts`) replaces the in-memory store. `StoreProvider` becomes a real-data store that fetches on mount, does optimistic toggles, and reports errors via a new `ToastProvider`. All visual changes are driven by CSS design tokens declared via Tailwind 4's `@theme inline` directive — components reference utilities like `bg-surface`, `border-border`, `text-accent`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript. No new runtime dependencies.

**Spec:** [`../specs/2026-05-31-fe-polish-and-api-integration-design.md`](../specs/2026-05-31-fe-polish-and-api-integration-design.md)

**Important notes for the implementer:**
- This Next.js version is 16 and has breaking changes from prior versions. Per `todo-app-fe/AGENTS.md`, before editing any file under `app/` you MUST read the relevant guide in `node_modules/next/dist/docs/01-app/` (Task 1 lists which files).
- This repository's parent workspace is not a git repo at the root and the user has a standing rule "Never create git commits unless explicitly asked to." This plan therefore uses **Checkpoint** markers in place of commit steps. Do not run `git commit`.
- No automated tests are in scope. Each task ends with a manual verification step (load the page, check the behavior).
- The BE must be running for end-to-end verification: `cd ../todo-app-be && pnpm dev` (with Postgres up via `docker-compose up -d`).

---

## File map

**New files:**
- `todo-app-fe/lib/api.ts` — typed fetch wrapper, one function per BE endpoint.
- `todo-app-fe/components/Toast.tsx` — `ToastProvider`, `useToast`, viewport.
- `todo-app-fe/components/Skeleton.tsx` — pulse placeholder primitive.
- `todo-app-fe/.env.local` — `NEXT_PUBLIC_API_URL` (optional; api.ts falls back).

**Modified files:**
- `todo-app-fe/app/globals.css` — design tokens via `@theme inline`.
- `todo-app-fe/lib/types.ts` — `note?`, `PageInfo`, `HabitInput`, `ListResult`.
- `todo-app-fe/lib/store.ts` — full rewrite: fetch on mount, optimistic toggle, error → toast.
- `todo-app-fe/app/providers.tsx` — wrap `<ToastProvider>` around `<StoreProvider>`.
- `todo-app-fe/app/layout.tsx` — sticky blurred header, token-based styling.
- `todo-app-fe/app/page.tsx` — header card with date + progress bar; skeleton + error states.
- `todo-app-fe/app/habits/[id]/page.tsx` — larger title, stat cards, skeleton + error states.
- `todo-app-fe/components/HabitRow.tsx` — card, custom checkbox, badge, hover shadow.
- `todo-app-fe/components/CreateHabitModal.tsx` — backdrop blur, focus ring, chip toggles, primary/ghost buttons.
- `todo-app-fe/components/Calendar.tsx` — token colors, today ring, no per-cell borders.

**Unchanged:** `lib/scheduling.ts`.

---

## Task 1: Read Next.js 16 + Tailwind 4 reference docs

**Files:** none modified.

- [ ] **Step 1: List docs for the file conventions we touch.**

Run:
```bash
ls todo-app-fe/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
```
Expected: a directory containing `layout.md`, `page.md`, `metadata/`, etc.

- [ ] **Step 2: Read the four files this plan touches.**

Read each, in order:
- `todo-app-fe/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md` — for `app/layout.tsx`.
- `todo-app-fe/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` — for `app/page.tsx` and `app/habits/[id]/page.tsx`.
- `todo-app-fe/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md` — used by the detail page for `Back`.
- `todo-app-fe/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-params.md` — used by the detail page for `id`.

For each file, note any breaking change vs. earlier versions you remember (param shapes, async metadata, default exports, "use client" requirements). If `useParams` or `useRouter` now returns a Promise or behaves differently, **adapt the code in later tasks accordingly**.

- [ ] **Step 3: Confirm Tailwind 4 `@theme inline` syntax.**

Read the first 30 lines of `todo-app-fe/node_modules/tailwindcss/theme.css` to confirm the `@theme { --color-... }` token pattern. Verify that custom `--color-<name>: ...` tokens become available as `bg-<name>`, `text-<name>`, `border-<name>` utilities.

- [ ] **Step 4: Checkpoint.**

No code changes. Carry forward any adjustments needed for `useRouter`/`useParams`/`metadata` shapes into Tasks 9, 10, and 14.

---

## Task 2: Add design tokens to `globals.css`

**Files:**
- Modify: `todo-app-fe/app/globals.css`

- [ ] **Step 1: Replace the file contents with token-based theme.**

```css
@import "tailwindcss";

@theme inline {
  --color-background: #fafafa;
  --color-foreground: #0a0a0a;
  --color-muted: #71717a;
  --color-border: #e4e4e7;
  --color-surface: #ffffff;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-success: #16a34a;
  --color-danger: #dc2626;
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: "Inter", system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 2: Verify Tailwind picks up the tokens.**

Run:
```bash
cd todo-app-fe && pnpm dev
```
(or `npm run dev` — the project has `package-lock.json`, so use `npm`).

Wait for the "Ready in..." message. Open `http://localhost:3000` in a browser. Confirm the page still renders (no Tailwind compile error in the terminal).

- [ ] **Step 3: Checkpoint.**

Stop the dev server (Ctrl-C). Design tokens are now usable as `bg-surface`, `text-accent`, `border-border`, etc., in subsequent tasks.

---

## Task 3: Update types

**Files:**
- Modify: `todo-app-fe/lib/types.ts`

- [ ] **Step 1: Replace file contents.**

```ts
export type Frequency = "Daily" | "Weekdays" | "Weekends" | "Custom days";

export interface Habit {
  id: string;
  name: string;
  description: string;
  frequency: Frequency;
  customDays: string[];
}

export interface HabitRecord {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  note?: string | null;
}

export type HabitInput = Omit<Habit, "id">;

export interface PageInfo {
  offset: number;
  limit: number;
  total: number;
}

export interface ListResult<T> {
  itemList: T[];
  pageInfo: PageInfo;
}
```

- [ ] **Step 2: TypeScript sanity check.**

Run:
```bash
cd todo-app-fe && npx tsc --noEmit
```
Expected: clean (or only pre-existing errors unrelated to types.ts).

- [ ] **Step 3: Checkpoint.** Types ready for `api.ts` and `store.ts`.

---

## Task 4: Create `lib/api.ts`

**Files:**
- Create: `todo-app-fe/lib/api.ts`

- [ ] **Step 1: Write the file.**

```ts
import type { Habit, HabitInput, HabitRecord, ListResult } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new ApiError(
      "networkError",
      e instanceof Error ? e.message : "Network error",
      0,
    );
  }

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string } } = {};
    try {
      body = await res.json();
    } catch {
      // empty/invalid body
    }
    throw new ApiError(
      body?.error?.code ?? "unknown",
      body?.error?.message ?? res.statusText,
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

export const habitsApi = {
  list: () => request<ListResult<Habit>>("/habits?limit=100"),
  get: (id: string) => request<Habit>(`/habits/${id}`),
  create: (data: HabitInput) =>
    request<Habit>("/habits", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<HabitInput>) =>
    request<Habit>(`/habits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<Record<string, never>>(`/habits/${id}`, { method: "DELETE" }),
};

export const recordsApi = {
  listByHabit: (habitId: string) =>
    request<ListResult<HabitRecord>>(
      `/habits/${habitId}/records?limit=100`,
    ),
  create: (habitId: string, date: string) =>
    request<HabitRecord>(`/habits/${habitId}/records`, {
      method: "POST",
      body: JSON.stringify({ date }),
    }),
  delete: (habitId: string, recordId: string) =>
    request<Record<string, never>>(
      `/habits/${habitId}/records/${recordId}`,
      { method: "DELETE" },
    ),
};

export function getApiBaseUrl(): string {
  return BASE_URL;
}
```

- [ ] **Step 2: TypeScript check.**

```bash
cd todo-app-fe && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Checkpoint.** API client ready.

---

## Task 5: Create `components/Skeleton.tsx`

**Files:**
- Create: `todo-app-fe/components/Skeleton.tsx`

- [ ] **Step 1: Write the file.**

```tsx
interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-border/60 ${className}`}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Checkpoint.** Skeleton primitive ready.

---

## Task 6: Create `components/Toast.tsx` (provider + viewport + hook)

**Files:**
- Create: `todo-app-fe/components/Toast.tsx`

- [ ] **Step 1: Write the file.**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "error" | "success";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "error") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => remove(id), DISMISS_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border-l-4 bg-surface px-4 py-3 text-sm shadow-lg ${
              t.kind === "error" ? "border-danger" : "border-success"
            }`}
            role="status"
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="text-muted hover:text-foreground"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
```

- [ ] **Step 2: Checkpoint.** Toast system ready, but not yet wired in.

---

## Task 7: Wire `ToastProvider` into `app/providers.tsx`

**Files:**
- Modify: `todo-app-fe/app/providers.tsx`

- [ ] **Step 1: Read current file to confirm shape.**

Run: `cat todo-app-fe/app/providers.tsx` (via Read tool).

- [ ] **Step 2: Replace contents.**

```tsx
"use client";

import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <StoreProvider>{children}</StoreProvider>
    </ToastProvider>
  );
}
```

`ToastProvider` wraps `StoreProvider` so that the rewritten `StoreProvider` (Task 8) can call `useToast()` inside its component body.

- [ ] **Step 3: TypeScript check.**

```bash
cd todo-app-fe && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Checkpoint.**

---

## Task 8: Rewrite `lib/store.ts` (real data + optimistic toggle + errors via toast)

**Files:**
- Modify: `todo-app-fe/lib/store.ts`

- [ ] **Step 1: Replace contents.**

```tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, habitsApi, recordsApi } from "./api";
import type { Habit, HabitInput, HabitRecord } from "./types";
import { useToast } from "@/components/Toast";

interface StoreState {
  habits: Habit[];
  records: HabitRecord[];
  loading: boolean;
  loadError: ApiError | null;
}

interface StoreContextType extends StoreState {
  refetch: () => Promise<void>;
  addHabit: (habit: HabitInput) => Promise<void>;
  toggleRecord: (habitId: string, date: string) => Promise<void>;
  getHabit: (id: string) => Habit | undefined;
  getRecordsForHabit: (habitId: string) => HabitRecord[];
}

const StoreContext = createContext<StoreContextType | null>(null);

function tempId(): string {
  return `temp-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

async function fetchAll(): Promise<{
  habits: Habit[];
  records: HabitRecord[];
}> {
  const habitsRes = await habitsApi.list();
  const habits = habitsRes.itemList;
  const recordsByHabit = await Promise.all(
    habits.map((h) => recordsApi.listByHabit(h.id).then((r) => r.itemList)),
  );
  return { habits, records: recordsByHabit.flat() };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { show } = useToast();
  const [state, setState] = useState<StoreState>({
    habits: [],
    records: [],
    loading: true,
    loadError: null,
  });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, loadError: null }));
    try {
      const { habits, records } = await fetchAll();
      setState({ habits, records, loading: false, loadError: null });
    } catch (e) {
      const err =
        e instanceof ApiError
          ? e
          : new ApiError("unknown", String(e), 0);
      setState((s) => ({ ...s, loading: false, loadError: err }));
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addHabit = useCallback(
    async (input: HabitInput) => {
      try {
        const created = await habitsApi.create(input);
        setState((s) => ({ ...s, habits: [...s.habits, created] }));
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : "Could not create habit";
        show(`Could not create habit: ${msg}`, "error");
      }
    },
    [show],
  );

  const toggleRecord = useCallback(
    async (habitId: string, date: string) => {
      const existing = state.records.find(
        (r) => r.habitId === habitId && r.date === date,
      );

      if (existing) {
        // Optimistic delete
        setState((s) => ({
          ...s,
          records: s.records.filter((r) => r.id !== existing.id),
        }));
        try {
          if (!existing.id.startsWith("temp-")) {
            await recordsApi.delete(habitId, existing.id);
          }
        } catch (e) {
          // Rollback
          setState((s) => ({ ...s, records: [...s.records, existing] }));
          const msg = e instanceof ApiError ? e.message : "Could not update";
          show(`Could not update: ${msg}`, "error");
        }
      } else {
        // Optimistic create with temp id
        const placeholder: HabitRecord = {
          id: tempId(),
          habitId,
          date,
        };
        setState((s) => ({ ...s, records: [...s.records, placeholder] }));
        try {
          const created = await recordsApi.create(habitId, date);
          setState((s) => ({
            ...s,
            records: s.records.map((r) =>
              r.id === placeholder.id ? created : r,
            ),
          }));
        } catch (e) {
          // Rollback
          setState((s) => ({
            ...s,
            records: s.records.filter((r) => r.id !== placeholder.id),
          }));
          const msg = e instanceof ApiError ? e.message : "Could not update";
          show(`Could not update: ${msg}`, "error");
        }
      }
    },
    [state.records, show],
  );

  const getHabit = useCallback(
    (id: string) => state.habits.find((h) => h.id === id),
    [state.habits],
  );

  const getRecordsForHabit = useCallback(
    (habitId: string) => state.records.filter((r) => r.habitId === habitId),
    [state.records],
  );

  const value: StoreContextType = {
    ...state,
    refetch,
    addHabit,
    toggleRecord,
    getHabit,
    getRecordsForHabit,
  };

  return React.createElement(StoreContext.Provider, { value }, children);
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
```

- [ ] **Step 2: TypeScript check.**

```bash
cd todo-app-fe && npx tsc --noEmit
```
Expected: errors in `app/page.tsx` and `app/habits/[id]/page.tsx` are OK (they will be rewritten in Tasks 10 and 14). Only `lib/store.ts` and its direct deps must be clean.

- [ ] **Step 3: Checkpoint.** Data layer ready; pages will consume `loading`, `loadError`, `refetch` next.

---

## Task 9: Polish `app/layout.tsx`

**Files:**
- Modify: `todo-app-fe/app/layout.tsx`

- [ ] **Step 1: Confirm Next.js 16 layout conventions.**

From Task 1 reading, confirm:
- Default export is required.
- `metadata` export still works (synchronous).
- `children: ReactNode` prop shape unchanged.

If Next.js 16 has changed any of these, adapt accordingly.

- [ ] **Step 2: Replace file contents.**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Track daily habits and build streaks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <header className="sticky top-0 z-40 border-b border-border bg-surface/80 px-6 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-6">
              <span className="text-base font-semibold tracking-tight">
                Habit Tracker
              </span>
              <span className="text-sm text-muted">Dashboard</span>
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

Note: `Providers` moved to wrap both header and main so toast viewport renders globally.

- [ ] **Step 3: Verify.**

Start dev: `cd todo-app-fe && npm run dev`. Open `http://localhost:3000`. Expect:
- The page renders (pages themselves may show pre-rewrite content/errors — that's OK).
- Header has a thin border, sticky on scroll, blurred background.
- No console errors related to layout/providers.

Stop dev server.

- [ ] **Step 4: Checkpoint.**

---

## Task 10: Polish `app/page.tsx` (dashboard) + wire loading/error states

**Files:**
- Modify: `todo-app-fe/app/page.tsx`

- [ ] **Step 1: Replace contents.**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDate, isScheduledOn } from "@/lib/scheduling";
import { getApiBaseUrl } from "@/lib/api";
import HabitRow from "@/components/HabitRow";
import CreateHabitModal from "@/components/CreateHabitModal";
import Skeleton from "@/components/Skeleton";

export default function Dashboard() {
  const { habits, records, loading, loadError, refetch } = useStore();
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date()),
  );
  const [showModal, setShowModal] = useState(false);

  const dateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const scheduledHabits = useMemo(
    () => habits.filter((h) => isScheduledOn(h, dateObj)),
    [habits, dateObj],
  );

  const completedCount = useMemo(
    () =>
      scheduledHabits.filter((h) =>
        records.some((r) => r.habitId === h.id && r.date === selectedDate),
      ).length,
    [scheduledHabits, records, selectedDate],
  );

  const total = scheduledHabits.length;
  const progressPct = total === 0 ? 0 : (completedCount / total) * 100;

  const prettyDate = dateObj.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loadError) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
        <p className="mb-2 text-base font-medium">
          Cannot connect to the server.
        </p>
        <p className="mb-4 text-sm text-muted">
          Make sure the API is running on{" "}
          <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs">
            {getApiBaseUrl()}
          </code>
          .
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card: date + progress */}
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {prettyDate}
          </h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-muted">
            {loading ? "…" : `${completedCount} of ${total} completed`}
          </span>
        </div>
      </section>

      {/* Habits list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Habits</h2>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            + Add Habit
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : habits.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
            There are no habits yet. Create your first one.
          </div>
        ) : scheduledHabits.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
            No habits scheduled for this day.
          </div>
        ) : (
          <div className="space-y-2">
            {scheduledHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                date={selectedDate}
                completed={records.some(
                  (r) => r.habitId === habit.id && r.date === selectedDate,
                )}
              />
            ))}
          </div>
        )}
      </section>

      {showModal && <CreateHabitModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check.**

```bash
cd todo-app-fe && npx tsc --noEmit
```
Expected: only the detail page remains broken (rewritten in Task 14).

- [ ] **Step 3: Checkpoint.**

---

## Task 11: Polish `components/HabitRow.tsx`

**Files:**
- Modify: `todo-app-fe/components/HabitRow.tsx`

- [ ] **Step 1: Replace contents.**

```tsx
"use client";

import Link from "next/link";
import type { Habit } from "@/lib/types";
import { useStore } from "@/lib/store";

interface Props {
  habit: Habit;
  date: string;
  completed: boolean;
}

export default function HabitRow({ habit, date, completed }: Props) {
  const { toggleRecord } = useStore();

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => toggleRecord(habit.id, date)}
        aria-pressed={completed}
        aria-label={
          completed
            ? `Mark "${habit.name}" as not done`
            : `Mark "${habit.name}" as done`
        }
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          completed
            ? "border-success bg-success text-white"
            : "border-border bg-surface hover:border-accent"
        }`}
      >
        {completed && (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l3 3 7-7" />
          </svg>
        )}
      </button>

      <span
        className={`flex-1 text-sm ${
          completed ? "text-muted line-through" : ""
        }`}
      >
        {habit.name}
      </span>

      <span className="rounded bg-border/50 px-2 py-0.5 text-xs text-muted">
        {habit.frequency}
      </span>

      <Link
        href={`/habits/${habit.id}`}
        className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-border/30"
      >
        Detail
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Checkpoint.**

---

## Task 12: Polish `components/CreateHabitModal.tsx`

**Files:**
- Modify: `todo-app-fe/components/CreateHabitModal.tsx`

- [ ] **Step 1: Replace contents.**

```tsx
"use client";

import { useState } from "react";
import type { Frequency } from "@/lib/types";
import { useStore } from "@/lib/store";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FREQUENCIES: Frequency[] = [
  "Daily",
  "Weekdays",
  "Weekends",
  "Custom days",
];

interface Props {
  onClose: () => void;
}

export default function CreateHabitModal({ onClose }: Props) {
  const { addHabit } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Daily");
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    await addHabit({
      name: name.trim(),
      description: description.trim(),
      frequency,
      customDays: frequency === "Custom days" ? customDays : [],
    });
    setSubmitting(false);
    onClose();
  }

  function toggleDay(day: string) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create habit"
    >
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">
          Create habit
        </h2>

        <div className="mb-4">
          <label
            htmlFor="habit-name"
            className="mb-1.5 block text-sm font-medium"
          >
            Name
          </label>
          <input
            id="habit-name"
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {error && (
            <p className="mt-1 text-xs text-danger">{error}</p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="habit-description"
            className="mb-1.5 block text-sm font-medium"
          >
            Description
          </label>
          <input
            id="habit-description"
            type="text"
            maxLength={250}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="habit-frequency"
            className="mb-1.5 block text-sm font-medium"
          >
            Frequency
          </label>
          <select
            id="habit-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {frequency === "Custom days" && (
          <div className="mb-4">
            <span className="mb-1.5 block text-sm font-medium">
              Custom days
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const active = customDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-border text-muted hover:bg-border/30"
                    }`}
                    aria-pressed={active}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-muted transition-colors hover:bg-border/30"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Checkpoint.**

---

## Task 13: Polish `components/Calendar.tsx`

**Files:**
- Modify: `todo-app-fe/components/Calendar.tsx`

- [ ] **Step 1: Replace contents.**

```tsx
"use client";

import type { Habit, HabitRecord } from "@/lib/types";
import { formatDate, isScheduledOn } from "@/lib/scheduling";

interface Props {
  habit: Habit;
  records: HabitRecord[];
  year: number;
  month: number; // 0-indexed
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar({ habit, records, year, month }: Props) {
  const completedDates = new Set(records.map((r) => r.date));
  const todayStr = formatDate(new Date());

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = firstDay.toLocaleString("default", { month: "long" });

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">
        {monthName} {year}
      </h3>

      <div className="grid grid-cols-7 gap-1.5">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-medium uppercase tracking-wide text-muted"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="aspect-square" />;
          }
          const date = new Date(year, month, day);
          const dateStr = formatDate(date);
          const scheduled = isScheduledOn(habit, date);
          const completed = completedDates.has(dateStr);
          const isToday = dateStr === todayStr;

          let cls =
            "bg-transparent text-muted/40"; // not scheduled default
          if (scheduled && completed) {
            cls = "bg-success text-white font-medium";
          } else if (scheduled) {
            cls = "bg-accent/10 text-accent";
          }

          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-md text-sm ${cls} ${
                isToday ? "ring-2 ring-accent" : ""
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-success" />
          Completed
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent/10" />
          Scheduled
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border border-border bg-transparent" />
          Not scheduled
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Checkpoint.**

---

## Task 14: Polish `app/habits/[id]/page.tsx` + loading/error states

**Files:**
- Modify: `todo-app-fe/app/habits/[id]/page.tsx`

- [ ] **Step 1: Confirm `useParams`/`useRouter` behavior in Next.js 16.**

From Task 1 docs:
- If `useParams()` now returns a Promise (it sometimes does in newer Next versions), use `React.use()` on the value, or use the `params` prop on the page (typed as `Promise<{ id: string }>`).
- If `useRouter` is unchanged, keep `router.push("/")`.

Adapt the code below if `useParams()` returns a Promise. The version below assumes the sync-Map API; if that breaks at runtime, switch to the prop-based pattern:

```tsx
export default function HabitHistory({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  ...
}
```

- [ ] **Step 2: Replace contents (sync `useParams` version — adapt if Step 1 found otherwise).**

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { getStreak } from "@/lib/scheduling";
import { getApiBaseUrl } from "@/lib/api";
import Calendar from "@/components/Calendar";
import Skeleton from "@/components/Skeleton";

export default function HabitHistory() {
  const params = useParams();
  const router = useRouter();
  const {
    getHabit,
    getRecordsForHabit,
    records,
    loading,
    loadError,
    refetch,
  } = useStore();

  const habitId = params.id as string;

  const BackButton = (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="mb-6 rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-border/30"
    >
      ← Back
    </button>
  );

  if (loadError) {
    return (
      <div>
        {BackButton}
        <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
          <p className="mb-2 text-base font-medium">
            Cannot connect to the server.
          </p>
          <p className="mb-4 text-sm text-muted">
            Make sure the API is running on{" "}
            <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs">
              {getApiBaseUrl()}
            </code>
            .
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {BackButton}
        <Skeleton className="mb-3 h-8 w-1/2" />
        <Skeleton className="mb-6 h-4 w-3/4" />
        <div className="mb-6 flex gap-4">
          <Skeleton className="h-20 w-40" />
          <Skeleton className="h-20 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const habit = getHabit(habitId);

  if (!habit) {
    return (
      <div>
        {BackButton}
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
          Habit not found.
        </div>
      </div>
    );
  }

  const habitRecords = getRecordsForHabit(habitId);
  const today = new Date();
  const streak = getStreak(habit, records, today);
  const totalCompletions = habitRecords.length;

  return (
    <div>
      {BackButton}

      <h1 className="text-3xl font-semibold tracking-tight">{habit.name}</h1>
      {habit.description && (
        <p className="mt-2 text-base text-muted">{habit.description}</p>
      )}
      <span className="mt-3 inline-block rounded bg-border/50 px-2 py-0.5 text-xs text-muted">
        {habit.frequency}
      </span>

      <div className="mt-6 mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">
            Current streak
          </p>
          <p className="mt-1 text-3xl font-semibold">
            {streak} <span className="text-base font-normal text-muted">days</span>
            {streak > 0 && <span className="ml-1">🔥</span>}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">
            Total completions
          </p>
          <p className="mt-1 text-3xl font-semibold">{totalCompletions}</p>
        </div>
      </div>

      {habitRecords.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
          This habit has not been completed yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <Calendar
            habit={habit}
            records={habitRecords}
            year={today.getFullYear()}
            month={today.getMonth()}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check.**

```bash
cd todo-app-fe && npx tsc --noEmit
```
Expected: clean across the entire project.

- [ ] **Step 4: Checkpoint.**

---

## Task 15: Optional `.env.local` + end-to-end verification

**Files:**
- Create (optional): `todo-app-fe/.env.local`

- [ ] **Step 1: Create `.env.local` (skip if happy with the `http://localhost:3001` default).**

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 2: Start the backend.**

Terminal 1:
```bash
cd todo-app-be
docker-compose up -d        # only if Postgres isn't already running
pnpm dev
```
Expected: `Server running on http://localhost:3001`.

- [ ] **Step 3: Start the frontend.**

Terminal 2:
```bash
cd todo-app-fe
npm run dev
```
Expected: `Ready in ...` and an open port (usually `http://localhost:3000`).

- [ ] **Step 4: Verify the golden path in the browser.**

Open `http://localhost:3000` and confirm, one by one:

1. **Initial load:** brief skeleton, then header card with today's date and "0 of 0 completed" (or whatever seed data BE has).
2. **Add habit:** click `+ Add Habit`, fill name "Test habit", frequency "Daily", click `Create`. The modal closes; new habit appears in the list immediately; "X of Y completed" updates.
3. **Toggle complete:** click the checkbox on the new habit. It fills green with a checkmark, name gets a strike-through, progress bar grows. Reload the page — state persists (because BE saved it).
4. **Toggle uncomplete:** click the checkbox again. It empties, strike-through goes away.
5. **Detail page:** click `Detail`. You land on `/habits/<id>` with bigger title, stat cards (streak/total), and a calendar in which today is ringed.
6. **Back:** click `← Back`. Returns to dashboard.

- [ ] **Step 5: Verify error paths.**

1. Stop the BE (Ctrl-C in Terminal 1).
2. In the browser, reload. Expect the "Cannot connect to the server. Make sure the API is running on http://localhost:3001." card with a working `Retry` button.
3. Start BE again, click `Retry`. App recovers.
4. Stop BE again. From the dashboard, try to toggle a checkbox: the row flips optimistically, then flips back when the API call fails, and a toast appears bottom-right "Could not update: …".
5. Try `+ Add Habit` while BE is down: form closes (matches current spec — modal is "fire and forget" after submit). A toast "Could not create habit: …" appears.

- [ ] **Step 6: Visual sanity check.**

- Subtle hairline borders everywhere (not the previous heavy gray).
- Buttons: primary is blue with white text; secondary is bordered ghost.
- Modal: backdrop blur is visible.
- Calendar: today is ringed; completed days are filled green; scheduled-not-done are light blue.
- Toast: slides in bottom-right with a left color stripe, auto-dismisses after ~3.5s.

- [ ] **Step 7: Checkpoint — done.**

---

## Self-review summary (run by plan author before handoff)

- **Spec coverage:** Architecture (Tasks 2–8), Visual language (Task 2 tokens + every component task), API integration (Tasks 3–4, 8), Per-component changes (Tasks 9–14), Loading/error states (Tasks 8, 10, 14). Toast (Task 6). Skeleton (Task 5). Out-of-scope items (edit/delete habits, note UI, dark mode, tests, pagination UI) intentionally absent.
- **Type consistency:** `ApiError` defined in Task 4, consumed in Tasks 8/10/14. `HabitInput`, `ListResult`, `PageInfo` defined in Task 3, consumed in Task 4. `useToast`/`ToastProvider` defined in Task 6, consumed in Tasks 7/8.
- **No placeholders:** every step contains the actual code or command; no "TBD"/"similar to above".
- **Git policy honored:** no `git commit` steps; "Checkpoint" markers used instead.
