import { useEffect, useState } from 'react';
import LoadState from '../components/LoadState';
import { useAsync } from '../hooks/useAsync';
import { getCircle, getSharedSummary, type CircleEntry, type SharedSummary } from '../services/api';
import { roleLabel, scopeShort } from '../utils/care';
import { longDate, shortDate } from '../utils/format';

function vitalText(v: NonNullable<SharedSummary['vitals']>[number]): string {
  if (v.vital_type === 'blood_pressure') return `${v.value_numeric} / ${v.value_secondary} mmHg`;
  return `${v.value_numeric ?? ''} ${v.unit ?? ''}`.trim();
}

const nice = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Summary({ entry }: { entry: CircleEntry }) {
  const [tick, setTick] = useState(0);
  const state = useAsync(() => getSharedSummary(entry.mother_id));
  useEffect(() => { if (tick) state.reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tick]);

  return (
    <LoadState state={state}>
      {(d) => (
        <div className="card shared-card">
          <div className="card-head">
            <div className="card-title"><h3>{d.mother_name}</h3></div>
            <button type="button" className="card-link" onClick={() => setTick((t) => t + 1)}>Refresh</button>
          </div>
          <p className="form-hint">
            You are her {entry.relationship_label?.toLowerCase() || roleLabel(entry.role).toLowerCase()}. She shares: {d.scopes.map((s) => scopeShort[s]).join(', ')}.
          </p>

          {d.journey && (
            <div className="kv">
              <span>{d.journey.stage === 'postpartum' ? 'Postpartum' : 'Pregnancy'}</span>
              <span>
                {d.journey.stage === 'postpartum'
                  ? `${d.journey.weeks_postpartum ?? 0} weeks since birth`
                  : `Week ${d.journey.gestational_age_weeks ?? '—'}${d.journey.due_date ? ` · due ${longDate(d.journey.due_date)}` : ''}`}
              </span>
            </div>
          )}

          {d.babies && d.babies.length > 0 && d.babies.map((b) => (
            <div key={b.id} className="kv"><span>Baby</span><span>{b.name || 'Baby'} · born {longDate(b.birth_date)}</span></div>
          ))}

          {d.symptoms && (
            <>
              <h4 className="circle-sub">Recent symptoms</h4>
              {d.symptoms.length === 0 ? <p className="pj-desc">Nothing logged yet.</p> : d.symptoms.map((s) => (
                <div key={s.id} className="kv">
                  <span>{nice(s.symptom_type)}{s.severity ? ` · ${s.severity}/5` : ''}</span>
                  <span className="muted">{shortDate(s.recorded_at)}</span>
                </div>
              ))}
            </>
          )}

          {d.vitals && (
            <>
              <h4 className="circle-sub">Recent measurements</h4>
              {d.vitals.length === 0 ? <p className="pj-desc">Nothing logged yet.</p> : d.vitals.map((v) => (
                <div key={v.id} className="kv">
                  <span>{nice(v.vital_type)}</span>
                  <span>{vitalText(v)} <span className="muted">· {shortDate(v.recorded_at)}</span></span>
                </div>
              ))}
            </>
          )}
          <p className="form-hint" style={{ marginTop: 12 }}>
            This is only what she has chosen to share. It is not a medical assessment. If you are worried about her, call her or take her to a health facility.
          </p>
        </div>
      )}
    </LoadState>
  );
}

/** What a partner, family member or doctor sees: the mothers who have shared with them. */
function SharedView() {
  const circle = useAsync(getCircle);
  return (
    <section className="section active" id="sec-shared">
      <LoadState state={circle}>
        {(list) => list.length === 0 ? (
          <div className="card">
            <h3>Nothing shared with you yet</h3>
            <p className="pj-desc">When a mother invites you and you join, what she chooses to share appears here.</p>
          </div>
        ) : (
          <div className="shared-grid">
            {list.map((e) => <Summary key={e.mother_id} entry={e} />)}
          </div>
        )}
      </LoadState>
    </section>
  );
}

export default SharedView;
