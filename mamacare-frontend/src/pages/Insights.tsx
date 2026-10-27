import LoadState from '../components/LoadState';
import StatusPanel from '../components/StatusPanel';
import type { Section } from '../components/Sidebar';
import { useAsync } from '../hooks/useAsync';
import { getInsights, type LatestVital } from '../services/api';
import { shortDate, sinceLabel } from '../utils/format';

interface Props {
  onNavigate: (section: Section) => void;
}

function reading(v?: LatestVital): string | null {
  if (!v) return null;
  if (v.type === 'blood_pressure') return `${v.value} / ${v.secondary} mmHg`;
  return `${v.value} ${v.unit ?? ''}`.trim();
}

const measurements: Array<{ key: string; label: string }> = [
  { key: 'blood_pressure', label: 'Blood pressure' },
  { key: 'weight', label: 'Weight' },
  { key: 'temperature', label: 'Temperature' },
];

function Insights({ onNavigate }: Props) {
  const state = useAsync(getInsights);

  return (
    <section className="section active" id="sec-insights">
      <LoadState state={state}>
        {(data) => (
          <>
            <div className="row r1">
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    <h3>Warning signs</h3>
                  </div>
                </div>
                <StatusPanel level={data.level} flags={data.flags} onLog={() => onNavigate('journey')} />
                <p className="form-hint" style={{ marginTop: 12 }}>
                  {sinceLabel(data.last_logged_at)}. These checks use fixed health rules on what you logged in the last
                  7 days. They cannot replace a check-up, and they cannot see how you feel unless you log it.
                </p>
              </div>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    <h3>Eating well</h3>
                  </div>
                </div>
                {data.nutrition.map((n) => (
                  <div key={n.label} className="insight">
                    <div className="i-icon" style={{ background: 'var(--teal-tint)' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00786E" strokeWidth="2">
                        <path d="m20 6-11 11-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="i-title">{n.label}</p>
                      <p className="i-text">{n.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="row r2">
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    <h3>Your latest measurements</h3>
                  </div>
                  <button type="button" className="card-link" onClick={() => onNavigate('journey')}>Add one</button>
                </div>
                {measurements.map((m) => {
                  const v = data.latest[m.key];
                  return (
                    <div key={m.key} className="kv">
                      <span>{m.label}</span>
                      {v ? (
                        <span>{reading(v)} <span className="muted">· {shortDate(v.recorded_at)}</span></span>
                      ) : (
                        <span className="muted">Not logged yet</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    <h3>Recommended checkups</h3>
                  </div>
                </div>
                {data.checkups.map((c) => (
                  <div key={`${c.week}-${c.title}`} className="milestone" style={c.status === 'passed' ? { opacity: 0.55 } : undefined}>
                    <span className="m-dot"></span>
                    <span className="m-week">{shortDate(c.approx_date)}</span>
                    <span className="m-text">{c.title}{c.who !== 'Mother' ? ` (${c.who})` : ''}</span>
                  </div>
                ))}
                <p className="form-hint">Estimated dates from the WHO schedule. Your clinic’s schedule comes first.</p>
              </div>
            </div>
          </>
        )}
      </LoadState>
    </section>
  );
}

export default Insights;
