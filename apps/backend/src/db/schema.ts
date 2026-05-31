import { relations } from "drizzle-orm";
import {
  date,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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
    uniqueIndex("habit_records_habit_id_date_idx").on(
      table.habitId,
      table.date,
    ),
  ],
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
