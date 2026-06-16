import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../App';
import Message from './Message';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
}

export default function ChatWindow({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="chat-window">
      {messages.map((msg, i) => (
        <Message
          key={msg.id}
          message={msg}
          typewrite={i === messages.length - 1}
        />
      ))}

      {loading && (
        <div className="loading-row">
          <span className="msg-prompt system">$</span>
          <span>querying knowledge base<span className="cursor" /></span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
