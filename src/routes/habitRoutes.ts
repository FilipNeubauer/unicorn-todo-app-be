import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { HabitDao } from "../dao/HabitDao";
import { validateDtoIn } from "../validation/validator";

const router = Router();
const habitDao = new HabitDao();

const createHabitSchema = z.object({
  name: z.string().min(1, "Must not be empty.").max(100, "Max length is 100."),
  description: z.string().max(250, "Max length is 250.").default(""),
  frequency: z
    .enum(["Daily", "Weekdays", "Weekends", "Custom days"])
    .default("Daily"),
  customDays: z
    .array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]))
    .default([]),
});

const listHabitSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const updateHabitSchema = z.object({
  name: z
    .string()
    .min(1, "Must not be empty.")
    .max(100, "Max length is 100.")
    .optional(),
  description: z.string().max(250, "Max length is 250.").optional(),
  frequency: z
    .enum(["Daily", "Weekdays", "Weekends", "Custom days"])
    .optional(),
  customDays: z
    .array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]))
    .optional(),
});

// POST /habits
router.post("/", async (req: Request, res: Response) => {
  const result = validateDtoIn(req.body, createHabitSchema);

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const habit = await habitDao.create(result.dtoIn);
  res.status(201).json(habit);
});

// GET /habits
router.get("/", async (req: Request, res: Response) => {
  const result = validateDtoIn(
    req.query as Record<string, unknown>,
    listHabitSchema,
  );

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const data = await habitDao.list(result.dtoIn.offset, result.dtoIn.limit);
  res.json(data);
});

// GET /habits/:id
router.get("/:id", async (req: Request, res: Response) => {
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    idParamSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const habit = await habitDao.get(params.dtoIn.id);
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
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    idParamSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const existing = await habitDao.get(params.dtoIn.id);
  if (!existing) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  const result = validateDtoIn(req.body, updateHabitSchema);

  if (!result.valid) {
    res.status(400).json(result.error);
    return;
  }

  const updated = await habitDao.update(params.dtoIn.id, result.dtoIn);
  res.json(updated);
});

// DELETE /habits/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const params = validateDtoIn(
    req.params as Record<string, unknown>,
    idParamSchema,
  );

  if (!params.valid) {
    res.status(400).json(params.error);
    return;
  }

  const existing = await habitDao.get(params.dtoIn.id);
  if (!existing) {
    res.status(404).json({
      error: { code: "habitNotFound", message: "Habit not found." },
    });
    return;
  }

  await habitDao.delete(params.dtoIn.id);
  res.json({});
});

export default router;
