import { useEffect, useRef } from 'react';

import './AiThinkingIndicator.css';

const formatElapsed = (seconds) => (seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`);

// Lightweight inline status row shown while Vuprise AI is answering. The dots
// animate with opacity/transform only; the elapsed timer updates through a ref
// so the panel does not re-render every second.
const AiThinkingIndicator = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    const startedAt = performance.now();
    const id = setInterval(() => {
      if (timerRef.current) timerRef.current.textContent = formatElapsed(Math.floor((performance.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="ai-thinking" role="status" aria-label="Vuprise AI is thinking">
      <span className="ai-thinking__dots" aria-hidden="true">
        <span className="ai-thinking__dot" />
        <span className="ai-thinking__dot" />
        <span className="ai-thinking__dot" />
      </span>
      <span className="ai-thinking__label" aria-hidden="true">Thinking</span>
      <span ref={timerRef} className="ai-thinking__timer" aria-hidden="true">0s</span>
    </span>
  );
};

export default AiThinkingIndicator;
