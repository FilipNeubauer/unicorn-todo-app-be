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
