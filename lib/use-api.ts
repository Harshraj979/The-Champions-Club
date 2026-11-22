"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { withFetchSignal } from "@/lib/api";

// Every data page loads through this hook, so loading, error and empty
// states behave the same everywhere. A reload cancels the request it
// supersedes (via withFetchSignal) and a sequence number drops any
// older response that arrives late, so a slow response can never
// overwrite newer state.
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seqRef = useRef(0);
  const ctrlRef = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const id = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      const result = await withFetchSignal(ctrl.signal, () => fnRef.current());
      if (seqRef.current !== id || ctrl.signal.aborted) return;
      setData(result);
    } catch (e) {
      if (seqRef.current !== id || ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (seqRef.current === id) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  return { data, error, loading, reload, setData };
}
