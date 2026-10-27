import { useState } from 'react';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete: 'current-password' | 'new-password';
}

function PasswordField({ id, label, value, onChange, placeholder, autoComplete }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      <div className="auth-pw">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="auth-pw__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export default PasswordField;
