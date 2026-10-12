import { useEffect, useRef } from 'react';
import './SpotlightCard.css';

export default function SpotlightCard({ children, className = '', style, spotlightColor, intensity = .15, spotlightSize = 240, softness = .7, shape = 'circle', borderGlow = .6, proximity = 80, smoothing = .3, ambient = false, flare = true, grain = 0, theme = 'dark', ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let frame = 0; let point = { x: 0, y: 0 }; let current = { x: 0, y: 0, alpha: 0 }; let visible = true;
    const paint = () => {
      frame = 0; if (!visible) return;
      const bounds = node.getBoundingClientRect();
      const targetX = point.x - bounds.left; const targetY = point.y - bounds.top;
      const gap = Math.hypot(Math.max(0, -targetX, targetX - bounds.width), Math.max(0, -targetY, targetY - bounds.height));
      const targetAlpha = gap === 0 ? 1 : proximity ? Math.max(0, 1 - gap / proximity) : 0;
      const easing = reduce || !smoothing ? 1 : .24;
      current.x += (targetX - current.x) * easing; current.y += (targetY - current.y) * easing; current.alpha += (targetAlpha - current.alpha) * easing;
      node.style.setProperty('--spot-x', `${current.x}px`); node.style.setProperty('--spot-y', `${current.y}px`); node.style.setProperty('--spot-alpha', String(current.alpha * intensity));
      if (Math.abs(current.alpha - targetAlpha) > .005) frame = requestAnimationFrame(paint);
    };
    const onMove = event => { point = { x: event.clientX, y: event.clientY }; if (!frame) frame = requestAnimationFrame(paint); };
    const onLeave = () => { current.alpha = 0; node.style.setProperty('--spot-alpha', '0'); };
    const onVisibility = () => { visible = !document.hidden; if (visible && ambient && !reduce) frame = requestAnimationFrame(paint); };
    window.addEventListener('pointermove', onMove, { passive: true }); node.addEventListener('pointerleave', onLeave); document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('pointermove', onMove); node.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', onVisibility); if (frame) cancelAnimationFrame(frame); };
  }, [ambient, intensity, proximity, smoothing]);
  return <div ref={ref} className={`spotlight-card${className ? ` ${className}` : ''}`} data-theme={theme} data-shape={shape} data-flare={flare} style={{ '--spotlight-color': spotlightColor || (theme === 'dark' ? '255,255,255' : '15,23,42'), '--spotlight-size': `${spotlightSize}px`, '--spotlight-softness': softness, '--spotlight-border-glow': borderGlow, '--spotlight-grain': grain, ...style }} {...rest}>
    <span className="spotlight-card__light" aria-hidden="true" />{children}<span className="spotlight-card__border" aria-hidden="true" />
  </div>;
}
