import { useState, useCallback } from 'react';
import { queryWorker } from './lib/api';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import SuggestedQuestions from './components/SuggestedQuestions';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="terminal">
      <header className="terminal-header">
        <span className="terminal-title">whoistrs</span>
        <span className="terminal-meta">$ profile assistant · London, UK</span>
      </header>

      <ChatWindow messages={messages} loading={loading} />

      {messages.length === 0 && !loading && (
        <SuggestedQuestions onSelect={handleQuery} />
      )}

      <InputBar onSubmit={handleQuery} disabled={loading} />
    </div>
  );
}
