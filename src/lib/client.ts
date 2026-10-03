// Typed fetch wrapper for our API routes + optimistic-mutation helper (PRD §3.4).
// Every call is tracked globally so the top progress bar shows between the
// user interaction and the UI update.
import { trackPending } from "./pending";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return trackPending(
    (async () => {
      const res = await fetch(path, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error ?? "Request failed");
      return body as T;
    })(),
  );
}

/**
 * Optimistic mutation: applies `optimistic` to local state immediately, runs
 * the server call, then reconciles. On failure the caller rolls back and a
 * toast is shown, never a blocking spinner (PRD §3.4).
 */
export async function mutateOptimistic<T>(opts: {
  apply: () => void;
  rollback: () => void;
  commit: () => Promise<T>;
  errorMessage?: string;
}): Promise<T> {
  opts.apply();
  try {
    return await opts.commit();
  } catch (err) {
    opts.rollback();
    const { toast } = await import("./toast");
    toast(opts.errorMessage ?? "Something went wrong. Changes were rolled back.", "error");
    throw err;
  }
}
