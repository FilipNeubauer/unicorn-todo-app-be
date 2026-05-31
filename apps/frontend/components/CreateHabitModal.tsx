"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { cn } from "@/lib/cn";
import { useAddHabit } from "@/lib/queries";
import {
  type CreateHabitFormValues,
  createHabitSchema,
  DAY_VALUES,
  FREQUENCY_VALUES,
} from "@/lib/validation";

interface Props {
  onClose: () => void;
}

export default function CreateHabitModal({ onClose }: Props) {
  const addHabit = useAddHabit();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateHabitFormValues>({
    resolver: zodResolver(createHabitSchema),
    defaultValues: {
      name: "",
      description: "",
      frequency: "Daily",
      customDays: [],
    },
  });

  const frequency = watch("frequency");

  async function onSubmit(values: CreateHabitFormValues) {
    try {
      await addHabit.mutateAsync({
        name: values.name.trim(),
        description: (values.description ?? "").trim(),
        frequency: values.frequency ?? "Daily",
        customDays:
          values.frequency === "Custom days" ? (values.customDays ?? []) : [],
      });
      onClose();
    } catch {
      // Toast is shown by the mutation's onError; keep the modal open so the
      // user can retry.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create habit"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
        noValidate
      >
        <h2 className="mb-5 text-lg font-semibold tracking-tight">
          Create habit
        </h2>

        <div className="mb-4">
          <label
            htmlFor="habit-name"
            className="mb-1.5 block text-sm font-medium"
          >
            Name
          </label>
          <input
            id="habit-name"
            type="text"
            maxLength={100}
            aria-invalid={errors.name ? "true" : "false"}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="habit-description"
            className="mb-1.5 block text-sm font-medium"
          >
            Description
          </label>
          <input
            id="habit-description"
            type="text"
            maxLength={250}
            aria-invalid={errors.description ? "true" : "false"}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-danger">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="habit-frequency"
            className="mb-1.5 block text-sm font-medium"
          >
            Frequency
          </label>
          <select
            id="habit-frequency"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            {...register("frequency")}
          >
            {FREQUENCY_VALUES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {frequency === "Custom days" && (
          <div className="mb-4">
            <span className="mb-1.5 block text-sm font-medium">
              Custom days
            </span>
            <Controller
              control={control}
              name="customDays"
              render={({ field }) => {
                const selected = field.value ?? [];
                const toggle = (day: (typeof DAY_VALUES)[number]) => {
                  field.onChange(
                    selected.includes(day)
                      ? selected.filter((d) => d !== day)
                      : [...selected, day],
                  );
                };
                return (
                  <div className="flex flex-wrap gap-2">
                    {DAY_VALUES.map((day) => {
                      const active = selected.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggle(day)}
                          aria-pressed={active}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            active
                              ? "border-accent bg-accent text-white"
                              : "border-border text-muted hover:bg-border/30",
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                );
              }}
            />
            {errors.customDays && (
              <p className="mt-1 text-xs text-danger">
                {errors.customDays.message}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md px-4 py-2 text-sm text-muted transition-colors hover:bg-border/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
