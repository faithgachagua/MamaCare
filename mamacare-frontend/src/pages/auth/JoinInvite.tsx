import { useEffect, useState, type FormEvent } from 'react';
import { useAuth, userFromToken } from '../../context/AuthContext';
import { previewInvite, register, type InvitePreview, type Scope } from '../../services/api';
import PasswordField from './PasswordField';

interface Props {
  token: string;
  onSwitch: () => void;
}

const scopeText: Record<Scope, string> = {
  journey: 'where she is in her journey',
  symptoms: 'her symptoms',
  vitals: 'her vitals',
  baby: 'her baby’s details',
};

const roleText: Record<string, string> = {
  partner: 'her partner',
  family: 'a family member',
  doctor: 'her doctor',
};

function joinList(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Sign-up for someone a mother has invited. No pregnancy questions: this account is about her, not them. */
function JoinInvite({ token, onSwitch }: Props) {
  const { login: authLogin } = useAuth();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    previewInvite(token).then((res) => {
      if (!alive) return;
      if (res.ok && res.data) {
        setInvite(res.data);
        setState('ready');
      } else {
        setState('invalid');
      }
    });
    return () => { alive = false; };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    const res = await register({
      full_name: fullName.trim(),
      email: invite.email,
      phone: phone.trim() || undefined,
      password,
      invite_token: token,
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Could not create your account. Please try again.');
      return;
    }
    authLogin(userFromToken(res.data), res.data.access_token);
  }

  if (state === 'loading') {
    return <p className="auth-sub" role="status">Checking your invitation…</p>;
  }

  if (state === 'invalid' || !invite) {
    return (
      <>
        <h1 className="auth-title" id="register-title">This invitation has expired</h1>
        <p className="auth-sub">Ask the person who invited you to send a new one. Invitations last 7 days and work once.</p>
        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onSwitch}>Sign in</button>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title" id="register-title">Join {invite.mother_name}’s care circle</h1>
      <p className="auth-sub">
        You’re invited as {roleText[invite.role] ?? invite.role}. You’ll see{' '}
        {joinList(invite.scopes.map((s) => scopeText[s]))}. She can change this or remove your access at any time.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-row">
          <label htmlFor="join-email">Email address</label>
          <input id="join-email" type="email" value={invite.email} readOnly />
          <span className="form-hint">The invitation was sent to this address.</span>
        </div>
        <div className="form-row">
          <label htmlFor="join-name">Full name</label>
          <input id="join-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        </div>
        <div className="form-row">
          <label htmlFor="join-phone">Phone number <span className="auth-optional">(optional)</span></label>
          <input id="join-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>
        <PasswordField
          id="join-password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Creating account…' : 'Join care circle'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>Sign in</button>
      </p>
    </>
  );
}

export default JoinInvite;
