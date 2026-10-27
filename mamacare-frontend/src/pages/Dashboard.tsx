import LoadState from '../components/LoadState';
import StatusPanel from '../components/StatusPanel';
import type { Section } from '../components/Sidebar';
import { useAsync } from '../hooks/useAsync';
import { getHome, type Checkup, type Home } from '../services/api';
import { greeting, grams, shortDate, sinceLabel } from '../utils/format';

interface Props {
  onNavigate: (section: Section) => void;
}

function nextCheckups(checkups: Checkup[]): Checkup[] {
  return checkups.filter((c) => c.status !== 'passed').slice(0, 3);
}

function Hero({ home, onNavigate }: { home: Home; onNavigate: (s: Section) => void }) {
  const p = home.progress;
  const pregnant = p.kind === 'pregnant';
  const weeksToGo = p.days_to_due != null ? Math.max(0, Math.round(p.days_to_due / 7)) : null;

  return (
    <section className="hero">
      <div className="blob blob1"></div>
      <div className="blob blob2"></div>
      <div className="blob blob3"></div>
      <div className="hero-inner">
        <div className="hero-top">
          <div className="greeting">
            <h1>{greeting()}, {home.first_name}</h1>
            <p>
              {pregnant
                ? weeksToGo != null && weeksToGo > 0
                  ? `About ${weeksToGo} ${weeksToGo === 1 ? 'week' : 'weeks'} until your due date.`
                  : 'Your due date is close.'
                : 'Take it gently. Here is what matters this week.'}
            </p>
            <div className="week-tracker">
              <div className="wt-label">
                <span>{pregnant ? 'Pregnancy progress' : 'Recovery to your six-week check'}</span>
                <strong>Week {p.week} of {p.of}</strong>
              </div>
              <div className="wt-track">
                <div className="wt-fill" style={{ width: `${p.percent}%` }}></div>
                {pregnant && (
                  <>
                    <div className="wt-tick" style={{ left: '32.5%' }}></div>
                    <div className="wt-tick" style={{ left: '67.5%' }}></div>
                  </>
                )}
              </div>
              <div className="wt-trimesters">
                {pregnant ? (
                  <>
                    <span>Trimester 1</span>
                    <span>Trimester 2</span>
                    <span>Trimester 3</span>
                  </>
                ) : (
                  <>
                    <span>Birth</span>
                    <span>Six-week check</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="hero-status">
            <StatusPanel level={home.status.level} flags={home.status.flags} compact onLog={() => onNavigate('journey')} />
            {home.status.last_logged_at && (
              <p className="ring-caption" style={{ marginTop: 8 }}>{sinceLabel(home.status.last_logged_at)}</p>
            )}
          </div>
        </div>
        <div className="quick-actions">
          <button type="button" className="qa-btn primary" onClick={() => onNavigate('chat')}>Ask Vera</button>
          <button type="button" className="qa-btn" onClick={() => onNavigate('journey')}>Log how I feel</button>
          <button type="button" className="qa-btn danger" onClick={() => onNavigate('emergency')}>Emergency help</button>
        </div>
      </div>
    </section>
  );
}

function Dashboard({ onNavigate }: Props) {
  const state = useAsync(getHome);

  return (
    <section className="section active" id="sec-dashboard">
      <LoadState state={state}>
        {(home) => {
          const upcoming = nextCheckups(home.checkups);
          const baby = home.baby_this_week;
          return (
            <>
              <Hero home={home} onNavigate={onNavigate} />
              <div className="row r1">
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">
                      <h3>{home.progress.kind === 'pregnant' ? 'Your baby this week' : 'Your recovery'}</h3>
                    </div>
                  </div>
                  {baby ? (
                    <>
                      <div className="pj-week">
                        {home.progress.week}<span> / 40 weeks</span>
                      </div>
                      <p className="pj-desc">
                        About {baby.length_cm} cm and {grams(baby.weight_g)} on average. {baby.text}
                      </p>
                      <p className="form-hint">Every baby grows at their own pace. Sizes are averages.</p>
                    </>
                  ) : (
                    <>
                      <div className="pj-week">
                        {home.progress.week}<span> {home.progress.week === 1 ? 'week' : 'weeks'} since birth</span>
                      </div>
                      <p className="pj-desc">
                        Rest when you can, eat regularly and drink water. Tell a health worker if you feel low for more
                        than two weeks, or at any point if you feel you cannot cope.
                      </p>
                      {home.babies.length > 0 && (
                        <p className="form-hint">Baby: {home.babies.map((b) => b.name || 'Unnamed').join(', ')}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">
                      <h3>Recommended checkups</h3>
                    </div>
                    <button type="button" className="card-link" onClick={() => onNavigate('insights')}>See all</button>
                  </div>
                  {upcoming.length === 0 ? (
                    <p className="pj-desc">No more checkups on the standard schedule. Follow your clinic’s advice.</p>
                  ) : (
                    upcoming.map((c) => (
                      <div key={`${c.week}-${c.title}`} className="milestone">
                        <span className="m-dot"></span>
                        <span className="m-week">{shortDate(c.approx_date)}</span>
                        <span className="m-text">{c.title}{c.who !== 'Mother' ? ` (${c.who})` : ''}</span>
                      </div>
                    ))
                  )}
                  <p className="form-hint">Dates are estimates. Your clinic’s schedule comes first.</p>
                </div>
              </div>
              <p className="disclaimer">
                MamaCare gives general guidance, not a diagnosis. If you feel unwell or worried, speak to a health worker. In an
                emergency call 999 or go to the nearest facility.
              </p>
            </>
          );
        }}
      </LoadState>
    </section>
  );
}

export default Dashboard;
