function Messages() {
  return (
    <section className="section active" id="sec-messages">
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <h3>Messages</h3>
          </div>
        </div>
        <div className="msg-row">
          <div>
            <div className="cl-name">Dr. Achieng Otieno</div>
            <div className="cl-preview">Can you confirm your next appointment date?</div>
          </div>
          <div className="unread"></div>
        </div>
        <div className="msg-row">
          <div>
            <div className="cl-name">James Mwangi</div>
            <div className="cl-preview">Please log your blood pressure again today.</div>
          </div>
        </div>
        <div className="msg-row">
          <div>
            <div className="cl-name">Family chat</div>
            <div className="cl-preview">Your mom sent a message about the clinic visit.</div>
          </div>
          <div className="unread"></div>
        </div>
      </div>
    </section>
  );
}

export default Messages;
