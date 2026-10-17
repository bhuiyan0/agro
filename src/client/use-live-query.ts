"use client";

import { liveQuery } from "dexie";
import { useEffect, useState, type DependencyList } from "react";

/**
 * Run an IndexedDB query and re-run it whenever the data it read changes,
 * including changes made by sync. `undefined` while the first result loads.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: DependencyList): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({ next: setValue, error: (e) => console.error(e) });
    return () => subscription.unsubscribe();
    // The caller lists the inputs the query depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
