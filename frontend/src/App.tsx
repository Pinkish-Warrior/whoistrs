import { useState, useCallback } from 'react';
import { queryWorker } from './lib/api';
import { downloadTranscript } from './lib/transcript';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import SuggestedQuestions from './components/SuggestedQuestions';
import EmailGate from './components/EmailGate';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
}

export default function App() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAuthenticated = useCallback((email: string, token: string) => {
    sessionStorage.setItem('whoistrs_session', token);
    setSessionEmail(email);
  }, []);

  const handleQuery = useCallback(async (question: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      sources: [],
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await queryWorker(question);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!sessionEmail) {
    return <EmailGate onAuthenticated={handleAuthenticated} />;
  }

  const hasResponse = messages.some(m => m.role === 'assistant');

  return (
    <div className="terminal">
      <header className="terminal-header">
        <span className="terminal-title">whoistrs</span>
        <span className="terminal-meta">$ profile assistant · London, UK</span>
        {hasResponse && (
          <button
            className="export-btn"
            onClick={() => downloadTranscript(messages, sessionEmail)}
          >
            ↓ export
          </button>
        )}
      </header>

      <ChatWindow messages={messages} loading={loading} />

      {messages.length === 0 && !loading && (
        <SuggestedQuestions onSelect={handleQuery} />
      )}

      <InputBar onSubmit={handleQuery} disabled={loading} />
    </div>
  );
}
