import type { Habit, HabitInput, HabitRecord, ListResult } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new ApiError(
      "networkError",
      e instanceof Error ? e.message : "Network error",
      0,
    );
  }

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string } } = {};
    try {
      body = await res.json();
    } catch {
      // empty/invalid body
    }
    throw new ApiError(
      body?.error?.code ?? "unknown",
      body?.error?.message ?? res.statusText,
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

export const habitsApi = {
  list: () => request<ListResult<Habit>>("/habits?limit=100"),
  get: (id: string) => request<Habit>(`/habits/${id}`),
  create: (data: HabitInput) =>
    request<Habit>("/habits", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<HabitInput>) =>
    request<Habit>(`/habits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<Record<string, never>>(`/habits/${id}`, { method: "DELETE" }),
};

export const recordsApi = {
  listByHabit: (habitId: string) =>
    request<ListResult<HabitRecord>>(`/habits/${habitId}/records?limit=100`),
  create: (habitId: string, date: string) =>
    request<HabitRecord>(`/habits/${habitId}/records`, {
      method: "POST",
      body: JSON.stringify({ date }),
    }),
  delete: (habitId: string, recordId: string) =>
    request<Record<string, never>>(`/habits/${habitId}/records/${recordId}`, {
      method: "DELETE",
    }),
};

export function getApiBaseUrl(): string {
  return BASE_URL;
}
