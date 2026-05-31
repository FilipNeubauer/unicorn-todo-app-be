# Habit Tracker Backend — Design Spec

## Overview

Express.js + TypeScript REST API for a habit tracking app. Two entities (Habit, HabitRecord) with full CRUD, PostgreSQL via Drizzle ORM, DAO pattern, and dtoIn validation following the BCAA assignment structure.

Location: `cloud-architecture-2/todo-app-be/`

## Data Entities

### Habit

A recurring activity the user wants to track.

| Column      | Type                                              | Constraints                    |
| ----------- | ------------------------------------------------- | ------------------------------ |
| id          | uuid                                              | PK, auto-generated            |
| name        | varchar(100)                                      | NOT NULL                       |
| description | varchar(250)                                      | nullable, default ""           |
| frequency   | enum("Daily", "Weekdays", "Weekends", "Custom days") | NOT NULL, default "Daily"   |
| customDays  | text[]                                            | nullable, used when frequency = "Custom days" |

### HabitRecord

A record indicating a habit was completed on a specific day. Each habit can have many records.

| Column  | Type         | Constraints                                   |
| ------- | ------------ | --------------------------------------------- |
| id      | uuid         | PK, auto-generated                            |
| habitId | uuid         | FK -> habit.id, NOT NULL, ON DELETE CASCADE    |
| date    | date         | NOT NULL                                      |
| note    | varchar(250) | nullable                                      |
|         | unique       | (habitId, date) — one record per habit per day |

### Relationship

Habit 1:N HabitRecord — a habit has many records, each record belongs to one habit. Deleting a habit cascades to its records.

## API Endpoints

### Habits

| Method | URL           | Description                              |
| ------ | ------------- | ---------------------------------------- |
| POST   | /habits       | Create a new habit                       |
| GET    | /habits       | List habits (offset-paginated)           |
| GET    | /habits/:id   | Get a single habit by id                 |
| PUT    | /habits/:id   | Update a habit                           |
| DELETE | /habits/:id   | Delete a habit (cascades records)        |

#### POST /habits

**dtoIn (body):**
| Key         | Type     | Required | Default  | Validation                          |
| ----------- | -------- | -------- | -------- | ----------------------------------- |
| name        | string   | yes      | —        | max 100 chars, non-empty            |
| description | string   | no       | ""       | max 250 chars                       |
| frequency   | string   | no       | "Daily"  | one of: Daily, Weekdays, Weekends, Custom days |
| customDays  | string[] | no       | []       | valid day names (Mon-Sun), required if frequency = "Custom days" |

**dtoOut:** Created habit object with generated id.

#### GET /habits

**dtoIn (query):**
| Key    | Type   | Required | Default | Validation        |
| ------ | ------ | -------- | ------- | ----------------- |
| offset | number | no       | 0       | >= 0              |
| limit  | number | no       | 20      | 1-100             |

**dtoOut:**
```json
{
  "itemList": [...],
  "pageInfo": {
    "offset": 0,
    "limit": 20,
    "total": 42
  }
}
```

#### GET /habits/:id

**dtoIn (path):** `id` (uuid, required)

**dtoOut:** Habit object.

#### PUT /habits/:id

**dtoIn (path):** `id` (uuid, required)

**dtoIn (body):**
| Key         | Type     | Required | Validation                          |
| ----------- | -------- | -------- | ----------------------------------- |
| name        | string   | no       | max 100 chars, non-empty if present |
| description | string   | no       | max 250 chars                       |
| frequency   | string   | no       | one of: Daily, Weekdays, Weekends, Custom days |
| customDays  | string[] | no       | valid day names                     |

**dtoOut:** Updated habit object.

#### DELETE /habits/:id

**dtoIn (path):** `id` (uuid, required)

**dtoOut:** `{}`

### Habit Records

| Method | URL                              | Description                          |
| ------ | -------------------------------- | ------------------------------------ |
| POST   | /habits/:habitId/records         | Create a record for a habit          |
| GET    | /habits/:habitId/records         | List records for a habit (paginated) |
| GET    | /habits/:habitId/records/:id     | Get a single record                  |
| PUT    | /habits/:habitId/records/:id     | Update a record                      |
| DELETE | /habits/:habitId/records/:id     | Delete a record                      |

#### POST /habits/:habitId/records

**dtoIn (path):** `habitId` (uuid, required — habit must exist)

**dtoIn (body):**
| Key  | Type   | Required | Validation            |
| ---- | ------ | -------- | --------------------- |
| date | string | yes      | valid YYYY-MM-DD      |
| note | string | no       | max 250 chars         |

**dtoOut:** Created record with generated id.

#### GET /habits/:habitId/records

**dtoIn (path):** `habitId` (uuid, required)

**dtoIn (query):**
| Key    | Type   | Required | Default | Validation        |
| ------ | ------ | -------- | ------- | ----------------- |
| date   | string | no       | —       | valid YYYY-MM-DD (filters to single day) |
| offset | number | no       | 0       | >= 0              |
| limit  | number | no       | 20      | 1-100             |

**dtoOut:**
```json
{
  "itemList": [...],
  "pageInfo": {
    "offset": 0,
    "limit": 20,
    "total": 15
  }
}
```

#### GET /habits/:habitId/records/:id

**dtoIn (path):** `habitId` (uuid), `id` (uuid)

**dtoOut:** HabitRecord object.

#### PUT /habits/:habitId/records/:id

**dtoIn (path):** `habitId` (uuid), `id` (uuid)

**dtoIn (body):**
| Key  | Type   | Required | Validation       |
| ---- | ------ | -------- | ---------------- |
| note | string | no       | max 250 chars    |

**dtoOut:** Updated record.

#### DELETE /habits/:habitId/records/:id

**dtoIn (path):** `habitId` (uuid), `id` (uuid)

**dtoOut:** `{}`

## dtoIn Validation Pattern

Every endpoint validates its input following the BCAA assignment structure:

1. Validate dtoIn against expected schema (type checks, required keys, value constraints)
2. Check for unsupported keys — if found, add `unsupportedKeys` warning to response
3. If validation fails, return `invalidDtoIn` error
4. Apply default values for missing optional keys

**Error format:**
```json
{
  "error": {
    "code": "invalidDtoIn",
    "message": "DtoIn is not valid.",
    "params": {
      "invalidTypeKeyMap": {},
      "invalidValueKeyMap": {},
      "missingKeyMap": {}
    }
  }
}
```

**Warning format (attached to successful response):**
```json
{
  "uuAppErrorMap": {
    "unsupportedKeys": {
      "type": "warning",
      "message": "DtoIn contains unsupported keys.",
      "params": { "unsupportedKeyList": ["extraKey1"] }
    }
  }
}
```

## DAO Layer

### HabitDao

Class wrapping all Habit database operations via Drizzle:

- `create(data)` — insert new habit, return created object
- `get(id)` — find one habit by id
- `list(offset, limit)` — return paginated habits + total count
- `update(id, data)` — update habit fields, return updated object
- `delete(id)` — delete habit by id

### HabitRecordDao

Class wrapping all HabitRecord database operations:

- `create(data)` — insert new record, return created object
- `get(id)` — find one record by id
- `listByHabit(habitId, { date?, offset, limit })` — return paginated records for a habit + total count
- `update(id, data)` — update record fields
- `delete(id)` — delete record by id

## Project Structure

```
todo-app-be/
├── docker-compose.yml          # PostgreSQL 16
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts                # Express app entry, middleware, route mounting
│   ├── db/
│   │   ├── connection.ts       # Drizzle + node-postgres connection
│   │   └── schema.ts           # Drizzle table definitions (habit, habitRecord)
│   ├── dao/
│   │   ├── HabitDao.ts         # Habit data access object
│   │   └── HabitRecordDao.ts   # HabitRecord data access object
│   ├── routes/
│   │   ├── habitRoutes.ts      # /habits/* endpoints
│   │   └── habitRecordRoutes.ts # /habits/:habitId/records/* endpoints
│   └── validation/
│       └── validator.ts        # dtoIn validation + error/warning generation
```

## Infrastructure

### Docker Compose

PostgreSQL 16 container:
- Port: 5432
- Database: `habit_tracker`
- User: `postgres`
- Password: `postgres`
- Volume for data persistence

### Tech Stack

- Node.js + Express.js
- TypeScript (strict mode)
- Drizzle ORM + drizzle-kit (migrations)
- node-postgres (pg driver)
- CORS enabled (for frontend integration)
- JSON body parser

## Verification

1. `docker compose up -d` starts PostgreSQL
2. `npm run db:push` applies Drizzle schema to database
3. `npm run dev` starts Express server
4. Test all endpoints via curl or similar:
   - Create a habit, list habits (with pagination), get by id, update, delete
   - Create records for a habit, list by habit (with date filter + pagination), update note, delete
   - Verify unsupportedKeys warning when extra fields are sent
   - Verify invalidDtoIn error when required fields are missing
