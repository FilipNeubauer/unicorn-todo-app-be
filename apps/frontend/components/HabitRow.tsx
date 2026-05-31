"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useToggleRecord } from "@/lib/queries";
import type { Habit, HabitRecord } from "@/lib/types";

interface Props {
  habit: Habit;
  date: string;
  record: HabitRecord | undefined;
}

export default function HabitRow({ habit, date, record }: Props) {
  const toggle = useToggleRecord();
  const completed = !!record;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() =>
          toggle.mutate({ habitId: habit.id, date, existing: record })
        }
        aria-pressed={completed}
        aria-label={
          completed
            ? `Mark "${habit.name}" as not done`
            : `Mark "${habit.name}" as done`
        }
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
          completed
            ? "border-success bg-success text-white"
            : "border-border bg-surface hover:border-accent",
        )}
      >
        {completed && (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 10l3 3 7-7"
            />
          </svg>
        )}
      </button>

      <span
        className={cn("flex-1 text-sm", completed && "text-muted line-through")}
      >
        {habit.name}
      </span>

      <span className="rounded bg-border/50 px-2 py-0.5 text-xs text-muted">
        {habit.frequency}
      </span>

      <Link
        href={`/habits/${habit.id}`}
        className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-border/30"
      >
        Detail
      </Link>
    </div>
  );
}
