import { useState, type KeyboardEvent } from 'react';

interface Props {
  onSubmit: (question: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');

  function submit() {
    const q = value.trim();
    if (!q || disabled) return;
    setValue('');
    onSubmit(q);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit();
  }

  return (
    <div className="input-bar">
      <div className="input-row">
        <span className="input-prompt">❯</span>
        <input
          className="input-field"
          type="text"
          placeholder={disabled ? '' : 'ask something about Tania...'}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {!disabled && value.trim() && (
          <span className="input-hint">↵ send</span>
        )}
      </div>
    </div>
  );
}
