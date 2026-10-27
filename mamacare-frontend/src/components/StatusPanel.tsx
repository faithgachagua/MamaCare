import type { Flag, StatusLevel } from '../services/api';

export const statusCopy: Record<StatusLevel, { title: string; text: string }> = {
  urgent: { title: 'Get care now', text: 'You logged a warning sign.' },
  check: { title: 'Speak to a health worker today', text: 'Something you logged needs a check.' },
  clear: { title: 'Nothing concerning logged', text: 'This only reflects what you have logged.' },
  no_data: { title: 'Nothing logged yet', text: 'Log how you feel to get warning-sign checks.' },
};

interface Props {
  level: StatusLevel;
  flags: Flag[];
  onLog?: () => void;
  compact?: boolean;
}

/** The answer to "is anything wrong?". Urgent states are announced to screen readers straight away. */
function StatusPanel({ level, flags, onLog, compact }: Props) {
  const copy = statusCopy[level];
  return (
    <div className={`status-panel status-panel--${level}`} role={level === 'urgent' ? 'alert' : 'status'}>
      <p className="status-panel__title">{copy.title}</p>
      {flags.length === 0 && <p className="status-panel__text">{copy.text}</p>}
      {flags.map((f) => (
        <div key={f.id} className="status-flag">
          <p className="status-flag__title">{f.title}</p>
          {!compact && <p className="status-flag__detail">{f.detail}</p>}
          <p className="status-flag__action">{f.action}</p>
        </div>
      ))}
      {level === 'urgent' && (
        <a className="status-panel__call" href="tel:999">Call 999</a>
      )}
      {onLog && (level === 'no_data' || level === 'clear') && (
        <button type="button" className="status-panel__btn" onClick={onLog}>Log how you feel</button>
      )}
    </div>
  );
}

export default StatusPanel;
