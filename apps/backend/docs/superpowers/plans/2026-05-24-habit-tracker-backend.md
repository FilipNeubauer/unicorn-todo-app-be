# Habit Tracker Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a RESTful Express.js + TypeScript backend for a habit tracking app with two entities (Habit, HabitRecord), PostgreSQL via Drizzle ORM, DAO pattern, and dtoIn validation.

**Architecture:** Layered architecture — Drizzle schema defines tables, DAO classes wrap all DB access, Express routes handle HTTP + validation. A shared `validator.ts` implements the assignment's dtoIn validation pattern (unsupportedKeys warning, invalidDtoIn error). PostgreSQL runs in Docker.

**Tech Stack:** Node.js, Express.js, TypeScript, Drizzle ORM, node-postgres (pg), PostgreSQL 16 (Docker Compose), tsx (dev runner)

---

## File Structure

```
todo-app-be/
├── docker-compose.yml          # PostgreSQL 16
├── .env                        # DB connection string
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts                # Express app entry, middleware, route mounting
│   ├── db/
│   │   ├── connection.ts       # Drizzle + pg pool
│   │   └── schema.ts           # Drizzle table definitions
│   ├── dao/
│   │   ├── HabitDao.ts         # Habit CRUD operations
│   │   └── HabitRecordDao.ts   # HabitRecord CRUD operations
│   ├── routes/
│   │   ├── habitRoutes.ts      # /habits endpoints
│   │   └── habitRecordRoutes.ts # /habits/:habitId/records endpoints
│   └── validation/
│       └── validator.ts        # dtoIn validation + error/warning generation
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `docker-compose.yml`
- Create: `.env`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `drizzle.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: habit_tracker
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Create `.env`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/habit_tracker
PORT=3001
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 4: Initialize npm and install dependencies**

Run:
```bash
cd cloud-architecture-2/todo-app-be
npm init -y
npm install express drizzle-orm pg dotenv cors
npm install -D typescript @types/express @types/pg @types/cors @types/node drizzle-kit tsx
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 7: Add scripts to `package.json`**

Add to the `"scripts"` section:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate"
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env .gitignore package.json package-lock.json tsconfig.json drizzle.config.ts
git commit -m "chore: scaffold project with Docker, TypeScript, Drizzle config"
```

---

### Task 2: Database Schema

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/connection.ts`

- [ ] **Step 1: Create `src/db/schema.ts`**

```typescript
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const frequencyEnum = pgEnum("frequency", [
  "Daily",
  "Weekdays",
  "Weekends",
  "Custom days",
]);

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 250 }).notNull().default(""),
  frequency: frequencyEnum("frequency").notNull().default("Daily"),
  customDays: text("custom_days").array().notNull().default([]),
});

export const habitRecords = pgTable(
  "habit_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    note: varchar("note", { length: 250 }),
  },
  (table) => [
    uniqueIndex("habit_records_habit_id_date_idx").on(table.habitId, table.date),
  ]
);

export const habitsRelations = relations(habits, ({ many }) => ({
  records: many(habitRecords),
}));

export const habitRecordsRelations = relations(habitRecords, ({ one }) => ({
  habit: one(habits, {
    fields: [habitRecords.habitId],
    references: [habits.id],
  }),
}));
```

- [ ] **Step 2: Create `src/db/connection.ts`**

```typescript
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

- [ ] **Step 3: Start PostgreSQL and push schema**

Run:
```bash
docker compose up -d
npm run db:push
```

Expected: Tables `habits` and `habit_records` created in `habit_tracker` database. The `frequency` enum type is created. A unique index on `(habit_id, date)` exists on `habit_records`.

- [ ] **Step 4: Commit**

```bash
git add src/db/
git commit -m "feat: add Drizzle schema for habits and habit_records tables"
```

---

### Task 3: dtoIn Validator

**Files:**
- Create: `src/validation/validator.ts`

- [ ] **Step 1: Create `src/validation/validator.ts`**

This module provides a `validateDtoIn` function that checks a request body/query against a schema definition and returns either an error or a validated object + warnings.

```typescript
interface FieldDef {
  type: "string" | "number" | "array";
  required?: boolean;
  default?: unknown;
  maxLength?: number;
  enum?: string[];
  itemType?: string;
}

type DtoInSchema = Record<string, FieldDef>;

interface ValidationError {
  code: string;
  message: string;
  params: {
    invalidTypeKeyMap: Record<string, string>;
    invalidValueKeyMap: Record<string, string>;
    missingKeyMap: Record<string, string>;
  };
}

interface UnsupportedKeysWarning {
  type: "warning";
  message: string;
  params: { unsupportedKeyList: string[] };
}

interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
  dtoIn: Record<string, unknown>;
  uuAppErrorMap: Record<string, UnsupportedKeysWarning>;
}

export function validateDtoIn(
  input: Record<string, unknown>,
  schema: DtoInSchema
): ValidationResult {
  const allowedKeys = new Set(Object.keys(schema));
  const inputKeys = Object.keys(input);
  const uuAppErrorMap: Record<string, UnsupportedKeysWarning> = {};
  const invalidTypeKeyMap: Record<string, string> = {};
  const invalidValueKeyMap: Record<string, string> = {};
  const missingKeyMap: Record<string, string> = {};

  // Check for unsupported keys
  const unsupportedKeys = inputKeys.filter((k) => !allowedKeys.has(k));
  if (unsupportedKeys.length > 0) {
    uuAppErrorMap["unsupportedKeys"] = {
      type: "warning",
      message: "DtoIn contains unsupported keys.",
      params: { unsupportedKeyList: unsupportedKeys },
    };
  }

  // Build validated dtoIn with defaults
  const dtoIn: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    const value = input[key];

    // Check required
    if (value === undefined || value === null) {
      if (def.required) {
        missingKeyMap[key] = `Key '${key}' is required.`;
      } else if (def.default !== undefined) {
        dtoIn[key] = def.default;
      }
      continue;
    }

    // Check type
    if (def.type === "string" && typeof value !== "string") {
      invalidTypeKeyMap[key] = `Expected string, got ${typeof value}.`;
      continue;
    }
    if (def.type === "number" && typeof value !== "number") {
      invalidTypeKeyMap[key] = `Expected number, got ${typeof value}.`;
      continue;
    }
    if (def.type === "array" && !Array.isArray(value)) {
      invalidTypeKeyMap[key] = `Expected array, got ${typeof value}.`;
      continue;
    }

    // Check value constraints
    if (def.type === "string" && typeof value === "string") {
      if (def.maxLength && value.length > def.maxLength) {
        invalidValueKeyMap[key] = `Max length is ${def.maxLength}.`;
        continue;
      }
      if (def.enum && !def.enum.includes(value)) {
        invalidValueKeyMap[key] = `Must be one of: ${def.enum.join(", ")}.`;
        continue;
      }
      if (def.required && value.trim() === "") {
        invalidValueKeyMap[key] = `Must not be empty.`;
        continue;
      }
    }

    if (def.type === "array" && Array.isArray(value)) {
      if (def.itemType === "string" && value.some((v) => typeof v !== "string")) {
        invalidTypeKeyMap[key] = `All array items must be strings.`;
        continue;
      }
      if (def.enum) {
        const invalid = value.filter((v: string) => !def.enum!.includes(v));
        if (invalid.length > 0) {
          invalidValueKeyMap[key] = `Invalid values: ${invalid.join(", ")}. Must be one of: ${def.enum.join(", ")}.`;
          continue;
        }
      }
    }

    dtoIn[key] = value;
  }

  const hasErrors =
    Object.keys(invalidTypeKeyMap).length > 0 ||
    Object.keys(invalidValueKeyMap).length > 0 ||
    Object.keys(missingKeyMap).length > 0;

  if (hasErrors) {
    return {
      valid: false,
      error: {
        code: "invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { invalidTypeKeyMap, invalidValueKeyMap, missingKeyMap },
      },
      dtoIn,
      uuAppErrorMap,
    };
  }

  return { valid: true, dtoIn, uuAppErrorMap };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/validation/
git commit -m "feat: add dtoIn validation with unsupportedKeys and invalidDtoIn errors"
```

---

### Task 4: HabitDao

**Files:**
- Create: `src/dao/HabitDao.ts`

- [ ] **Step 1: Create `src/dao/HabitDao.ts`**

```typescript
import { eq, count } from "drizzle-orm";
import { db } from "../db/connection";
import { habits } from "../db/schema";

export class HabitDao {
  async create(data: {
    name: string;
    description?: string;
    frequency?: string;
    customDays?: string[];
  }) {
    const rows = await db
      .insert(habits)
      .values({
        name: data.name,
        description: data.description ?? "",
        frequency: data.frequency as any,
        customDays: data.customDays ?? [],
      })
      .returning();
    return rows[0];
  }

  async get(id: string) {
    const rows = await db
      .select()
      .from(habits)
      .where(eq(habits.id, id));
    return rows[0] ?? null;
  }

  async list(offset: number, limit: number) {
    const [items, totalResult] = await Promise.all([
      db.select().from(habits).offset(offset).limit(limit),
      db.select({ count: count() }).from(habits),
    ]);
    return {
      itemList: items,
      pageInfo: { offset, limit, total: totalResult[0].count },
    };
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      frequency: string;
      customDays: string[];
    }>
  ) {
    const setData: Record<string, unknown> = {};
    if (data.name !== undefined) setData.name = data.name;
    if (data.description !== undefined) setData.description = data.description;
    if (data.frequency !== undefined) setData.frequency = data.frequency;
    if (data.customDays !== undefined) setData.customDays = data.customDays;

    const rows = await db
      .update(habits)
      .set(setData as any)
      .where(eq(habits.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string) {
    await db.delete(habits).where(eq(habits.id, id));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/dao/HabitDao.ts
git commit -m "feat: add HabitDao with CRUD operations"
```

---

### Task 5: HabitRecordDao

**Files:**
- Create: `src/dao/HabitRecordDao.ts`

- [ ] **Step 1: Create `src/dao/HabitRecordDao.ts`**

```typescript
import { eq, and, count } from "drizzle-orm";
import { db } from "../db/connection";
import { habitRecords } from "../db/schema";

export class HabitRecordDao {
  async create(data: { habitId: string; date: string; note?: string }) {
    const rows = await db
      .insert(habitRecords)
      .values({
        habitId: data.habitId,
        date: data.date,
        note: data.note ?? null,
      })
      .returning();
    return rows[0];
  }

  async get(id: string) {
    const rows = await db
      .select()
      .from(habitRecords)
      .where(eq(habitRecords.id, id));
    return rows[0] ?? null;
  }

  async listByHabit(
    habitId: string,
    options: { date?: string; offset: number; limit: number }
  ) {
    const conditions = [eq(habitRecords.habitId, habitId)];
    if (options.date) {
      conditions.push(eq(habitRecords.date, options.date));
    }
    const whereClause = and(...conditions);

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(habitRecords)
        .where(whereClause)
        .offset(options.offset)
        .limit(options.limit),
      db
        .select({ count: count() })
        .from(habitRecords)
        .where(whereClause),
    ]);

    return {
      itemList: items,
      pageInfo: {
        offset: options.offset,
        limit: options.limit,
        total: totalResult[0].count,
      },
    };
  }

  async update(id: string, data: Partial<{ note: string }>) {
    const setData: Record<string, unknown> = {};
    if (data.note !== undefined) setData.note = data.note;

    const rows = await db
      .update(habitRecords)
      .set(setData as any)
      .where(eq(habitRecords.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string) {
    await db.delete(habitRecords).where(eq(habitRecords.id, id));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/dao/HabitRecordDao.ts
git commit -m "feat: add HabitRecordDao with CRUD and listByHabit"
```

---

### Task 6: Habit Routes

**Files:**
- Create: `src/routes/habitRoutes.ts`

- [ ] **Step 1: Create `src/routes/habitRoutes.ts`**

```typescript
import { Router, Request, Response } from "express";
import { HabitDao } from "../dao/HabitDao";
import { validateDtoIn } from "../validation/validator";

const router = Router();
const habitDao = new HabitDao();

const VALID_FREQUENCIES = ["Daily", "Weekdays", "Weekends", "Custom days"];
const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// POST /habits
router.post("/", async (req: Request, res: Response) => {
  const result = validateDtoIn(req.body, {
    name: { type: "string", required: true, maxLength: 100 },
    description: { type: "string", maxLength: 250, default: "" },
    frequency: {
      type: "string",
      enum: VALID_FREQUENCIES,
      default: "Daily",
    },
    customDays: {
      type: "array",
      itemType: "string",
      enum: VALID_DAYS,
      default: [],
    },
  });

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const habit = await habitDao.create(result.dtoIn as any);
  res.status(201).json({ ...habit, uuAppErrorMap: result.uuAppErrorMap });
});

// GET /habits
router.get("/", async (req: Request, res: Response) => {
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const data = await habitDao.list(offset, limit);
  res.json(data);
});

// GET /habits/:id
router.get("/:id", async (req: Request, res: Response) => {
  const habit = await habitDao.get(req.params.id);
  if (!habit) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }
  res.json(habit);
});

// PUT /habits/:id
router.put("/:id", async (req: Request, res: Response) => {
  const existing = await habitDao.get(req.params.id);
  if (!existing) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  const result = validateDtoIn(req.body, {
    name: { type: "string", maxLength: 100 },
    description: { type: "string", maxLength: 250 },
    frequency: { type: "string", enum: VALID_FREQUENCIES },
    customDays: { type: "array", itemType: "string", enum: VALID_DAYS },
  });

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const updated = await habitDao.update(req.params.id, result.dtoIn as any);
  res.json({ ...updated, uuAppErrorMap: result.uuAppErrorMap });
});

// DELETE /habits/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await habitDao.get(req.params.id);
  if (!existing) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  await habitDao.delete(req.params.id);
  res.json({});
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/habitRoutes.ts
git commit -m "feat: add habit CRUD routes with dtoIn validation"
```

---

### Task 7: HabitRecord Routes

**Files:**
- Create: `src/routes/habitRecordRoutes.ts`

- [ ] **Step 1: Create `src/routes/habitRecordRoutes.ts`**

```typescript
import { Router, Request, Response } from "express";
import { HabitRecordDao } from "../dao/HabitRecordDao";
import { HabitDao } from "../dao/HabitDao";
import { validateDtoIn } from "../validation/validator";

const router = Router({ mergeParams: true });
const habitRecordDao = new HabitRecordDao();
const habitDao = new HabitDao();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// POST /habits/:habitId/records
router.post("/", async (req: Request, res: Response) => {
  const habit = await habitDao.get(req.params.habitId);
  if (!habit) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  const result = validateDtoIn(req.body, {
    date: { type: "string", required: true },
    note: { type: "string", maxLength: 250 },
  });

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  // Validate date format separately
  if (!DATE_REGEX.test(result.dtoIn.date as string)) {
    res.status(400).json({
      error: {
        code: "invalidDtoIn",
        message: "DtoIn is not valid.",
        params: {
          invalidTypeKeyMap: {},
          invalidValueKeyMap: { date: "Must be in YYYY-MM-DD format." },
          missingKeyMap: {},
        },
      },
    });
    return;
  }

  const record = await habitRecordDao.create({
    habitId: req.params.habitId,
    date: result.dtoIn.date as string,
    note: result.dtoIn.note as string | undefined,
  });
  res.status(201).json({ ...record, uuAppErrorMap: result.uuAppErrorMap });
});

// GET /habits/:habitId/records
router.get("/", async (req: Request, res: Response) => {
  const habit = await habitDao.get(req.params.habitId);
  if (!habit) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const date = req.query.date as string | undefined;

  if (date && !DATE_REGEX.test(date)) {
    res.status(400).json({
      error: {
        code: "invalidDtoIn",
        message: "DtoIn is not valid.",
        params: {
          invalidTypeKeyMap: {},
          invalidValueKeyMap: { date: "Must be in YYYY-MM-DD format." },
          missingKeyMap: {},
        },
      },
    });
    return;
  }

  const data = await habitRecordDao.listByHabit(req.params.habitId, {
    date,
    offset,
    limit,
  });
  res.json(data);
});

// GET /habits/:habitId/records/:id
router.get("/:id", async (req: Request, res: Response) => {
  const record = await habitRecordDao.get(req.params.id);
  if (!record || record.habitId !== req.params.habitId) {
    res.status(404).json({
      error: {
        code: "habitRecordNotFound",
        message: "Habit record not found.",
      },
    });
    return;
  }
  res.json(record);
});

// PUT /habits/:habitId/records/:id
router.put("/:id", async (req: Request, res: Response) => {
  const record = await habitRecordDao.get(req.params.id);
  if (!record || record.habitId !== req.params.habitId) {
    res.status(404).json({
      error: {
        code: "habitRecordNotFound",
        message: "Habit record not found.",
      },
    });
    return;
  }

  const result = validateDtoIn(req.body, {
    note: { type: "string", maxLength: 250 },
  });

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const updated = await habitRecordDao.update(req.params.id, result.dtoIn as any);
  res.json({ ...updated, uuAppErrorMap: result.uuAppErrorMap });
});

// DELETE /habits/:habitId/records/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const record = await habitRecordDao.get(req.params.id);
  if (!record || record.habitId !== req.params.habitId) {
    res.status(404).json({
      error: {
        code: "habitRecordNotFound",
        message: "Habit record not found.",
      },
    });
    return;
  }

  await habitRecordDao.delete(req.params.id);
  res.json({});
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/habitRecordRoutes.ts
git commit -m "feat: add habitRecord CRUD routes nested under /habits/:habitId/records"
```

---

### Task 8: Express App Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/index.ts`**

```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";
import habitRoutes from "./routes/habitRoutes";
import habitRecordRoutes from "./routes/habitRecordRoutes";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/habits", habitRoutes);
app.use("/habits/:habitId/records", habitRecordRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Start the dev server and verify**

Run:
```bash
docker compose up -d
npm run db:push
npm run dev
```

Expected: Server starts on port 3001, PostgreSQL is running, schema is applied.

- [ ] **Step 3: Smoke test with curl**

Run these to verify the endpoints work:

```bash
# Create a habit
curl -s -X POST http://localhost:3001/habits \
  -H "Content-Type: application/json" \
  -d '{"name":"Morning Run","frequency":"Daily"}' | jq .

# List habits
curl -s http://localhost:3001/habits | jq .

# Get habit by id (use the id from the create response)
curl -s http://localhost:3001/habits/<ID> | jq .

# Update habit
curl -s -X PUT http://localhost:3001/habits/<ID> \
  -H "Content-Type: application/json" \
  -d '{"description":"Run 5km every morning"}' | jq .

# Create a record
curl -s -X POST http://localhost:3001/habits/<ID>/records \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-24","note":"Felt great"}' | jq .

# List records
curl -s http://localhost:3001/habits/<ID>/records | jq .

# Test unsupported keys warning
curl -s -X POST http://localhost:3001/habits \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","bogusKey":"value"}' | jq .

# Test invalidDtoIn error (missing required name)
curl -s -X POST http://localhost:3001/habits \
  -H "Content-Type: application/json" \
  -d '{"frequency":"Daily"}' | jq .

# Delete habit
curl -s -X DELETE http://localhost:3001/habits/<ID> | jq .
```

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Express app entry point with all routes mounted"
```
