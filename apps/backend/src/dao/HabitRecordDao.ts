import type { InferInsertModel } from "drizzle-orm";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db/connection";
import { habitRecords } from "../db/schema";

type HabitRecordInsert = InferInsertModel<typeof habitRecords>;

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
    options: { date?: string; offset: number; limit: number },
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
      db.select({ count: count() }).from(habitRecords).where(whereClause),
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
    const setData: Partial<HabitRecordInsert> = {};
    if (data.note !== undefined) {
      setData.note = data.note;
    }

    const rows = await db
      .update(habitRecords)
      .set(setData)
      .where(eq(habitRecords.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string) {
    await db.delete(habitRecords).where(eq(habitRecords.id, id));
  }
}
