"use client";

import { cn } from "@/lib/cn";
import { formatDate, isScheduledOn } from "@/lib/scheduling";
import type { Habit, HabitRecord } from "@/lib/types";

interface Props {
  habit: Habit;
  records: HabitRecord[];
  year: number;
  month: number; // 0-indexed
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar({ habit, records, year, month }: Props) {
  const completedDates = new Set(records.map((r) => r.date));
  const todayStr = formatDate(new Date());

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) {
    startOffset = 6;
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const monthName = firstDay.toLocaleString("default", { month: "long" });

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">
        {monthName} {year}
      </h3>

      <div className="grid grid-cols-7 gap-1.5">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-medium uppercase tracking-wide text-muted"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: padding cell position is stable within a fixed-size month grid
                key={`pad-${year}-${month}-${i}`}
                className="aspect-square"
              />
            );
          }
          const date = new Date(year, month, day);
          const dateStr = formatDate(date);
          const scheduled = isScheduledOn(habit, date);
          const completed = completedDates.has(dateStr);
          const isToday = dateStr === todayStr;

          let cls = "bg-transparent text-muted/40"; // not scheduled default
          if (scheduled && completed) {
            cls = "bg-success text-white font-medium";
          } else if (scheduled) {
            cls = "bg-accent/10 text-accent";
          }

          return (
            <div
              key={dateStr}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-sm",
                cls,
                isToday && "ring-2 ring-accent",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-success" />
          Completed
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent/10" />
          Scheduled
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border border-border bg-transparent" />
          Not scheduled
        </span>
      </div>
    </div>
  );
}
