import { useRef, useState } from 'react';
import LoadState from '../components/LoadState';
import StatusPanel from '../components/StatusPanel';
import type { Section } from '../components/Sidebar';
import { useAsync } from '../hooks/useAsync';
import {
  getCatalog,
  getHome,
  getInsights,
  postSymptom,
  postVital,
  type Catalog,
  type Home,
  type InsightsData,
} from '../services/api';
import { grams, shortDate } from '../utils/format';

interface Props {
  onNavigate: (section: Section) => void;
}

type Saved = (result: InsightsData | null) => void;

function Timeline({ home }: { home: Home }) {
  const p = home.progress;
  const unit = 'WEEK';
  const items = home.checkups.map((c) => ({
    key: `${c.week}-${c.title}`,
    week: c.week,
    status: c.status === 'passed' ? 'passed' : '',
    label: `${unit} ${c.week} · ${shortDate(c.approx_date)}`,
    title: c.title,
    text: c.who !== 'Mother' ? `For: ${c.who}` : '',
  }));
  const today = { key: 'today', week: p.week, status: 'current', label: `${unit} ${p.week} · TODAY`, title: 'You are here', text: '' };
  const idx = items.findIndex((i) => i.week >= p.week);
  const all = [...items.slice(0, idx === -1 ? items.length : idx), today, ...(idx === -1 ? [] : items.slice(idx))];

  return (
    <div className="timeline">
      {all.map((item) => (
        <div key={item.key} className={`tl-item ${item.status}`}>
          <div className="tl-dot"></div>
          <div className="tl-week">{item.label}</div>
          <div className="tl-title">{item.title}</div>
          {item.text && <div className="tl-text">{item.text}</div>}
        </div>
      ))}
    </div>
  );
}

function SymptomLog({ catalog, onSaved }: { catalog: Catalog; onSaved: Saved }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [severity, setSeverity] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const common = catalog.symptoms.filter((s) => s.level === null && s.key !== 'feeling_good');
  const watch = catalog.symptoms.filter((s) => s.level === 'watch');
  const urgent = catalog.symptoms.filter((s) => s.level === 'urgent');
  const needsSeverity = picked.some((k) => k !== 'feeling_good');

  function toggle(key: string) {
    setPicked((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      return key === 'feeling_good' ? ['feeling_good'] : [...cur.filter((k) => k !== 'feeling_good'), key];
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    const results = await Promise.all(
      picked.map((key) => postSymptom({ symptom_type: key, severity: key === 'feeling_good' ? undefined : severity })),
    );
    const failed = results.find((r) => !r.ok);
    if (failed) {
      setSaving(false);
      setError(failed.error ?? 'Could not save. Try again.');
      return;
    }
    const after = await getInsights();
    setSaving(false);
    setPicked([]);
    onSaved(after.ok ? after.data ?? null : null);
  }

  const group = (title: string, list: Catalog['symptoms'], warn = false) =>
    list.length > 0 && (
      <div className="log-group">
        <h4>{title}</h4>
        <div className="log-chips">
          {list.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={picked.includes(s.key)}
              className={`chip-filter ${warn ? 'warn' : ''} ${picked.includes(s.key) ? 'active' : ''}`}
              onClick={() => toggle(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <h3>How are you today?</h3>
        </div>
      </div>
      {group('Good', catalog.symptoms.filter((s) => s.key === 'feeling_good'))}
      {group('Common', common)}
      {group('Worth a call to your clinic', watch)}
      {group('Warning signs. Get care if you have any of these', urgent, true)}

      {needsSeverity && (
        <div className="sev-row" role="group" aria-label="How strong is it, from 1 to 5">
          <span>How strong?</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={severity === n}
              className={`chip-filter ${severity === n ? 'active' : ''}`}
              onClick={() => setSeverity(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <button type="button" className="btn-block full" disabled={picked.length === 0 || saving} onClick={save}>
        {saving ? 'Saving…' : 'Save today’s log'}
      </button>
      {picked.length === 0 && <p className="form-hint">Choose everything that applies, then save.</p>}
      {error && <p className="log-err" role="alert">{error}</p>}
    </div>
  );
}

function MeasurementLog({ catalog, onSaved }: { catalog: Catalog; onSaved: Saved }) {
  const [type, setType] = useState('blood_pressure');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const spec = catalog.vitals.find((v) => v.key === type) ?? catalog.vitals[0];
  const isBp = type === 'blood_pressure';

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const first = Number(a);
    const second = Number(b);
    if (!a || Number.isNaN(first)) return setError(isBp ? 'Enter the top number.' : `Enter your ${spec.label.toLowerCase()}.`);
    if (isBp && (!b || Number.isNaN(second))) return setError('Enter the bottom number too.');
    setSaving(true);
    const res = await postVital({ vital_type: type, value_numeric: first, ...(isBp ? { value_secondary: second } : {}) } as Parameters<typeof postVital>[0]);
    if (!res.ok) {
      setSaving(false);
      return setError(res.error ?? 'Could not save. Try again.');
    }
    const after = await getInsights();
    setSaving(false);
    setA('');
    setB('');
    onSaved(after.ok ? after.data ?? null : null);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <h3>Log a measurement</h3>
        </div>
      </div>
      <form className="mini-form" onSubmit={save} noValidate>
        <div className="form-row">
          <label htmlFor="m-type">What did you measure?</label>
          <select id="m-type" value={type} onChange={(e) => { setType(e.target.value); setA(''); setB(''); setError(''); }}>
            {catalog.vitals.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
        </div>
        {isBp ? (
          <div className="two">
            <div className="form-row">
              <label htmlFor="m-a">Top number</label>
              <input id="m-a" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} placeholder="120" />
            </div>
            <div className="form-row">
              <label htmlFor="m-b">Bottom number</label>
              <input id="m-b" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value)} placeholder="80" />
            </div>
          </div>
        ) : (
          <div className="form-row">
            <label htmlFor="m-a">{spec.label} ({spec.unit})</label>
            <input id="m-a" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} placeholder={type === 'weight' ? '65.5' : '36.8'} />
          </div>
        )}
        <button type="submit" className="btn-block full" disabled={saving}>{saving ? 'Saving…' : 'Save measurement'}</button>
        {error && <p className="log-err" role="alert">{error}</p>}
      </form>
    </div>
  );
}

function Journey({ onNavigate }: Props) {
  const home = useAsync(getHome);
  const catalog = useAsync(getCatalog);
  const [after, setAfter] = useState<InsightsData | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const saved: Saved = (result) => {
    setAfter(result);
    home.reload();
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <section className="section active" id="sec-journey">
      <LoadState state={home}>
        {(h) => {
          const baby = h.baby_this_week;
          return (
            <div className="row r2" style={{ alignItems: 'start' }}>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    <h3>{h.progress.kind === 'pregnant' ? 'Your pregnancy timeline' : 'Your first six weeks'}</h3>
                  </div>
                </div>
                <Timeline home={h} />
                <p className="form-hint">Estimated dates from the WHO schedule. Your clinic’s schedule comes first.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {after && (
                  <div ref={resultRef} className="card">
                    <p className="log-ok" style={{ margin: '0 0 10px' }}>Saved.</p>
                    <StatusPanel level={after.level} flags={after.flags} />
                    <button type="button" className="btn-block" style={{ marginTop: 12 }} onClick={() => onNavigate('chat')}>Ask Vera about it</button>
                  </div>
                )}
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">
                      <h3>This week</h3>
                    </div>
                  </div>
                  <div className="pj-week">
                    {h.progress.week}<span>{baby ? ' / 40 weeks' : h.progress.week === 1 ? ' week since birth' : ' weeks since birth'}</span>
                  </div>
                  <p className="pj-desc">
                    {baby
                      ? `About ${baby.length_cm} cm and ${grams(baby.weight_g)} on average. ${baby.text}`
                      : 'Your body is healing. Keep an eye on bleeding, fever and how you feel.'}
                  </p>
                </div>
                <LoadState state={catalog}>
                  {(c) => (
                    <>
                      <SymptomLog catalog={c} onSaved={saved} />
                      <MeasurementLog catalog={c} onSaved={saved} />
                    </>
                  )}
                </LoadState>
              </div>
            </div>
          );
        }}
      </LoadState>
    </section>
  );
}

export default Journey;
