function Fund() {
  return (
    <section className="section active" id="sec-fund">
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-head">
          <div className="card-title">
            <div className="card-icon" style={{ background: 'var(--coral-tint)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C73B3B" strokeWidth="2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Mama Fund</h3>
          </div>
        </div>
        <p className="pj-desc">Donor-backed support for transport and treatment costs when you need it most.</p>
        <div className="fund-stat">
          <div className="f-label">Available this month</div>
          <div className="f-value">KES 45,000</div>
        </div>
        <div className="fund-stat">
          <div className="f-label">Your request · KES 12,500 of 30,000</div>
          <div className="fund-bar">
            <i style={{ width: '42%' }}></i>
          </div>
        </div>
        <button className="btn-block" type="button">Apply for support</button>
      </div>
    </section>
  );
}

export default Fund;
