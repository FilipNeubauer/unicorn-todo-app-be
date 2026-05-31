import type { InferInsertModel } from "drizzle-orm";
import { count, eq } from "drizzle-orm";
import { db } from "../db/connection";
import { habits } from "../db/schema";

type HabitInsert = InferInsertModel<typeof habits>;

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
        frequency: data.frequency as HabitInsert["frequency"],
        customDays: data.customDays ?? [],
      })
      .returning();
    return rows[0];
  }

  async get(id: string) {
    const rows = await db.select().from(habits).where(eq(habits.id, id));
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
    }>,
  ) {
    const setData: Partial<HabitInsert> = {};
    if (data.name !== undefined) {
      setData.name = data.name;
    }
    if (data.description !== undefined) {
      setData.description = data.description;
    }
    if (data.frequency !== undefined) {
      setData.frequency = data.frequency as HabitInsert["frequency"];
    }
    if (data.customDays !== undefined) {
      setData.customDays = data.customDays;
    }

    const rows = await db
      .update(habits)
      .set(setData)
      .where(eq(habits.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string) {
    await db.delete(habits).where(eq(habits.id, id));
  }
}
