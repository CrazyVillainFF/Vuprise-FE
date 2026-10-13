import { useRef } from 'react';
import './BorderGlow.css';

export default function BorderGlow({ children, className = '', edgeSensitivity = 30, glowColor = '0 0 100', borderRadius = 14, glowRadius = 20, glowIntensity = 1, coneSpread = 25, colors = ['rgba(var(--app-fg-rgb),.72)', 'rgba(var(--app-fg-rgb),.32)', 'rgba(var(--app-fg-rgb),.12)'], backgroundColor = 'transparent' }) {
  const ref = useRef(null);
  const move = (event) => {
    const node = ref.current; if (!node) return;
    const bounds = node.getBoundingClientRect();
    const x = event.clientX - bounds.left; const y = event.clientY - bounds.top;
    const edge = Math.min(x, y, bounds.width - x, bounds.height - y);
    const intensity = Math.max(0, Math.min(1, 1 - edge / Math.max(1, glowRadius)));
    node.style.setProperty('--glow-x', `${x}px`); node.style.setProperty('--glow-y', `${y}px`);
    node.style.setProperty('--glow-alpha', String(intensity * glowIntensity));
  };
  const leave = () => ref.current?.style.setProperty('--glow-alpha', '0');
  return <div ref={ref} className={`border-glow${className ? ` ${className}` : ''}`} onPointerMove={move} onPointerLeave={leave} style={{ '--edge-sensitivity': edgeSensitivity, '--glow-radius': `${glowRadius}px`, '--glow-cone': `${coneSpread}%`, '--glow-hsl': glowColor, '--glow-a': colors[0], '--glow-b': colors[1], '--glow-c': colors[2], '--glow-bg': backgroundColor, borderRadius: `${borderRadius}px` }}>{children}</div>;
}
