function Doctors() {
  return (
    <section className="section active" id="sec-doctors">
      <div className="card chat-shell">
        <div className="chat-list">
          {[
            { name: 'Dr. Achieng Otieno', role: 'OB-GYN · Online' },
            { name: 'James Mwangi', role: 'Midwife · Online' },
            { name: 'Dr. Grace Wanjiru', role: 'OB-GYN · Away' },
            { name: 'Vera', role: 'AI assistant' },
          ].map((doctor) => (
            <div key={doctor.name} className="chat-list-item" data-name={doctor.name} data-role={doctor.role}>
              <div>
                <div className="cl-name">{doctor.name}</div>
                <div className="cl-preview">{doctor.role}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="chat-main">
          <div className="chat-head">
            <div>
              <div id="chatHeadName" style={{ fontWeight: 700 }}>Vera</div>
              <div id="chatHeadRole" className="ai-status">AI assistant available</div>
            </div>
            <div id="chatPulse" className="pulse-ring active"></div>
          </div>
          <div id="chatBody" className="chat-body">
            <div className="bubble them">Hi Amina, how are you feeling after this week’s check-in?</div>
            <div className="bubble me">A bit more tired than usual, but otherwise okay.</div>
            <div className="bubble them">That’s normal at 24 weeks. Keep resting when you can, and tell me if it gets severe.</div>
          </div>
          <div className="chat-input">
            <input id="chatInput" type="text" placeholder="Send a message…" />
            <button id="chatSendBtn" className="chat-send" type="button">→</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Doctors;
