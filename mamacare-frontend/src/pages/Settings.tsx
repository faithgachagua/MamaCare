function Settings() {
  return (
    <section className="section active" id="sec-settings">
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <h3>Account settings</h3>
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" type="text" defaultValue="Amina Wanjiru" />
        </div>
        <div className="form-row">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" defaultValue="amina@example.com" />
        </div>
        <div className="form-row">
          <label htmlFor="phone">Phone number</label>
          <input id="phone" type="tel" defaultValue="+254 712 345 678" />
        </div>
        <div className="toggle-row">
          <div>
            <div className="tr-text">AI guidance reminders</div>
            <div className="tr-sub">Receive a daily check-in prompt from Vera.</div>
          </div>
          <div className="switch on"></div>
        </div>
        <div className="toggle-row">
          <div>
            <div className="tr-text">Share updates with family</div>
            <div className="tr-sub">Allow family members to see your daily log summaries.</div>
          </div>
          <div className="switch"></div>
        </div>
      </div>
    </section>
  );
}

export default Settings;
