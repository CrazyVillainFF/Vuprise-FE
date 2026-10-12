import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import './PillNav.css';

export default function PillNav({ items = [], activeHref, className = '', ease = 'power2.out', baseColor = 'currentColor', pillColor = 'rgba(113,216,240,.16)', hoveredPillTextColor = '#71d8f0', pillTextColor = baseColor, initialLoadAnimation = true }) {
  const root = useRef(null);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!initialLoadAnimation || reduce || !root.current) return undefined;
    const links = root.current.querySelectorAll('.pill-nav__link');
    const tween = gsap.fromTo(links, { y: 5, opacity: 0 }, { y: 0, opacity: 1, duration: .28, stagger: .045, ease, clearProps: 'all' });
    return () => tween.kill();
  }, [ease, initialLoadAnimation]);
  return <nav ref={root} className={`pill-nav ${className}`.trim()} aria-label="Primary navigation" style={{ '--pill-base': baseColor, '--pill-bg': pillColor, '--pill-hover': hoveredPillTextColor, '--pill-text': pillTextColor }}>
    {items.map((item) => {
      const Icon = item.icon;
      const active = activeHref === item.href;
      return <Link key={item.href} className={`pill-nav__link${active ? ' is-active' : ''}`} to={item.href} aria-label={item.ariaLabel || item.label} aria-current={active ? 'page' : undefined}>
        <span className="pill-nav__icon">{item.badge > 0 ? <span className="pill-nav__badge">{Math.min(item.badge, 99)}</span> : null}<Icon aria-hidden="true" /></span>
        <span className="pill-nav__label">{item.label}</span>
      </Link>;
    })}
  </nav>;
}
