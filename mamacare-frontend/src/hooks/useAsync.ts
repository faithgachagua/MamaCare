import { useCallback, useEffect, useState } from 'react';
import type { ApiResponse } from '../services/api';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Runs an API call on mount and again whenever reload() is called. */
export function useAsync<T>(fn: () => Promise<ApiResponse<T>>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((res) => {
        if (!alive) return;
        if (res.ok && res.data !== undefined) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.error ?? 'Something went wrong.');
        }
      })
      .catch(() => alive && setError('Could not reach the server. Check your connection and try again.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // fn is a stable module-level function in every caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
