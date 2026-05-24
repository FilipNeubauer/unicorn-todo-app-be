import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { HabitDao } from "../dao/HabitDao";
import { HabitRecordDao } from "../dao/HabitRecordDao";
import { validateDtoIn } from "../validation/validator";

const router = Router({ mergeParams: true });
const habitRecordDao = new HabitRecordDao();
const habitDao = new HabitDao();

const habitIdParamSchema = z.object({
  habitId: z.string().uuid(),
});

const recordParamsSchema = z.object({
  habitId: z.string().uuid(),
  id: z.string().uuid(),
});

const createRecordSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in YYYY-MM-DD format."),
  note: z.string().max(250, "Max length is 250.").optional(),
});

const listRecordSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in YYYY-MM-DD format.")
    .optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateRecordSchema = z.object({
  note: z.string().max(250, "Max length is 250.").optional(),
});

// POST /habits/:habitId/records
router.post("/", async (req: Request, res: Response) => {
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    habitIdParamSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const habit = await habitDao.get(params.dtoIn.habitId);
  if (!habit) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  const result = validateDtoIn(req.body, createRecordSchema);

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const record = await habitRecordDao.create({
    habitId: params.dtoIn.habitId,
    date: result.dtoIn.date,
    note: result.dtoIn.note,
  });
  res.status(201).json(record);
});

// GET /habits/:habitId/records
router.get("/", async (req: Request, res: Response) => {
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    habitIdParamSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const habit = await habitDao.get(params.dtoIn.habitId);
  if (!habit) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  const result = validateDtoIn(
    req.query as Record<string, unknown>,
    listRecordSchema,
  );

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const data = await habitRecordDao.listByHabit(params.dtoIn.habitId, {
    date: result.dtoIn.date,
    offset: result.dtoIn.offset,
    limit: result.dtoIn.limit,
  });
  res.json(data);
});

// GET /habits/:habitId/records/:id
router.get("/:id", async (req: Request, res: Response) => {
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    recordParamsSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const record = await habitRecordDao.get(params.dtoIn.id);
  if (!record || record.habitId !== params.dtoIn.habitId) {
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
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    recordParamsSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const record = await habitRecordDao.get(params.dtoIn.id);
  if (!record || record.habitId !== params.dtoIn.habitId) {
    res.status(404).json({
      error: {
        code: "habitRecordNotFound",
        message: "Habit record not found.",
      },
    });
    return;
  }

  const result = validateDtoIn(req.body, updateRecordSchema);

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const updated = await habitRecordDao.update(params.dtoIn.id, result.dtoIn);
  res.json(updated);
});

// DELETE /habits/:habitId/records/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    recordParamsSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const record = await habitRecordDao.get(params.dtoIn.id);
  if (!record || record.habitId !== params.dtoIn.habitId) {
    res.status(404).json({
      error: {
        code: "habitRecordNotFound",
        message: "Habit record not found.",
      },
    });
    return;
  }

  await habitRecordDao.delete(params.dtoIn.id);
  res.json({});
});

export default router;
