import { useEffect, useRef, useState } from 'react';
import Login from './Login';
import Register from './Register';
import JoinInvite from './JoinInvite';
import Logo from '../../components/Logo';

const PHOTO =
  'https://images.unsplash.com/photo-1746766414005-ee349f5f12bf?auto=format&fit=crop&w=1400&q=80';

// Photo: Richard Nyoni (Unsplash), a mother with her newborn in Ntcheu, Malawi.
// 40 ticks around the ring: one for each week of pregnancy.
const WEEK_TICKS = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2;
  const major = i % 10 === 0;
  const r1 = major ? 226 : 238;
  return { i, x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, x2: Math.cos(a) * 252, y2: Math.sin(a) * 252, major };
});

type View = 'login' | 'register';

// `inert` removes the hidden form from tab order and the accessibility tree.
const inertWhen = (hidden: boolean) => (hidden ? ({ inert: '' } as Record<string, string>) : {});

function AuthPage() {
  // A link like /?invite=TOKEN opens straight onto the invited person's sign-up.
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite'));
  const [view, setView] = useState<View>(inviteToken ? 'register' : 'login');
  const stageRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // After the panels swap, move focus to the first field of the visible form.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      stageRef.current?.querySelector<HTMLInputElement>('.auth-pane.is-active input:not([readonly])')?.focus();
    }, 420);
    return () => window.clearTimeout(t);
  }, [view]);

  return (
    <div className="auth-screen">
      <div ref={stageRef} className={`auth-stage auth-stage--${view}`}>
        <section
          className={`auth-pane auth-pane--login ${view === 'login' ? 'is-active' : ''}`}
          aria-labelledby="login-title"
          {...inertWhen(view !== 'login')}
        >
          <div className="auth-pane__body">
            <Logo />
            <Login onSwitch={() => setView('register')} />
          </div>
        </section>

        <section
          className={`auth-pane auth-pane--register ${view === 'register' ? 'is-active' : ''}`}
          aria-labelledby="register-title"
          {...inertWhen(view !== 'register')}
        >
          <div className="auth-pane__body">
            <Logo />
            {inviteToken ? (
              <JoinInvite token={inviteToken} onSwitch={() => setView('login')} />
            ) : (
              <Register onSwitch={() => setView('login')} />
            )}
          </div>
        </section>

        <aside className="auth-art" aria-hidden="true">
          <img className="auth-art__photo" src={PHOTO} alt="" loading="eager" referrerPolicy="no-referrer" />
          <div className="auth-art__veil" />
          <svg className="auth-art__svg" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
            <g className="auth-art__geo" transform="translate(560 150)">
              <g className="auth-art__spin auth-art__spin--slow">
                {WEEK_TICKS.map((t) => (
                  <line
                    key={t.i}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke="#fff"
                    strokeOpacity={t.major ? 0.9 : 0.5}
                    strokeWidth={t.major ? 2.5 : 1.5}
                    strokeLinecap="round"
                  />
                ))}
              </g>
              <circle className="auth-art__draw" r="190" pathLength="1" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" />
              <g className="auth-art__spin auth-art__spin--rev">
                <circle r="130" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round" />
              </g>
              <g className="auth-art__spin auth-art__spin--orbit">
                <circle cx="252" cy="0" r="7" fill="#ff6b6b" />
                <circle cx="252" cy="0" r="14" fill="none" stroke="#ff6b6b" strokeOpacity="0.6" />
              </g>
              <g className="auth-art__spin auth-art__spin--orbit-b">
                <circle cx="-190" cy="0" r="5" fill="#00b8a9" />
              </g>
            </g>
          </svg>

          <div className={`auth-art__copy ${view === 'login' ? 'is-active' : ''}`}>
            <h2>Pregnancy and recovery, in one place.</h2>
            <p>Pick up where you left off: your week, your notes, and Vera when you have questions.</p>
          </div>
          <div className={`auth-art__copy ${view === 'register' ? 'is-active' : ''}`}>
            <h2>Start from where you are today.</h2>
            <p>Tell us how far along you are and MamaCare shapes its guidance around you.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AuthPage;
