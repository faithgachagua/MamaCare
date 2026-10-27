function Centers() {
  return (
    <section className="section active" id="sec-centers">
      <div className="card" style={{ marginBottom: 22 }}>
        <div style={{ marginBottom: 16 }}>
          <span className="chip-filter active">All</span>
          <span className="chip-filter">Public</span>
          <span className="chip-filter">Private</span>
          <span className="chip-filter">Open 24/7</span>
        </div>
        <div className="map-mock tall">
          <div className="map-route" style={{ left: '15%', top: '30%', width: '30%' }}></div>
          <div className="map-route" style={{ left: '50%', top: '55%', width: '25%' }}></div>
          <div className="map-pin me" style={{ left: '46%', top: '50%' }}></div>
          <div className="map-pin" style={{ left: '20%', top: '25%' }}></div>
          <div className="map-pin" style={{ left: '74%', top: '38%' }}></div>
          <div className="map-pin" style={{ left: '62%', top: '72%' }}></div>
        </div>
      </div>
      <div className="row r3">
        {[
          { name: 'Pumwani Maternity Hospital', meta: 'Public · Open 24/7', dist: '2.3 km' },
          { name: 'Kenyatta National Hospital', meta: 'Public · Referral · Open 24/7', dist: '5.1 km' },
          { name: "Nairobi Women's Hospital", meta: 'Private · Hurlingham', dist: '6.8 km' },
        ].map((center) => (
          <div key={center.name} className="card">
            <div className="hc-row">
              <div>
                <div className="hc-name">{center.name}</div>
                <div className="hc-meta">{center.meta}</div>
              </div>
              <div className="hc-dist">{center.dist}</div>
            </div>
            <button className="btn-block full" style={{ marginTop: 14 }} type="button">
              Get directions
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Centers;
