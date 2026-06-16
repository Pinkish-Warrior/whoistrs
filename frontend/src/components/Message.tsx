import { useEffect, useState } from 'react';
import type { ChatMessage } from '../App';

interface Props {
  message: ChatMessage;
  typewrite: boolean;
}

function useTypewriter(text: string, active: boolean) {
  const [displayed, setDisplayed] = useState(active ? '' : text);

  useEffect(() => {
    if (!active) {
      setDisplayed(text);
      return;
    }
    let i = 0;
    setDisplayed('');
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text, active]);

  return displayed;
}

export default function Message({ message, typewrite }: Props) {
  const { role, content, sources } = message;
  const displayed = useTypewriter(content, role === 'assistant' && typewrite);
  const isTyping = role === 'assistant' && typewrite && displayed.length < content.length;

  if (role === 'user') {
    return (
      <div className="message">
        <div className="message-row">
          <span className="msg-prompt user">❯</span>
          <span className="msg-content user">{content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="message">
      <div className="message-row">
        <span className="msg-prompt system">$</span>
        <span className="msg-content assistant">
          {displayed}
          {isTyping && <span className="cursor" />}
        </span>
      </div>
      {!isTyping && sources.length > 0 && (
        <div className="sources">
          {sources.map(s => (
            <span key={s} className="source-pill">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}
