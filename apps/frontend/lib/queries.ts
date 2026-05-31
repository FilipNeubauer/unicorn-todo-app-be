"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { ApiError, habitsApi, recordsApi } from "./api";
import type { Habit, HabitInput, HabitRecord } from "./types";

export const queryKeys = {
  habits: ["habits"] as const,
  records: (habitId: string) => ["records", habitId] as const,
};

function tempId(): string {
  return `temp-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function useHabitsQuery() {
  return useQuery({
    queryKey: queryKeys.habits,
    queryFn: async () => {
      const res = await habitsApi.list();
      return res.itemList;
    },
  });
}

export function useRecordsQuery(habitId: string) {
  return useQuery({
    queryKey: queryKeys.records(habitId),
    queryFn: async () => {
      const res = await recordsApi.listByHabit(habitId);
      return res.itemList;
    },
    enabled: habitId.length > 0,
  });
}

/**
 * Dashboard needs habits + records for every habit (to compute "completed today").
 * Mirrors the previous Store's flat shape.
 */
export function useDashboardData() {
  const habitsQuery = useHabitsQuery();
  const habits = habitsQuery.data ?? [];

  const recordQueries = useQueries({
    queries: habits.map((h) => ({
      queryKey: queryKeys.records(h.id),
      queryFn: async () => {
        const res = await recordsApi.listByHabit(h.id);
        return res.itemList;
      },
    })),
  });

  const records: HabitRecord[] = recordQueries.flatMap((q) => q.data ?? []);

  const isPending =
    habitsQuery.isPending || recordQueries.some((q) => q.isPending);

  const error =
    (habitsQuery.error as ApiError | null) ??
    (recordQueries.find((q) => q.error)?.error as ApiError | undefined) ??
    null;

  function refetch() {
    habitsQuery.refetch();
    for (const q of recordQueries) {
      q.refetch();
    }
  }

  return { habits, records, isPending, error, refetch };
}

/**
 * Detail page: pull the single habit out of the habits list cache,
 * plus its records.
 */
export function useHabitDetail(habitId: string) {
  const habitsQuery = useHabitsQuery();
  const recordsQuery = useRecordsQuery(habitId);

  const habit = habitsQuery.data?.find((h) => h.id === habitId);

  const isPending = habitsQuery.isPending || recordsQuery.isPending;
  const error =
    (habitsQuery.error as ApiError | null) ??
    (recordsQuery.error as ApiError | null) ??
    null;

  function refetch() {
    habitsQuery.refetch();
    recordsQuery.refetch();
  }

  return {
    habit,
    records: recordsQuery.data ?? [],
    isPending,
    error,
    refetch,
  };
}

export function useAddHabit() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (input: HabitInput) => habitsApi.create(input),
    onSuccess: (created) => {
      qc.setQueryData<Habit[]>(queryKeys.habits, (prev) => [
        ...(prev ?? []),
        created,
      ]);
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Could not create habit";
      show(`Could not create habit: ${msg}`, "error");
    },
  });
}

interface ToggleArgs {
  habitId: string;
  date: string;
  /**
   * The record for this (habit, date) if it already exists. Pass it from the
   * caller — the mutation cannot reliably read it from the cache because
   * `onMutate` mutates the cache before `mutationFn` runs.
   */
  existing: HabitRecord | undefined;
}

export function useToggleRecord() {
  const qc = useQueryClient();
  const { show } = useToast();

  return useMutation({
    mutationFn: async ({ habitId, date, existing }: ToggleArgs) => {
      if (existing && !existing.id.startsWith("temp-")) {
        await recordsApi.delete(habitId, existing.id);
        return { kind: "deleted" as const };
      }
      const created = await recordsApi.create(habitId, date);
      return { kind: "created" as const, record: created };
    },

    onMutate: async ({ habitId, date, existing }) => {
      await qc.cancelQueries({ queryKey: queryKeys.records(habitId) });
      const prev =
        qc.getQueryData<HabitRecord[]>(queryKeys.records(habitId)) ?? [];

      if (existing) {
        qc.setQueryData<HabitRecord[]>(
          queryKeys.records(habitId),
          prev.filter((r) => r.id !== existing.id),
        );
      } else {
        const placeholder: HabitRecord = { id: tempId(), habitId, date };
        qc.setQueryData<HabitRecord[]>(queryKeys.records(habitId), [
          ...prev,
          placeholder,
        ]);
      }
      return { prev };
    },

    onError: (e, { habitId }, ctx) => {
      if (ctx) {
        qc.setQueryData(queryKeys.records(habitId), ctx.prev);
      }
      const msg = e instanceof ApiError ? e.message : "Could not update";
      show(`Could not update: ${msg}`, "error");
    },

    onSettled: (_data, _err, { habitId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.records(habitId) });
    },
  });
}
