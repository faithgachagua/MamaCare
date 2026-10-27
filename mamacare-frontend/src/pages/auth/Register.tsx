import { useState, type FormEvent } from 'react';
import { useAuth, userFromToken } from '../../context/AuthContext';
import { register, type Stage } from '../../services/api';
import PasswordField from './PasswordField';

interface Props {
  onSwitch: () => void;
}

type Step = 1 | 2 | 3;

function Register({ onSwitch }: Props) {
  const { login: authLogin } = useAuth();

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields
  const [stage, setStage] = useState<Stage>('pregnant');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [useDueDate, setUseDueDate] = useState(false);
  const [lmpDate, setLmpDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Computed preview from LMP
  function previewWeek(): number | null {
    if (stage === 'postpartum') {
      if (!deliveryDate) return null;
      const days = Math.floor((Date.now() - new Date(deliveryDate).getTime()) / 86_400_000);
      return Math.max(0, Math.floor(days / 7));
    }
    if (!lmpDate) return null;
    const days = Math.floor((Date.now() - new Date(lmpDate).getTime()) / 86_400_000);
    return Math.max(0, Math.min(42, Math.floor(days / 7)));
  }

  function previewDueDate(): string | null {
    if (stage === 'postpartum') return null;
    if (lmpDate) {
      const d = new Date(lmpDate);
      d.setDate(d.getDate() + 280);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (dueDate) {
      return new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return null;
  }

  function validateStep1(): boolean {
    if (!fullName.trim()) { setError('Please enter your full name.'); return false; }
    if (!email.trim()) { setError('Please enter your email address.'); return false; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return false; }
    return true;
  }

  function validateStep2(): boolean {
    if (stage === 'postpartum') {
      if (!deliveryDate) { setError('Please enter the day your baby was born.'); return false; }
      if (new Date(deliveryDate) > new Date()) { setError('The delivery date cannot be in the future.'); return false; }
      return true;
    }
    if (!useDueDate && !lmpDate) { setError('Please enter the first day of your last period.'); return false; }
    if (useDueDate && !dueDate) { setError('Please enter your due date.'); return false; }
    return true;
  }

  function handleNext(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) handleSubmit();
    }
  }

  async function handleSubmit() {
    setLoading(true);
    const res = await register({
      full_name: fullName.trim(),
      email,
      phone: phone.trim() || undefined,
      password,
      stage,
      lmp_date: stage === 'pregnant' && !useDueDate ? lmpDate : undefined,
      due_date: stage === 'pregnant' && useDueDate ? dueDate : undefined,
      delivery_date: stage === 'postpartum' ? deliveryDate : undefined,
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Registration failed. Please try again.');
      setStep(1);
      return;
    }
    const d = res.data;
    authLogin(userFromToken(d), d.access_token);
  }

  const week = previewWeek();
  const due = previewDueDate();

  return (
    <>
        {/* Step indicator */}
        <div className="auth-steps">
          {([1, 2] as Step[]).map((s) => (
            <div key={s} className={`auth-step ${step >= s ? 'auth-step--done' : ''} ${step === s ? 'auth-step--active' : ''}`}>
              <div className="auth-step__dot">{step > s ? '✓' : s}</div>
              <span>{s === 1 ? 'Your account' : 'Your journey'}</span>
            </div>
          ))}
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <h1 className="auth-title" id="register-title">Create your account</h1>
            <p className="auth-sub">It takes about a minute.</p>

            <form onSubmit={handleNext} className="auth-form">
              <div className="form-row">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Amina Wanjiru"
                  required
                  autoComplete="name"
                />
              </div>

              <div className="form-row">
                <label htmlFor="reg-email">Email address</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-row">
                <label htmlFor="phone">Phone number <span className="auth-optional">(optional)</span></label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 700 000 000"
                  autoComplete="tel"
                />
              </div>

              <PasswordField
                id="reg-password"
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />

              <PasswordField
                id="confirmPassword"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" className="auth-btn">Continue →</button>
            </form>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <h1 className="auth-title" id="register-title">Where are you now?</h1>
            <p className="auth-sub">This helps Vera give you guidance that fits your week.</p>

            <form onSubmit={handleNext} className="auth-form">
              <div className="auth-segment" role="radiogroup" aria-label="Where you are in your journey">
                {([['pregnant', "I'm pregnant"], ['postpartum', "I've had my baby"]] as Array<[Stage, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={stage === value}
                    className={`auth-segment__opt ${stage === value ? 'is-on' : ''}`}
                    onClick={() => { setStage(value); setError(''); }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {stage === 'postpartum' && (
                <div className="form-row">
                  <label htmlFor="deliveryDate">Day your baby was born</label>
                  <input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <span className="form-hint">You can add your baby's name and details after you sign up.</span>
                </div>
              )}

              {stage === 'pregnant' && (
              <>
              {/* Toggle */}
              <div className="auth-toggle-row">
                <span className={!useDueDate ? 'auth-toggle-label--active' : 'auth-toggle-label'}>I know my last period</span>
                <button
                  type="button"
                  className={`switch ${useDueDate ? 'on' : ''}`}
                  onClick={() => { setUseDueDate(!useDueDate); setError(''); }}
                  aria-label="Toggle between LMP and due date"
                />
                <span className={useDueDate ? 'auth-toggle-label--active' : 'auth-toggle-label'}>I know my due date</span>
              </div>

              {!useDueDate ? (
                <div className="form-row">
                  <label htmlFor="lmpDate">First day of last menstrual period</label>
                  <input
                    id="lmpDate"
                    type="date"
                    value={lmpDate}
                    onChange={(e) => setLmpDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <span className="form-hint">This is how doctors calculate your gestational age.</span>
                </div>
              ) : (
                <div className="form-row">
                  <label htmlFor="dueDate">Expected due date</label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              )}

              </>
              )}

              {/* Live preview */}
              {(week !== null || due) && (
                <div className="auth-preview">
                  {week !== null && (
                    <div className="auth-preview__item">
                      <span className="auth-preview__num">{week}</span>
                      <span className="auth-preview__label">{stage === 'postpartum' ? 'weeks since birth' : 'weeks along'}</span>
                    </div>
                  )}
                  {due && (
                    <div className="auth-preview__item">
                      <span className="auth-preview__num">{due}</span>
                      <span className="auth-preview__label">estimated due date</span>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="auth-error" role="alert">{error}</p>}

              <div className="auth-btn-row">
                <button type="button" className="auth-btn auth-btn--ghost" onClick={() => { setStep(1); setError(''); }}>
                  ← Back
                </button>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create my account'}
                </button>
              </div>
            </form>
          </>
        )}

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onSwitch}>
            Sign in
          </button>
        </p>
    </>
  );
}

export default Register;
