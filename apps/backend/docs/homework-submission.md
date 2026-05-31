# Backend Homework — Habit Tracker

**Git repository:** [TODO: paste your GitHub repo link here]

---

## Schema Diagram

*(Replace with uuBml Draw diagram showing habit → habitRecord relationship)*

---

## Habit

### Schema

```js
const habitSchema = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // generated unique code
  name: "Morning Run", // name of the habit
  description: "Run 5km every morning", // additional description
  frequency: "Daily", // how often: Daily, Weekdays, Weekends, Custom days
  customDays: ["Mon", "Wed", "Fri"] // specific days, used when frequency = Custom days
};
```

### DAO Method List

| Name | Description |
|------|-------------|
| create (habit) -> object | creates habit in the schema |
| get (habitId) -> object | returns habit based on id |
| list (offset, limit) -> {itemList:[object], pageInfo} | returns a paginated list of all habits |
| update (habit) -> object | updates habit in the schema |
| delete (habitId) -> void | deletes habit based on id, cascades to all associated habit records |

---

## HabitRecord

### Schema

```js
const habitRecordSchema = {
  id: "f9e8d7c6-b5a4-3210-fedc-ba9876543210", // generated unique code
  habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // habit which this record belongs to
  date: "2026-05-24", // day on which the habit was completed
  note: "Felt great today" // optional note about the completion
};
```

### DAO Method List

| Name | Description |
|------|-------------|
| create (habitRecord) -> object | creates habit record in the schema |
| get (habitRecordId) -> object | returns habit record based on id |
| listByHabit (habitId, {date?, offset, limit}) -> {itemList:[object], pageInfo} | returns a paginated list of habit records for a given habit, optionally filtered by date |
| update (habitRecord) -> object | updates habit record in the schema |
| delete (habitRecordId) -> void | deletes habit record based on id |

---

## POST /habits

### Basic Info

| | |
|---|---|
| Name | POST /habits |
| Description | Creates a new habit. |
| HTTP Method | post |
| Url | \<gateway\>/habits |

This algorithm describes POST /habits and all possible errors that can happen during this process.

### Vstup

```js
const dtoIn = {
  name: "Morning Run", // name of the habit
  description: "Run 5km every morning", // additional description
  frequency: "Daily", // how often the habit should be performed
  customDays: ["Mon", "Wed", "Fri"] // specific days, used when frequency = Custom days
};
```

### Input validation

```js
const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(250).default(""),
  frequency: z.enum(["Daily", "Weekdays", "Weekends", "Custom days"]).default("Daily"),
  customDays: z.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])).default([])
});
```

### Výstup

```js
const dtoOut = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // generated unique code
  name: "Morning Run", // name of the habit
  description: "Run 5km every morning", // additional description
  frequency: "Daily", // how often the habit should be performed
  customDays: ["Mon", "Wed", "Fri"] // specific days
};
```

### Algorithm

1. **Sequence** — Validates dtoIn using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Creates a new habit using habit DAO create.
3. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |

---

## GET /habits

### Basic Info

| | |
|---|---|
| Name | GET /habits |
| Description | Returns a paginated list of all habits. |
| HTTP Method | get |
| Url | \<gateway\>/habits |

This algorithm describes GET /habits and all possible errors that can happen during this process.

### Vstup

```js
// query parameters
const dtoIn = {
  offset: 0, // pagination offset (default 0, min 0)
  limit: 20 // number of items per page (default 20, min 1, max 100)
};
```

### Input validation

```js
const schema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
```

### Výstup

```js
const dtoOut = {
  itemList: [ // list of all habits stored in the storage
    {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // generated unique code
      name: "Morning Run", // name of the habit
      description: "Run 5km every morning", // additional description
      frequency: "Daily", // how often the habit should be performed
      customDays: [] // specific days
    }
  ],
  pageInfo: {
    offset: 0, // current offset
    limit: 20, // current limit
    total: 1 // total number of habits
  }
};
```

### Algorithm

1. **Sequence** — Validates dtoIn (query parameters) using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads all created habits using habit DAO list.
3. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |

---

## GET /habits/:id

### Basic Info

| | |
|---|---|
| Name | GET /habits/:id |
| Description | Returns a habit by its id. |
| HTTP Method | get |
| Url | \<gateway\>/habits/:id |

This algorithm describes GET /habits/:id and all possible errors that can happen during this process.

### Vstup

```js
// path parameter
const dtoIn = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" // id of the habit to retrieve
};
```

### Input validation

```js
const schema = z.object({
  id: z.string().uuid()
});
```

### Výstup

```js
const dtoOut = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // generated unique code
  name: "Morning Run", // name of the habit
  description: "Run 5km every morning", // additional description
  frequency: "Daily", // how often the habit should be performed
  customDays: ["Mon", "Wed", "Fri"] // specific days
};
```

### Algorithm

1. **Sequence** — Validates dtoIn (path parameter) using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit using habit DAO get.
3. **Sequence** — Checks that the habit exists.
   3.1. **Error** — Habit does not exist
   `habitNotFound`
   habit with given id does not exist
4. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |
| Error | habitNotFound | Habit not found. | |

---

## PUT /habits/:id

### Basic Info

| | |
|---|---|
| Name | PUT /habits/:id |
| Description | Updates an existing habit. |
| HTTP Method | put |
| Url | \<gateway\>/habits/:id |

This algorithm describes PUT /habits/:id and all possible errors that can happen during this process.

### Vstup

```js
// path parameter: id
// request body:
const dtoIn = {
  name: "Evening Run", // updated name
  description: "Run 5km every evening", // updated description
  frequency: "Weekdays" // updated frequency
};
```

### Input validation

```js
// path parameter validation
const idParamSchema = z.object({
  id: z.string().uuid()
});

// request body validation
const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(250).optional(),
  frequency: z.enum(["Daily", "Weekdays", "Weekends", "Custom days"]).optional(),
  customDays: z.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])).optional()
});
```

### Výstup

```js
const dtoOut = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // generated unique code
  name: "Evening Run", // updated name
  description: "Run 5km every evening", // updated description
  frequency: "Weekdays", // updated frequency
  customDays: [] // specific days
};
```

### Algorithm

1. **Sequence** — Validates path parameter using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit using habit DAO get.
3. **Sequence** — Checks that the habit exists.
   3.1. **Error** — Habit does not exist
   `habitNotFound`
   habit with given id does not exist
4. **Sequence** — Validates dtoIn (request body) using Zod schema.
   4.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
5. Updates the habit using habit DAO update.
6. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |
| Error | habitNotFound | Habit not found. | |

---

## DELETE /habits/:id

### Basic Info

| | |
|---|---|
| Name | DELETE /habits/:id |
| Description | Deletes a habit and all its associated records. |
| HTTP Method | delete |
| Url | \<gateway\>/habits/:id |

This algorithm describes DELETE /habits/:id and all possible errors that can happen during this process.

### Vstup

```js
// path parameter
const dtoIn = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" // id of the habit to delete
};
```

### Input validation

```js
const schema = z.object({
  id: z.string().uuid()
});
```

### Výstup

```js
const dtoOut = {};
```

### Algorithm

1. **Sequence** — Validates dtoIn (path parameter) using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit using habit DAO get.
3. **Sequence** — Checks that the habit exists.
   3.1. **Error** — Habit does not exist
   `habitNotFound`
   habit with given id does not exist
4. Deletes the habit using habit DAO delete. All associated habit records are deleted via ON DELETE CASCADE.
5. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |
| Error | habitNotFound | Habit not found. | |

---

## POST /habits/:habitId/records

### Basic Info

| | |
|---|---|
| Name | POST /habits/:habitId/records |
| Description | Creates a new habit record (marks a habit as completed on a given day). |
| HTTP Method | post |
| Url | \<gateway\>/habits/:habitId/records |

This algorithm describes POST /habits/:habitId/records and all possible errors that can happen during this process.

### Vstup

```js
// path parameter: habitId
// request body:
const dtoIn = {
  date: "2026-05-24", // day on which the habit was completed (YYYY-MM-DD)
  note: "Felt great today" // optional note about the completion
};
```

### Input validation

```js
// path parameter validation
const habitIdParamSchema = z.object({
  habitId: z.string().uuid()
});

// request body validation
const createRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(250).optional()
});
```

### Výstup

```js
const dtoOut = {
  id: "f9e8d7c6-b5a4-3210-fedc-ba9876543210", // generated unique code
  habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // habit which this record belongs to
  date: "2026-05-24", // day on which the habit was completed
  note: "Felt great today" // optional note
};
```

### Algorithm

1. **Sequence** — Validates path parameter using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit using habit DAO get.
3. **Sequence** — Checks that the habit exists.
   3.1. **Error** — Habit does not exist
   `habitNotFound`
   habit with id habitId does not exist
4. **Sequence** — Validates dtoIn (request body) using Zod schema.
   4.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
5. Creates a new habit record using habitRecord DAO create.
6. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |
| Error | habitNotFound | Habit not found. | |

---

## GET /habits/:habitId/records

### Basic Info

| | |
|---|---|
| Name | GET /habits/:habitId/records |
| Description | Returns a paginated list of habit records for a given habit, optionally filtered by date. |
| HTTP Method | get |
| Url | \<gateway\>/habits/:habitId/records |

This algorithm describes GET /habits/:habitId/records and all possible errors that can happen during this process.

### Vstup

```js
// path parameter: habitId
// query parameters:
const dtoIn = {
  date: "2026-05-24", // optional filter by date (YYYY-MM-DD)
  offset: 0, // pagination offset (default 0, min 0)
  limit: 20 // number of items per page (default 20, min 1, max 100)
};
```

### Input validation

```js
// path parameter validation
const habitIdParamSchema = z.object({
  habitId: z.string().uuid()
});

// query parameter validation
const listRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
```

### Výstup

```js
const dtoOut = {
  itemList: [ // list of habit records
    {
      id: "f9e8d7c6-b5a4-3210-fedc-ba9876543210", // generated unique code
      habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // habit which this record belongs to
      date: "2026-05-24", // day on which the habit was completed
      note: "Felt great today" // optional note
    }
  ],
  pageInfo: {
    offset: 0, // current offset
    limit: 20, // current limit
    total: 1 // total number of records for this habit
  }
};
```

### Algorithm

1. **Sequence** — Validates path parameter using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit using habit DAO get.
3. **Sequence** — Checks that the habit exists.
   3.1. **Error** — Habit does not exist
   `habitNotFound`
   habit with id habitId does not exist
4. **Sequence** — Validates dtoIn (query parameters) using Zod schema.
   4.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
5. Loads habit records using habitRecord DAO listByHabit.
6. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | habitNotFound | Habit not found. | |
| Error | invalidDtoIn | DtoIn is not valid. | |

---

## GET /habits/:habitId/records/:id

### Basic Info

| | |
|---|---|
| Name | GET /habits/:habitId/records/:id |
| Description | Returns a habit record by its id. |
| HTTP Method | get |
| Url | \<gateway\>/habits/:habitId/records/:id |

This algorithm describes GET /habits/:habitId/records/:id and all possible errors that can happen during this process.

### Vstup

```js
// path parameters
const dtoIn = {
  habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // habit which this record belongs to
  id: "f9e8d7c6-b5a4-3210-fedc-ba9876543210" // id of the habit record to retrieve
};
```

### Input validation

```js
const schema = z.object({
  habitId: z.string().uuid(),
  id: z.string().uuid()
});
```

### Výstup

```js
const dtoOut = {
  id: "f9e8d7c6-b5a4-3210-fedc-ba9876543210", // generated unique code
  habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // habit which this record belongs to
  date: "2026-05-24", // day on which the habit was completed
  note: "Felt great today" // optional note
};
```

### Algorithm

1. **Sequence** — Validates path parameters using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit record using habitRecord DAO get.
3. **Sequence** — Checks that the habit record exists and belongs to the specified habitId.
   3.1. **Error** — Habit record does not exist
   `habitRecordNotFound`
   habit record with given id does not exist
4. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |
| Error | habitRecordNotFound | Habit record not found. | |

---

## PUT /habits/:habitId/records/:id

### Basic Info

| | |
|---|---|
| Name | PUT /habits/:habitId/records/:id |
| Description | Updates an existing habit record (e.g. edit the note). |
| HTTP Method | put |
| Url | \<gateway\>/habits/:habitId/records/:id |

This algorithm describes PUT /habits/:habitId/records/:id and all possible errors that can happen during this process.

### Vstup

```js
// path parameters: habitId, id
// request body:
const dtoIn = {
  note: "Updated note - felt even better" // updated note
};
```

### Input validation

```js
// path parameter validation
const recordParamsSchema = z.object({
  habitId: z.string().uuid(),
  id: z.string().uuid()
});

// request body validation
const updateRecordSchema = z.object({
  note: z.string().max(250).optional()
});
```

### Výstup

```js
const dtoOut = {
  id: "f9e8d7c6-b5a4-3210-fedc-ba9876543210", // generated unique code
  habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // habit which this record belongs to
  date: "2026-05-24", // day on which the habit was completed
  note: "Updated note - felt even better" // updated note
};
```

### Algorithm

1. **Sequence** — Validates path parameters using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit record using habitRecord DAO get.
3. **Sequence** — Checks that the habit record exists and belongs to the specified habitId.
   3.1. **Error** — Habit record does not exist
   `habitRecordNotFound`
   habit record with given id does not exist
4. **Sequence** — Validates dtoIn (request body) using Zod schema.
   4.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
5. Updates the habit record using habitRecord DAO update.
6. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |
| Error | habitRecordNotFound | Habit record not found. | |

---

## DELETE /habits/:habitId/records/:id

### Basic Info

| | |
|---|---|
| Name | DELETE /habits/:habitId/records/:id |
| Description | Deletes a habit record. |
| HTTP Method | delete |
| Url | \<gateway\>/habits/:habitId/records/:id |

This algorithm describes DELETE /habits/:habitId/records/:id and all possible errors that can happen during this process.

### Vstup

```js
// path parameters
const dtoIn = {
  habitId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // habit which this record belongs to
  id: "f9e8d7c6-b5a4-3210-fedc-ba9876543210" // id of the habit record to delete
};
```

### Input validation

```js
const schema = z.object({
  habitId: z.string().uuid(),
  id: z.string().uuid()
});
```

### Výstup

```js
const dtoOut = {};
```

### Algorithm

1. **Sequence** — Validates path parameters using Zod schema.
   1.1. **Error** — Input is not valid
   `invalidDtoIn`
   dtoIn is not valid
2. Loads the habit record using habitRecord DAO get.
3. **Sequence** — Checks that the habit record exists and belongs to the specified habitId.
   3.1. **Error** — Habit record does not exist
   `habitRecordNotFound`
   habit record with given id does not exist
4. Deletes the habit record using habitRecord DAO delete.
5. **Return** — Returns properly filled dtoOut.

### Seznam chyb

| Typ | Kód | Zpráva | Parametry |
|-----|-----|--------|-----------|
| Error | invalidDtoIn | DtoIn is not valid. | |
| Error | habitRecordNotFound | Habit record not found. | |
