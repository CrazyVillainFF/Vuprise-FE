import { useCallback, useEffect, useRef, useState } from 'react';
import './PixelSwap.css';

const MAX_PIXELS = 220;
export default function PixelSwap({ firstContent, secondContent, pixelSize = 12, gap = 0, duration = 420, pixelDuration = 300, pattern = 'diagonal', randomness = 0, trigger = 'manual', active, initialActive = false, onActiveChange, onComplete, aspectRatio = '1 / 1', className = '', style }) {
  const [internal, setInternal] = useState(initialActive);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const root = useRef(null);
  const desired = active ?? internal;
  const request = useCallback(next => { if (active === undefined) setInternal(next); onActiveChange?.(next); }, [active, onActiveChange]);
  useEffect(() => {
    if (!root.current) return undefined;
    const node = root.current;
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const columns = Math.max(1, Math.ceil(size.width / Math.max(8, pixelSize)));
  const rows = Math.max(1, Math.ceil(size.height / Math.max(8, pixelSize)));
  const count = Math.min(MAX_PIXELS, rows * columns);
  const tiles = Array.from({ length: count }, (_, index) => {
    const x = index % columns; const y = Math.floor(index / columns);
    const order = pattern === 'left-to-right' ? x / columns : pattern === 'center' ? Math.hypot(x / columns - .5, y / rows - .5) : (x + y) / Math.max(1, columns + rows - 2);
    const scatter = ((Math.sin((index + 1) * 127.1) * 43758.5453) % 1 + 1) % 1;
    const delay = Math.max(0, (order * (1 - randomness) + scatter * randomness) * Math.max(0, duration - pixelDuration));
    return <span key={index} className="pixel-swap__tile" style={{ left: `${(x / columns) * 100}%`, top: `${(y / rows) * 100}%`, width: `${100 / columns + .25}%`, height: `${100 / rows + .25}%`, transitionDelay: `${delay}ms`, transitionDuration: `${pixelDuration}ms` }} />;
  });
  return <div ref={root} className={`pixel-swap ${className}`.trim()} style={{ aspectRatio, ...style }} data-active={desired} onClick={trigger === 'click' ? () => request(!desired) : undefined} onMouseEnter={trigger === 'hover' ? () => request(true) : undefined} onMouseLeave={trigger === 'hover' ? () => request(false) : undefined} onTransitionEnd={event => { if (event.target.classList.contains('pixel-swap__tile')) onComplete?.(desired); }}>
    <span className="pixel-swap__content" aria-hidden={desired}>{firstContent}</span><span className="pixel-swap__content pixel-swap__incoming" aria-hidden={!desired}>{secondContent}</span>
    <span className="pixel-swap__tiles" aria-hidden="true">{tiles}</span>
  </div>;
}
