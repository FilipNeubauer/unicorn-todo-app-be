"use client";

import { useParams, useRouter } from "next/navigation";
import Calendar from "@/components/Calendar";
import Skeleton from "@/components/Skeleton";
import { getApiBaseUrl } from "@/lib/api";
import { useHabitDetail } from "@/lib/queries";
import { getStreak } from "@/lib/scheduling";

export default function HabitHistory() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.id as string;

  const {
    habit,
    records: habitRecords,
    isPending: loading,
    error: loadError,
    refetch,
  } = useHabitDetail(habitId);

  const BackButton = (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="mb-6 rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-border/30"
    >
      ← Back
    </button>
  );

  if (loadError) {
    return (
      <div>
        {BackButton}
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
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {BackButton}
        <Skeleton className="mb-3 h-8 w-1/2" />
        <Skeleton className="mb-6 h-4 w-3/4" />
        <div className="mb-6 flex gap-4">
          <Skeleton className="h-20 w-40" />
          <Skeleton className="h-20 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div>
        {BackButton}
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
          Habit not found.
        </div>
      </div>
    );
  }

  const today = new Date();
  const streak = getStreak(habit, habitRecords, today);
  const totalCompletions = habitRecords.length;

  return (
    <div>
      {BackButton}

      <h1 className="text-3xl font-semibold tracking-tight">{habit.name}</h1>
      {habit.description && (
        <p className="mt-2 text-base text-muted">{habit.description}</p>
      )}
      <span className="mt-3 inline-block rounded bg-border/50 px-2 py-0.5 text-xs text-muted">
        {habit.frequency}
      </span>

      <div className="mt-6 mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">
            Current streak
          </p>
          <p className="mt-1 text-3xl font-semibold">
            {streak}{" "}
            <span className="text-base font-normal text-muted">days</span>
            {streak > 0 && <span className="ml-1">🔥</span>}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">
            Total completions
          </p>
          <p className="mt-1 text-3xl font-semibold">{totalCompletions}</p>
        </div>
      </div>

      {habitRecords.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-sm">
          This habit has not been completed yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <Calendar
            habit={habit}
            records={habitRecords}
            year={today.getFullYear()}
            month={today.getMonth()}
          />
        </div>
      )}
    </div>
  );
}
