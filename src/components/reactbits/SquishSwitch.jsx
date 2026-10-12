import { useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import './SquishSwitch.css';

export default function SquishSwitch({ checked = false, onChange, disabled = false, label, 'aria-label': ariaLabel, className = '' }) {
  const id = useId();
  const [held, setHeld] = useState(false);
  const start = useRef(null);
  const dragged = useRef(false);
  const reduced = useReducedMotion();
  const toggle = () => { if (!disabled) onChange?.(!checked); };
  const finish = (event) => {
    if (!start.current) return;
    const delta = event.clientX - start.current;
    dragged.current = Math.abs(delta) > 8;
    start.current = null;
    setHeld(false);
    if (Math.abs(delta) > 8) { if ((delta > 0) !== checked && !disabled) onChange?.(delta > 0); }
  };
  return <span className={`squish-switch-root${className ? ` ${className}` : ''}`}>
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={ariaLabel || label} aria-disabled={disabled} disabled={disabled} className="squish-switch" data-on={checked ? '' : undefined} data-held={held ? '' : undefined} onClick={() => { if (dragged.current) { dragged.current = false; return; } toggle(); }} onPointerDown={event => { start.current = event.clientX; event.currentTarget.setPointerCapture?.(event.pointerId); setHeld(true); }} onPointerUp={finish} onPointerCancel={() => { start.current = null; setHeld(false); }} onKeyDown={event => { if (event.key === 'Escape') setHeld(false); }}>
      <span className="squish-switch__track"><motion.span className="squish-switch__thumb" aria-hidden="true" animate={{ x: checked ? 38 : 4, scaleX: held ? 1.22 : 1, scaleY: held ? .9 : 1 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 28 }} /></span>
    </button>
    {label && <label htmlFor={id} className="squish-switch__label" onClick={toggle}>{label}</label>}
  </span>;
}
