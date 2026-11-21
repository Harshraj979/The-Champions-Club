"use client";
import { useEffect, useState } from "react";

// Try the live API; on any failure hand back the fallback and flag demo mode.
export function useApi<T>(url: string | null, pick: (j: any) => T, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    if (!url) return;
    let live = true;
    fetch(url).then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => { if (live) setData(pick(j)); })
      .catch(() => { if (live) setDemo(true); });
    return () => { live = false; };
  }, [url]);
  return { data, demo };
}
