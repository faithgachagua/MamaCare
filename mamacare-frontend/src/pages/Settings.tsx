import { useEffect, useState, type FormEvent } from 'react';
import LoadState from '../components/LoadState';
import PasswordField from './auth/PasswordField';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { changePassword, getAccount, updateAccount, type Account } from '../services/api';
import { roleLabel } from '../utils/care';

function ProfileForm({ initial }: { initial: Account }) {
  const { updateUser } = useAuth();
  const [account, setAccount] = useState(initial);
  const [name, setName] = useState(account.full_name);
  const [phone, setPhone] = useState(account.phone ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = name !== account.full_name || phone !== (account.phone ?? '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (name.trim().length < 2) { setMsg({ ok: false, text: 'Please enter your full name.' }); return; }
    setBusy(true);
    const res = await updateAccount({ full_name: name.trim(), phone: phone.trim() || undefined });
    setBusy(false);
    if (!res.ok || !res.data) { setMsg({ ok: false, text: res.error ?? 'Could not save.' }); return; }
    updateUser({ fullName: res.data.full_name });
    setAccount(res.data);
    setMsg({ ok: true, text: 'Saved.' });
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card-head"><div className="card-title"><h3>Your details</h3></div></div>
      <div className="form-row">
        <label htmlFor="set-name">Full name</label>
        <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
      </div>
      <div className="form-row">
        <label htmlFor="set-email">Email address</label>
        <input id="set-email" type="email" value={account.email} readOnly aria-describedby="set-email-hint" />
        <p className="form-hint" id="set-email-hint">Your email is how you sign in, so it cannot be changed here.</p>
      </div>
      <div className="form-row">
        <label htmlFor="set-phone">Phone number</label>
        <input id="set-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} />
      </div>
      <div className="form-row">
        <span className="form-hint">Account type: {roleLabel(account.role)}</span>
      </div>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <button type="submit" className="btn-block full" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!current) { setMsg({ ok: false, text: 'Enter your current password.' }); return; }
    if (next.length < 8) { setMsg({ ok: false, text: 'Your new password must be at least 8 characters.' }); return; }
    setBusy(true);
    const res = await changePassword(current, next);
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: res.error ?? 'Could not change the password.' }); return; }
    setCurrent(''); setNext('');
    setMsg({ ok: true, text: 'Password changed.' });
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card-head"><div className="card-title"><h3>Change password</h3></div></div>
      <PasswordField id="set-current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField id="set-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <button type="submit" className="btn-block full" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>
    </form>
  );
}

function Settings() {
  const state = useAsync(getAccount);
  const { logout } = useAuth();
  useEffect(() => { document.title = 'Settings · MamaCare'; }, []);
  return (
    <section className="section active" id="sec-settings">
      <div className="baby-wrap">
        <LoadState state={state}>{(account) => <ProfileForm initial={account} />}</LoadState>
        <PasswordForm />
        <div className="card">
          <div className="card-head"><div className="card-title"><h3>Sign out</h3></div></div>
          <p className="pj-desc">You will need your email and password to sign back in.</p>
          <button type="button" className="btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </div>
    </section>
  );
}

export default Settings;
