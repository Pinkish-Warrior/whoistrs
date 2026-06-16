const QUESTIONS = [
  'What projects has she shipped?',
  'How does she approach security?',
  'Can she own a project end to end?',
  'What stack does she work in?',
  'What did she do before tech?',
];

interface Props {
  onSelect: (q: string) => void;
}

export default function SuggestedQuestions({ onSelect }: Props) {
  return (
    <>
      <div className="boot">
        <div className="boot-line">
          <span className="boot-prompt">$</span>
          <span>whoistrs v1.0.0 — RAG profile assistant</span>
        </div>
        <div className="boot-line">
          <span className="boot-prompt">$</span>
          <span>Knowledge base loaded · London, UK · github.com/Pinkish-Warrior</span>
        </div>
        <div className="boot-line">
          <span className="boot-prompt">$</span>
          <span>Type a question or select from below</span>
        </div>
        <hr className="boot-divider" />
      </div>

      <div>
        <p className="suggested-label">suggested queries</p>
        <div className="suggested-list">
          {QUESTIONS.map((q, i) => (
            <button
              key={q}
              className="suggested-item"
              onClick={() => onSelect(q)}
            >
              <span className="suggested-idx">[{String(i + 1).padStart(2, '0')}]</span>
              {q}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
