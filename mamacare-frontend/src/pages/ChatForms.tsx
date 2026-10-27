import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { askAi, postSymptom, postVital } from '../services/api';

function ChatForms() {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ role: 'me' | 'them'; text: string }>>(() => [
    { role: 'them', text: `Hi ${user?.fullName?.split(' ')[0] ?? 'there'}, how are you feeling today?` },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('mamacare-active-session');
    if (existing) {
      setSessionId(existing);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('mamacare-active-session', sessionId);
    }
  }, [sessionId]);

  async function handleAsk() {
    if (!question.trim()) return;
    const userMessage = { role: 'me' as const, text: question.trim() };
    setChatLog((current) => [...current, userMessage]);
    setQuestion('');
    setIsLoading(true);

    const response = await askAi({ question: userMessage.text, session_id: sessionId ?? undefined });
    setIsLoading(false);

    if (!response.ok) {
      setChatLog((current) => [...current, { role: 'them', text: response.error ?? 'AI request failed.' }]);
      return;
    }

    const data = response.data as { answer: string; session_id: string };
    setChatLog((current) => [...current, { role: 'them', text: data.answer }]);
    setSessionId(data.session_id);
  }

  async function handleQuickLog(type: 'symptom' | 'vital') {
    if (type === 'symptom') {
      await postSymptom({ symptom_type: 'Fatigue', severity: 2, description: 'Tired today, but okay.' });
    } else {
      await postVital({ vital_type: 'Blood pressure', value_text: '118 / 76', unit: 'mmHg' });
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <h3>Ask Vera</h3>
          </div>
        </div>
        <p className="pj-desc">Share a quick question and Vera will use your pregnancy context and recent logs to answer.</p>
        <div className="chat-body" style={{ minHeight: 180 }}>
          {chatLog.map((message, idx) => (
            <div key={idx} className={`bubble ${message.role === 'me' ? 'me' : 'them'}`}>
              {message.text}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask Vera a question…"
            disabled={isLoading}
          />
          <button className="chat-send" type="button" onClick={handleAsk} disabled={isLoading}>
            →
          </button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <div className="card-head">
          <div className="card-title">
            <h3>Daily log quick actions</h3>
          </div>
        </div>
        <button className="btn-block full" type="button" onClick={() => handleQuickLog('symptom')}>
          Log today&apos;s symptom
        </button>
        <button className="btn-block full" type="button" style={{ marginTop: 12 }} onClick={() => handleQuickLog('vital')}>
          Log today's vital
        </button>
      </div>
    </div>
  );
}

export default ChatForms;
