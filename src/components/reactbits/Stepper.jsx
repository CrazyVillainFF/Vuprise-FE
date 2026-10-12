import { Children, isValidElement } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import './Stepper.css';

export function Step({ title, description }) {
  return <span className="publish-step-label"><span>{title}</span>{description && <small>{description}</small>}</span>;
}

export default function Stepper({ children, step = 1, initialStep = 1, indicator = 'numbers', orientation = 'horizontal', transition = 'fade', disableStepIndicators = true, showFooter = false, theme = 'dark', accentColor = '#71d8f0', className = '', style }) {
  const steps = Children.toArray(children).filter(isValidElement);
  const current = Math.max(1, Math.min(steps.length, Number(step) || initialStep));
  return <ol className={`rb-stepper rb-stepper--${orientation} rb-stepper--${indicator} rb-stepper--${theme}${className ? ` ${className}` : ''}`} aria-label="Publishing progress" aria-live="polite" style={{ '--stepper-accent': accentColor, ...style }} data-transition={transition} data-footer={showFooter} data-disabled={disableStepIndicators}>
    {steps.map((entry, index) => {
      const number = index + 1; const done = number < current; const active = number === current;
      return <li key={entry.key || number} className={`rb-step${done ? ' is-done' : ''}${active ? ' is-active' : ''}`} aria-current={active ? 'step' : undefined}>
        <span className="rb-step__marker" aria-hidden="true">{done ? <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} /> : number}</span>
        <span className="rb-step__title">{entry.props.title || `Step ${number}`}</span>
        {index < steps.length - 1 && <span className="rb-step__connector" aria-hidden="true" />}
      </li>;
    })}
  </ol>;
}
