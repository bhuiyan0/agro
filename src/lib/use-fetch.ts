"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/messages";

/**
 * Load JSON from the API whenever `path` changes. `path: null` skips loading.
 * A response for an older path is ignored, so fast filter changes cannot
 * show stale data.
 */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api<T>(path).then((result) => {
      if (!current) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else setError(errorMessage(result.code));
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}
