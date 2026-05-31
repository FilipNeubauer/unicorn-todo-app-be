import { z } from "zod";

export const DAY_VALUES = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export const FREQUENCY_VALUES = [
  "Daily",
  "Weekdays",
  "Weekends",
  "Custom days",
] as const;

export const createHabitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Max length is 100."),
  description: z.string().trim().max(250, "Max length is 250.").default(""),
  frequency: z.enum(FREQUENCY_VALUES).default("Daily"),
  customDays: z.array(z.enum(DAY_VALUES)).default([]),
});

export type CreateHabitFormValues = z.input<typeof createHabitSchema>;
export type CreateHabitData = z.output<typeof createHabitSchema>;
