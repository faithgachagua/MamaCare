import type { ReactNode } from 'react';
import type { AsyncState } from '../hooks/useAsync';

interface Props<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
}

/** Shows a skeleton while loading, a retry prompt on failure, and the page once data is here. */
function LoadState<T>({ state, children }: Props<T>) {
  if (state.data) return <>{children(state.data)}</>;

  if (state.error) {
    return (
      <div className="card load-state" role="alert">
        <h3>We couldn’t load this page</h3>
        <p className="pj-desc">{state.error}</p>
        <button type="button" className="btn-block" onClick={state.reload}>Try again</button>
      </div>
    );
  }

  return (
    <div className="load-state" role="status" aria-label="Loading">
      <div className="skeleton skeleton--hero" />
      <div className="skeleton-row">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    </div>
  );
}

export default LoadState;
