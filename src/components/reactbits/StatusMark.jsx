import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import './StatusMark.css';

const labels = { pending: 'Pending', running: 'In progress', done: 'Completed', failed: 'Failed', cancelled: 'Cancelled' };

export default function StatusMark({ status = 'pending', progress, label, color = 'currentColor', doneColor = '#22c55e', errorColor = '#ef4444', size = 20, strokeWidth = 2, fontSize = 14, spinDuration = 1.1, className = '', style }) {
  const reduced = useReducedMotion();
  const rotation = useMotionValue(0);
  const determinate = status === 'running' && Number.isFinite(progress);
  useEffect(() => {
    if (status !== 'running' || determinate || reduced) { rotation.stop(); rotation.set(0); return undefined; }
    const controls = animate(rotation, 360, { duration: spinDuration, repeat: Infinity, ease: 'linear' });
    return () => controls.stop();
  }, [status, determinate, reduced, rotation, spinDuration]);
  const ring = status === 'running' && determinate ? `${Math.min(1, Math.max(0, progress)) * 100}%` : undefined;
  const spoken = `${labels[status] || labels.pending}${determinate ? `, ${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` : ''}`;
  return <span className={`status-mark${className ? ` ${className}` : ''}`} data-status={status} style={{ '--sm-size': `${size}px`, '--sm-stroke': `${strokeWidth}px`, '--sm-color': color, '--sm-done': doneColor, '--sm-error': errorColor, '--sm-font': `${fontSize}px`, ...style }}>
    <svg className="status-mark__glyph" viewBox="0 0 24 24" width={size} height={size} role={label == null ? 'img' : undefined} aria-label={label == null ? spoken : undefined} aria-hidden={label != null || undefined}>
      <circle className="status-mark__track" cx="12" cy="12" r={10 - strokeWidth / 2} />
      {status === 'running' ? <motion.circle className="status-mark__arc" cx="12" cy="12" r={10 - strokeWidth / 2} style={{ rotate: rotation, strokeDasharray: determinate ? `${ring} 100%` : '28% 72%' }} /> : null}
      {status === 'done' && <motion.path className="status-mark__check" d="M7.5 12.25 10.5 15.25 16.75 8.75" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .24 }} />}
      {(status === 'failed' || status === 'cancelled') && <motion.path className="status-mark__cross" d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .24 }} />}
      {status === 'pending' && <circle className="status-mark__pending" cx="12" cy="12" r="2" />}
    </svg>
    {label != null && <span className="status-mark__label"><span className="status-mark__sr">{spoken}: </span>{label}</span>}
  </span>;
}
