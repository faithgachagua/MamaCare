import { useEffect, useState, type FormEvent } from 'react';
import LoadState from '../components/LoadState';
import { useAsync } from '../hooks/useAsync';
import {
  addBaby, getVaccinations, listBabies, markDoseGiven, unmarkDose,
  type Baby, type Checklist, type DoseItem,
} from '../services/api';
import { grams, longDate, shortDate } from '../utils/format';

const todayIso = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

function ageText(birth: string): string {
  const days = Math.floor((Date.now() - new Date(birth).getTime()) / 86_400_000);
  if (days < 0) return 'Not born yet';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} old`;
  if (days < 84) return `${Math.floor(days / 7)} weeks old`;
  const months = Math.floor(days / 30.44);
  return months < 24 ? `${months} months old` : `${Math.floor(months / 12)} years old`;
}

function BirthForm({ onSaved, first }: { onSaved: () => void; first: boolean }) {
  const [name, setName] = useState('');
  const [birth, setBirth] = useState(todayIso());
  const [sex, setSex] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!birth || birth > todayIso()) { setError('Enter the date your baby was born. It cannot be in the future.'); return; }
    const w = weight ? Math.round(Number(weight) * 1000) : undefined;
    if (w !== undefined && (!Number.isFinite(w) || w < 300 || w > 7000)) { setError('Birth weight should be between 0.3 and 7 kg.'); return; }
    setBusy(true);
    const res = await addBaby({ name: name.trim() || undefined, birth_date: birth, sex: sex || undefined, birth_weight_g: w });
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Could not save.'); return; }
    onSaved();
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card-head"><div className="card-title"><h3>{first ? 'Your baby has arrived' : 'Add another baby'}</h3></div></div>
      {first && <p className="form-hint">Congratulations. Add your baby to get a vaccination checklist. This also moves your journey to the postpartum stage.</p>}
      <div className="form-row">
        <label htmlFor="b-name">Name (optional)</label>
        <input id="b-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </div>
      <div className="form-row">
        <label htmlFor="b-birth">Date of birth</label>
        <input id="b-birth" type="date" max={todayIso()} value={birth} onChange={(e) => setBirth(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="b-sex">Sex (optional)</label>
        <select id="b-sex" value={sex} onChange={(e) => setSex(e.target.value)}>
          <option value="">Prefer not to say</option>
          <option value="female">Girl</option>
          <option value="male">Boy</option>
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="b-weight">Birth weight in kg (optional)</label>
        <input id="b-weight" inputMode="decimal" placeholder="e.g. 3.2" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn-block full" disabled={busy}>{busy ? 'Saving…' : 'Save baby'}</button>
    </form>
  );
}

const statusText: Record<string, string> = { overdue: 'Overdue', due: 'Due now', soon: 'Coming up', later: 'Later', given: 'Given' };

function Dose({ item, babyId, onChanged }: { item: DoseItem; babyId: string; onChanged: (c: Checklist) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function give(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await markDoseGiven(babyId, item.code, date);
    setBusy(false);
    if (!res.ok || !res.data) { setError(res.error ?? 'Could not save.'); return; }
    setOpen(false);
    onChanged(res.data);
  }

  async function undo() {
    if (!window.confirm(`Mark ${item.name} as not given?`)) return;
    const res = await unmarkDose(babyId, item.code);
    if (res.ok && res.data) onChanged(res.data);
  }

  return (
    <li className={`dose dose--${item.status}`}>
      <div className="dose-top">
        <div className="circle-main">
          <p className="circle-name">{item.name}</p>
          <p className="circle-meta">{item.protects_against}</p>
          <p className="circle-meta">
            {item.status === 'given' && item.given_date
              ? `Given ${longDate(item.given_date)}`
              : `${item.age_weeks === 0 ? 'At birth' : `At ${item.age_weeks} weeks`} · ${shortDate(item.due_date)}`}
          </p>
        </div>
        <div className="circle-actions">
          <span className={`dose-badge dose-badge--${item.status}`}>{statusText[item.status]}</span>
          {item.status === 'given' ? (
            <button type="button" className="btn-ghost" onClick={undo}>Undo</button>
          ) : (
            <button type="button" className="btn-ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? 'Close' : 'Mark as given'}
            </button>
          )}
        </div>
      </div>
      {open && (
        <form className="dose-form" onSubmit={give}>
          <div className="form-row">
            <label htmlFor={`d-${item.code}`}>Date given</label>
            <input id={`d-${item.code}`} type="date" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn-block" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
      )}
    </li>
  );
}

function Group({ title, items, babyId, onChanged, hint }: { title: string; items: DoseItem[]; babyId: string; onChanged: (c: Checklist) => void; hint?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="card">
      <div className="card-head"><div className="card-title"><h3>{title}</h3></div></div>
      {hint && <p className="form-hint">{hint}</p>}
      <ul className="circle-list">
        {items.map((i) => <Dose key={i.code} item={i} babyId={babyId} onChanged={onChanged} />)}
      </ul>
    </div>
  );
}

function BabyChecklist({ baby }: { baby: Baby }) {
  const [list, setList] = useState<Checklist | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setList(null); setError('');
    getVaccinations(baby.id).then((r) => {
      if (!alive) return;
      if (r.ok && r.data) setList(r.data); else setError(r.error ?? 'Could not load the checklist.');
    }).catch(() => alive && setError('Could not reach the server. Check your connection and try again.'));
    return () => { alive = false; };
  }, [baby.id]);

  if (error) return <div className="card" role="alert"><p>{error}</p></div>;
  if (!list) return <div className="skeleton skeleton--hero" role="status" aria-label="Loading" />;

  const by = (s: string[]) => list.items.filter((i) => s.includes(i.status));
  const attention = by(['overdue', 'due']);
  return (
    <>
      <div className={`status-panel ${attention.length ? 'status-panel--check' : 'status-panel--clear'}`} role="status">
        <p className="status-panel__title">
          {attention.length ? `${attention.length} vaccine${attention.length === 1 ? '' : 's'} to get at the clinic` : 'Vaccinations are up to date'}
        </p>
        <p className="status-panel__text">
          {attention.length ? 'Take your baby to a health facility. Vaccines are free at public clinics and it is not too late.' : 'We will show the next one here when it is close.'}
        </p>
      </div>
      <Group title="Needs attention" items={attention} babyId={baby.id} onChanged={setList} />
      <Group title="Coming up" items={by(['soon'])} babyId={baby.id} onChanged={setList} />
      <Group title="Given" items={by(['given'])} babyId={baby.id} onChanged={setList} />
      <Group title="Later" items={by(['later'])} babyId={baby.id} onChanged={setList} />
      <p className="form-hint">{list.note} This schedule is a guide and does not replace advice from your clinic.</p>
    </>
  );
}

function BabyPage() {
  const state = useAsync(listBabies);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section className="section active" id="sec-baby">
      <LoadState state={state}>
        {(babies) => {
          if (babies.length === 0 || adding) {
            return (
              <div className="baby-wrap">
                <BirthForm first={babies.length === 0} onSaved={() => { setAdding(false); state.reload(); }} />
                {adding && <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button>}
              </div>
            );
          }
          const baby = babies.find((b) => b.id === selected) ?? babies[0];
          return (
            <div className="baby-wrap">
              <div className="card">
                <div className="card-head">
                  <div className="card-title"><h3>{baby.name || 'Your baby'}</h3></div>
                  <button type="button" className="card-link" onClick={() => setAdding(true)}>Add another baby</button>
                </div>
                {babies.length > 1 && (
                  <div className="baby-tabs" role="tablist" aria-label="Choose a baby">
                    {babies.map((b) => (
                      <button key={b.id} type="button" role="tab" aria-selected={b.id === baby.id}
                        className={`chip-filter ${b.id === baby.id ? 'active' : ''}`} onClick={() => setSelected(b.id)}>
                        {b.name || longDate(b.birth_date)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="kv"><span>Age</span><span>{ageText(baby.birth_date)}</span></div>
                <div className="kv"><span>Born</span><span>{longDate(baby.birth_date)}</span></div>
                {baby.birth_weight_g ? <div className="kv"><span>Birth weight</span><span>{grams(baby.birth_weight_g)}</span></div> : null}
              </div>
              <BabyChecklist baby={baby} />
            </div>
          );
        }}
      </LoadState>
    </section>
  );
}

export default BabyPage;
