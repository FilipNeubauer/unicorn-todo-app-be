"use client";

import { useMemo, useState } from "react";
import CreateHabitModal from "@/components/CreateHabitModal";
import HabitRow from "@/components/HabitRow";
import Skeleton from "@/components/Skeleton";
import { getApiBaseUrl } from "@/lib/api";
import { useDashboardData } from "@/lib/queries";
import { formatDate, isScheduledOn } from "@/lib/scheduling";

export default function Dashboard() {
  const {
    habits,
    records,
    isPending: loading,
    error: loadError,
    refetch,
  } = useDashboardData();
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date()),
  );
  const [showModal, setShowModal] = useState(false);

  const dateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const scheduledHabits = useMemo(
    () => habits.filter((h) => isScheduledOn(h, dateObj)),
    [habits, dateObj],
  );

  const completedCount = useMemo(
    () =>
      scheduledHabits.filter((h) =>
        records.some((r) => r.habitId === h.id && r.date === selectedDate),
      ).length,
    [scheduledHabits, records, selectedDate],
  );

  const total = scheduledHabits.length;
  const progressPct = total === 0 ? 0 : (completedCount / total) * 100;

  const prettyDate = dateObj.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loadError) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
        <p className="mb-2 text-base font-medium">
          Cannot connect to the server.
        </p>
        <p className="mb-4 text-sm text-muted">
          Make sure the API is running on{" "}
          <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs">
            {getApiBaseUrl()}
          </code>
          .
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card: date + progress */}
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {prettyDate}
          </h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-muted">
            {loading ? "…" : `${completedCount} of ${total} completed`}
          </span>
        </div>
      </section>

      {/* Habits list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Habits</h2>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            + Add Habit
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : habits.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
            There are no habits yet. Create your first one.
          </div>
        ) : scheduledHabits.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
            No habits scheduled for this day.
          </div>
        ) : (
          <div className="space-y-2">
            {scheduledHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                date={selectedDate}
                record={records.find(
                  (r) => r.habitId === habit.id && r.date === selectedDate,
                )}
              />
            ))}
          </div>
        )}
      </section>

      {showModal && <CreateHabitModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
