import type { Habit, HabitRecord } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

export function isScheduledOn(habit: Habit, date: Date): boolean {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  switch (habit.frequency) {
    case "Daily":
      return true;
    case "Weekdays":
      return day >= 1 && day <= 5;
    case "Weekends":
      return day === 0 || day === 6;
    case "Custom days":
      return habit.customDays.includes(getDayName(date));
    default:
      return false;
  }
}

export function getStreak(
  habit: Habit,
  records: HabitRecord[],
  today: Date,
): number {
  const habitRecordDates = new Set(
    records.filter((r) => r.habitId === habit.id).map((r) => r.date),
  );

  let streak = 0;
  const current = new Date(today);

  while (true) {
    if (!isScheduledOn(habit, current)) {
      current.setDate(current.getDate() - 1);
      continue;
    }
    const dateStr = formatDate(current);
    if (habitRecordDates.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
