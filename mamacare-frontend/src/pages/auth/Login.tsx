import { useState, type FormEvent } from 'react';
import { useAuth, userFromToken } from '../../context/AuthContext';
import { login } from '../../services/api';
import PasswordField from './PasswordField';

interface Props {
  onSwitch: () => void;
}

function Login({ onSwitch }: Props) {
  const { login: authLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login({ email, password });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Could not sign you in. Check your email and password.');
      return;
    }
    const d = res.data;
    authLogin(userFromToken(d), d.access_token);
  }

  return (
    <>
      <h1 className="auth-title" id="login-title">Welcome back</h1>
      <p className="auth-sub">Sign in to see your week and pick up where you left off.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-row">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
        />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New to MamaCare?{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>
          Create an account
        </button>
      </p>
    </>
  );
}

export default Login;
