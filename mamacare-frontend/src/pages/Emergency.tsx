import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { getCatalog } from '../services/api';

type Geo = { state: 'idle' } | { state: 'busy' } | { state: 'ok'; url: string } | { state: 'fail'; message: string };

function UrgentSigns() {
  const state = useAsync(getCatalog);
  const urgent = state.data?.symptoms.filter((s) => s.level === 'urgent') ?? [];
  if (urgent.length === 0) return null;
  return (
    <div className="card">
      <div className="card-head"><div className="card-title"><h3>Go to a hospital now if you have</h3></div></div>
      <ul className="em-signs">
        {urgent.map((s) => <li key={s.key}>{s.label}</li>)}
      </ul>
    </div>
  );
}

/** Works without any sign-in data: calling, finding care and sending your location need nothing from the server. */
function Emergency() {
  const { user } = useAuth();
  const [geo, setGeo] = useState<Geo>({ state: 'idle' });

  function locate() {
    if (!navigator.geolocation) { setGeo({ state: 'fail', message: 'This device cannot share its location.' }); return; }
    setGeo({ state: 'busy' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ state: 'ok', url: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}` }),
      (err) => setGeo({
        state: 'fail',
        message: err.code === err.PERMISSION_DENIED
          ? 'Location is switched off for this site. Allow it in your browser settings, or tell people where you are.'
          : 'Could not find your location. Tell people where you are.',
      }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const text = geo.state === 'ok'
    ? `I need urgent help${user?.fullName ? ` (${user.fullName})` : ''}. My location: ${geo.url}`
    : '';

  return (
    <section className="section active" id="sec-emergency">
      <div className="em-call">
        <p className="em-call__title">Is this an emergency?</p>
        <p className="em-call__text">Heavy bleeding, fits, severe headache with blurred vision, trouble breathing, or a baby not moving. Do not wait.</p>
        <a className="em-call__btn" href="tel:999">Call 999</a>
        <a className="em-call__alt" href="tel:112">or call 112</a>
      </div>

      <div className="row r2">
        <div className="card">
          <div className="card-head"><div className="card-title"><h3>Find the nearest hospital</h3></div></div>
          <p className="pj-desc">Opens a map of maternity services near you. Choose one that is open and can do a caesarean section if you can.</p>
          <a className="btn-block full em-link" href="https://www.google.com/maps/search/maternity+hospital+near+me" target="_blank" rel="noreferrer">
            Open map
          </a>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title"><h3>Tell someone where you are</h3></div></div>
          <p className="pj-desc">Get a link to your exact location and send it by WhatsApp or SMS.</p>
          {geo.state !== 'ok' && (
            <button type="button" className="btn-block full" onClick={locate} disabled={geo.state === 'busy'}>
              {geo.state === 'busy' ? 'Finding you…' : 'Get my location'}
            </button>
          )}
          {geo.state === 'fail' && <p className="form-error" role="alert" style={{ marginTop: 10 }}>{geo.message}</p>}
          {geo.state === 'ok' && (
            <div className="em-share">
              <a className="btn-block full em-link" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              <a className="btn-ghost em-link" href={`sms:?&body=${encodeURIComponent(text)}`}>Send as SMS</a>
            </div>
          )}
        </div>
      </div>

      {user?.role === 'mother' && <UrgentSigns />}

      <p className="form-hint">
        MamaCare cannot call for help or send your location by itself. Numbers are the national emergency lines. Please confirm the
        local numbers and ambulance options for your county.
      </p>
    </section>
  );
}

export default Emergency;
