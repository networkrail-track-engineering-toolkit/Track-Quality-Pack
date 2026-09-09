"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "offline";

interface UseAutosaveOptions<T> {
  /** Stable key used for local retention of unsaved changes. */
  storageKey: string;
  initial: T;
  save: (value: T) => Promise<void>;
  delay?: number;
}

/**
 * Debounced autosave with visible status, retry, local retention of unsaved
 * changes and protection against accidental navigation.
 */
export function useAutosave<T>({ storageKey, initial, save, delay = 1200 }: UseAutosaveOptions<T>) {
  const [value, setValue] = useState<T>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);
  const latest = useRef(value);
  latest.current = value;

  // Restore anything that was not saved before the page was closed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached) as { value: T };
      setValue({ ...(initial as object), ...(parsed.value as object) } as T);
      setState("dirty");
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    // Only restore once per section instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const flush = useCallback(async () => {
    setState("saving");
    setError(null);
    try {
      await save(latest.current);
      attempts.current = 0;
      setState("saved");
      window.localStorage.removeItem(storageKey);
    } catch (caught) {
      attempts.current += 1;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setState(offline ? "offline" : "error");
      setError(caught instanceof Error ? caught.message : "Save failed");
      if (attempts.current <= 5) {
        const backoff = Math.min(30000, 2000 * 2 ** (attempts.current - 1));
        timer.current = setTimeout(() => void flush(), backoff);
      }
    }
  }, [save, storageKey]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      setState("dirty");
      window.localStorage.setItem(storageKey, JSON.stringify({ value: next, at: Date.now() }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush, storageKey],
  );

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (state === "dirty" || state === "saving" || state === "error" || state === "offline") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state]);

  useEffect(() => {
    const online = () => {
      if (state === "offline" || state === "error") void flush();
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [flush, state]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { value, setValue: update, state, error, saveNow: flush };
}
