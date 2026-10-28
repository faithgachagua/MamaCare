import { useState, type FormEvent } from 'react';
import LoadState from '../components/LoadState';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import {
  createInvite, getAccessLog, listGrants, listInvites, revokeGrant, revokeInvite, updateGrant,
  type Grant, type Invite, type Role, type Scope,
} from '../services/api';
import { allScopes, defaultScopes, inviteLink, inviteRoles, roleLabel, scopeLabels, scopeShort, whatsappLink } from '../utils/care';
import { longDate, shortDate } from '../utils/format';

function ScopePicker({ value, onChange, name }: { value: Scope[]; onChange: (s: Scope[]) => void; name: string }) {
  return (
    <fieldset className="scope-picker">
      <legend className="sr-only">What to share</legend>
      {allScopes.map((s) => {
        const checked = value.includes(s);
        return (
          <label key={s} className={`scope-opt ${checked ? 'on' : ''}`}>
            <input
              type="checkbox"
              name={`${name}-${s}`}
              checked={checked}
              onChange={() => onChange(checked ? value.filter((x) => x !== s) : allScopes.filter((x) => x === s || value.includes(x)))}
            />
            <span>
              <strong>{scopeLabels[s].title}</strong>
              <small>{scopeLabels[s].hint}</small>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function InviteForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('partner');
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(defaultScopes('partner'));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Enter the email address they will sign up with.'); return; }
    if (scopes.length === 0) { setError('Choose at least one thing to share.'); return; }
    setBusy(true);
    const res = await createInvite({ email: email.trim(), role, relationship_label: label.trim() || undefined, scopes });
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Could not create the invite.'); return; }
    setEmail(''); setLabel('');
    onCreated();
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card-head"><div className="card-title"><h3>Invite someone</h3></div></div>
      <p className="form-hint">They only see what you tick below, and you can change or stop it at any time.</p>
      <div className="form-row">
        <label htmlFor="inv-email">Their email</label>
        <input id="inv-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="form-row">
        <label htmlFor="inv-role">They are your</label>
        <select
          id="inv-role"
          value={role}
          onChange={(e) => { const r = e.target.value as Role; setRole(r); setScopes(defaultScopes(r)); }}
        >
          {inviteRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="inv-label">Relationship (optional)</label>
        <input id="inv-label" type="text" placeholder="e.g. Husband, Mother, Dr. Achieng" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <ScopePicker value={scopes} onChange={setScopes} name="inv" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn-block full" disabled={busy}>{busy ? 'Creating…' : 'Create invite link'}</button>
    </form>
  );
}

function InviteRow({ invite, motherName, onChanged }: { invite: Invite; motherName: string; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(invite.token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', link);
    }
  }

  return (
    <li className="circle-item">
      <div className="circle-main">
        <p className="circle-name">{invite.email}</p>
        <p className="circle-meta">
          {roleLabel(invite.role)}{invite.relationship_label ? ` · ${invite.relationship_label}` : ''} · waiting to join · expires {shortDate(invite.expires_at)}
        </p>
        <p className="circle-meta">Shares: {invite.scopes.map((s) => scopeShort[s]).join(', ')}</p>
      </div>
      <div className="circle-actions">
        <button type="button" className="btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
        <a className="btn-ghost" href={whatsappLink(motherName, invite.token)} target="_blank" rel="noreferrer">WhatsApp</a>
        <button
          type="button"
          className="btn-ghost danger"
          onClick={async () => { if (window.confirm(`Cancel the invite for ${invite.email}?`)) { await revokeInvite(invite.id); onChanged(); } }}
        >
          Cancel
        </button>
      </div>
    </li>
  );
}

function GrantRow({ grant, onChanged }: { grant: Grant; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [scopes, setScopes] = useState<Scope[]>(grant.scopes);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (scopes.length === 0) { setError('Choose at least one thing, or stop sharing instead.'); return; }
    setBusy(true); setError('');
    const res = await updateGrant(grant.id, scopes);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Could not save.'); return; }
    setOpen(false);
    onChanged();
  }

  return (
    <li className="circle-item circle-item--col">
      <div className="circle-top">
        <div className="circle-main">
          <p className="circle-name">{grant.grantee_name}</p>
          <p className="circle-meta">
            {roleLabel(grant.role)}{grant.relationship_label ? ` · ${grant.relationship_label}` : ''} · since {shortDate(grant.created_at)}
          </p>
          <p className="circle-meta">Sees: {grant.scopes.map((s) => scopeShort[s]).join(', ')}</p>
        </div>
        <div className="circle-actions">
          <button type="button" className="btn-ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Close' : 'Change'}
          </button>
          <button
            type="button"
            className="btn-ghost danger"
            onClick={async () => {
              if (window.confirm(`Stop sharing with ${grant.grantee_name}? They will lose access straight away.`)) {
                await revokeGrant(grant.id); onChanged();
              }
            }}
          >
            Stop sharing
          </button>
        </div>
      </div>
      {open && (
        <div className="circle-edit">
          <ScopePicker value={scopes} onChange={setScopes} name={`g-${grant.id}`} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="btn-block" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}
    </li>
  );
}

function CareCircle() {
  const { user } = useAuth();
  const invites = useAsync(listInvites);
  const grants = useAsync(listGrants);
  const log = useAsync(getAccessLog);
  const refresh = () => { invites.reload(); grants.reload(); log.reload(); };

  return (
    <section className="section active" id="sec-circle">
      <div className="row r1">
        <InviteForm onCreated={refresh} />
        <div className="card">
          <div className="card-head"><div className="card-title"><h3>Your care circle</h3></div></div>
          <LoadState state={grants}>
            {(list) => (
              <>
                {list.length === 0 && (
                  <p className="pj-desc">No one can see your information yet. Invite your partner, a family member or your doctor.</p>
                )}
                <ul className="circle-list">
                  {list.map((g) => <GrantRow key={g.id} grant={g} onChanged={refresh} />)}
                </ul>
              </>
            )}
          </LoadState>
          <LoadState state={invites}>
            {(list) => list.length > 0 ? (
              <>
                <h4 className="circle-sub">Waiting to join</h4>
                <ul className="circle-list">
                  {list.map((i) => <InviteRow key={i.id} invite={i} motherName={user?.fullName ?? 'A mother'} onChanged={refresh} />)}
                </ul>
              </>
            ) : <></>}
          </LoadState>
        </div>
      </div>
      <div className="row r1">
        <div className="card">
          <div className="card-head"><div className="card-title"><h3>Who has looked</h3></div></div>
          <LoadState state={log}>
            {(entries) => entries.length === 0 ? (
              <p className="pj-desc">Nobody has opened your information yet. Every time someone does, it will show here.</p>
            ) : (
              <ul className="circle-list">
                {entries.map((e, i) => (
                  <li key={i} className="circle-item">
                    <div className="circle-main">
                      <p className="circle-name">{e.viewer_name}</p>
                      <p className="circle-meta">
                        {longDate(e.accessed_at)} · {new Date(e.accessed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · saw {e.scopes.map((s) => scopeShort[s]).join(', ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </LoadState>
        </div>
      </div>
    </section>
  );
}

export default CareCircle;
