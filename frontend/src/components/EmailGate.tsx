import { useState, FormEvent, useRef, useEffect } from 'react';
import { authenticate } from '../lib/api';

const FREE_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'me.com', 'aol.com', 'protonmail.com', 'proton.me', 'live.com',
  'msn.com', 'ymail.com', 'googlemail.com',
]);

interface Props {
  onAuthenticated: (email: string, token: string) => void;
}

export default function EmailGate({ onAuthenticated }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    const atIdx = trimmed.lastIndexOf('@');
    if (atIdx < 1) {
      setError('please enter a valid email address.');
      return;
    }
    const domain = trimmed.slice(atIdx + 1);

    if (FREE_DOMAINS.has(domain)) {
      setError('please use your work email — personal domains not accepted.');
      return;
    }

    setLoading(true);
    try {
      const token = await authenticate(trimmed);
      onAuthenticated(trimmed, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-logo">whoistrs</div>
      <div className="gate-label">enter your work email to continue</div>
      <form onSubmit={handleSubmit}>
        <div className="gate-row">
          <span className="input-prompt">{'>'}</span>
          <input
            ref={inputRef}
            className="gate-field"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={loading}
            autoComplete="email"
          />
        </div>
        {error && <div className="gate-error">{error}</div>}
        <div className="gate-hint">
          {loading ? 'authenticating...' : 'press enter to continue'}
        </div>
        <div className="gate-info">15 questions per hour</div>
      </form>
    </div>
  );
}
