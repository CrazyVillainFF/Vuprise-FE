import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import './PillNav.css';

export default function PillNav({ items = [], activeHref, className = '', ease = 'power2.out', baseColor = 'currentColor', pillColor = 'rgba(113,216,240,.16)', hoveredPillTextColor = '#71d8f0', pillTextColor = baseColor, initialLoadAnimation = true }) {
  const root = useRef(null);
  const hoverRefs = useRef([]);
  const tweenRefs = useRef([]);
  const reduceMotion = useRef(false);
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion.current = motionQuery.matches;
    if (!initialLoadAnimation || reduceMotion.current || !root.current) return undefined;
    const links = root.current.querySelectorAll('.pill-nav__link');
    const tween = gsap.fromTo(links, { y: 7, opacity: 0 }, { y: 0, opacity: 1, duration: .32, stagger: .05, ease, clearProps: 'transform,opacity' });
    return () => {
      tween.kill();
      tweenRefs.current.forEach((item) => item?.kill());
    };
  }, [ease, initialLoadAnimation]);

  const animatePill = useCallback((index, entering) => {
    if (reduceMotion.current) return;
    const circle = hoverRefs.current[index];
    const link = circle?.parentElement;
    if (!circle || !link) return;
    tweenRefs.current[index]?.kill();
    const label = link.querySelector('.pill-nav__label');
    const hoverLabel = link.querySelector('.pill-nav__label-hover');
    if (entering) {
      const timeline = gsap.timeline();
      timeline.to(circle, { scale: 1, duration: .34, ease, overwrite: true }, 0);
      if (label) timeline.to(label, { y: -3, duration: .2, ease, overwrite: true }, 0);
      if (hoverLabel) timeline.to(hoverLabel, { y: 0, opacity: 1, duration: .24, ease, overwrite: true }, 0.035);
      tweenRefs.current[index] = timeline;
    } else {
      const timeline = gsap.timeline();
      timeline.to(circle, { scale: 0, duration: .22, ease, overwrite: true }, 0);
      if (label) timeline.to(label, { y: 0, duration: .18, ease, overwrite: true }, 0);
      if (hoverLabel) timeline.to(hoverLabel, { y: 12, opacity: 0, duration: .16, ease, overwrite: true }, 0);
      tweenRefs.current[index] = timeline;
    }
  }, [ease]);

  return <nav ref={root} className={`pill-nav ${className}`.trim()} aria-label="Primary navigation" style={{ '--pill-base': baseColor, '--pill-bg': pillColor, '--pill-hover': hoveredPillTextColor, '--pill-text': pillTextColor }}>
    {items.map((item, index) => {
      const Icon = item.icon;
      const active = activeHref === item.href;
      return <Link key={item.href} className={`pill-nav__link${active ? ' is-active' : ''}`} to={item.href} aria-label={item.ariaLabel || item.label} aria-current={active ? 'page' : undefined} onMouseEnter={() => animatePill(index, true)} onMouseLeave={() => animatePill(index, false)} onFocus={() => animatePill(index, true)} onBlur={() => animatePill(index, false)}>
        <span className="pill-nav__hover-circle" aria-hidden="true" ref={(element) => { hoverRefs.current[index] = element; }} />
        <span className="pill-nav__content">
          <span className="pill-nav__icon">{item.badge > 0 ? <span className="pill-nav__badge">{Math.min(item.badge, 99)}</span> : null}<Icon aria-hidden="true" /></span>
          <span className="pill-nav__label-stack"><span className="pill-nav__label">{item.label}</span><span className="pill-nav__label-hover" aria-hidden="true">{item.label}</span></span>
        </span>
      </Link>;
    })}
  </nav>;
}
