function Emergency() {
  return (
    <section className="section active" id="sec-emergency">
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <h3>Emergency support</h3>
          </div>
        </div>
        <p className="pj-desc">If you need urgent help, use the buttons below to reach the nearest facility and notify your support circle.</p>
        <div className="row r2">
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>Call emergency</h3>
            <p className="pj-desc">999</p>
            <button className="btn-block danger" type="button">Call now</button>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>Emergency route</h3>
            <p className="pj-desc">Open directions to the nearest health center and share your location.</p>
            <button className="btn-block" type="button">Open route</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Emergency;
