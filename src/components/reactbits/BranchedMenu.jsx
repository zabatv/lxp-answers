'use client';

// На основе ReactBits BranchedMenu. Убрана зависимость от @hugeicons:
// иконки передаются как React-элементы (необязательны).
// Дополнено: управляемый `active` (раздел с ним раскрывается сам),
// `meta` у раздела и у пункта (метки справа), шеврон и `title` (подсказка) у пунктов.
import { isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './BranchedMenu.css';

const DEFAULT_ITEMS = [
  {
    label: 'Getting started',
    children: [
      { value: 'install', label: 'Installation' },
      { value: 'quick', label: 'Quick start' },
      { value: 'config', label: 'Configuration' },
      { value: 'theming', label: 'Theming' }
    ]
  },
  {
    label: 'Components',
    children: [
      { value: 'buttons', label: 'Buttons' },
      { value: 'typography', label: 'Typography' },
      { value: 'overlays', label: 'Overlays' },
      { value: 'toasts', label: 'Toasts' }
    ]
  }
];
const PAD = 6;
const MARK = 16;

const renderIcon = icon => (isValidElement(icon) ? icon : null);
const toSet = open => new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);

export default function BranchedMenu({
  items = DEFAULT_ITEMS,
  defaultOpen = 0,
  defaultActive = '',
  active: activeProp,
  onSelect,
  onToggle,
  color = '#f5f5f5',
  accentColor = '#f5f5f5',
  lineColor = '#3f3f46',
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  className = ''
}) {
  const [open, setOpen] = useState(() => toSet(defaultOpen));
  const [activeState, setActive] = useState(() => {
    if (defaultActive) return defaultActive;
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i));
    return first?.children?.[0]?.value ?? '';
  });
  const active = activeProp !== undefined ? activeProp : activeState;
  const navRef = useRef(null);
  const heads = useRef([]);
  const markerRef = useRef(null);
  const latest = useRef({});
  latest.current = { onSelect, onToggle };

  const activeSection = items.findIndex(it => it.children?.some(kid => kid.value === active));
  const markerShown = activeSection >= 0 && open.has(activeSection);
  // пункт выбрали снаружи (поиск, «Далее») — раскрываем его раздел
  useEffect(() => {
    if (activeSection < 0) return;
    setOpen(prev => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)));
  }, [activeSection, active]);
  useLayoutEffect(() => {
    const place = glide => {
      const m = markerRef.current;
      const el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && el;
      if (!glide) m.style.transition = 'none';
      if (on) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
      m.toggleAttribute('data-on', Boolean(on));
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = '';
      }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, fontSize, rowHeight]);

  const select = (value, item) => {
    setActive(value);
    latest.current.onSelect?.(value, item);
  };
  const toggle = i => {
    setOpen(prev => {
      const next = new Set(prev);
      const isOpen = !next.has(i);
      if (isOpen) next.add(i);
      else next.delete(i);
      latest.current.onToggle?.(i, isOpen);
      return next;
    });
  };

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = k => PAD + k * rowHeight + rowHeight / 2;
  const branch = k => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = k => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = k => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  return (
    <nav
      ref={navRef}
      className={`branched-menu${className ? ` ${className}` : ''}`}
      style={{
        '--bm-w': `${width}px`,
        '--bm-ink': color,
        '--bm-accent': accentColor,
        '--bm-line': lineColor,
        '--bm-font': `${fontSize}px`,
        '--bm-row': `${rowHeight}px`,
        '--bm-indent': `${indent}px`,
        '--bm-line-w': lineWidth,
        '--bm-draw': `${drawDuration}ms`,
        '--bm-fold': `${foldDuration}ms`
      }}
    >
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children;
        const isOpen = kids ? open.has(i) : false;
        const leafValue = item.value ?? item.label;
        const leafActive = !kids && leafValue === active;
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0;
        return (
          <div key={item.value ?? item.label} className="branched-menu__section" data-open={isOpen ? '' : undefined}>
            <button
              ref={el => {
                heads.current[i] = el;
              }}
              type="button"
              className="branched-menu__head"
              aria-expanded={kids ? isOpen : undefined}
              aria-current={leafActive ? 'true' : undefined}
              data-active={leafActive ? '' : undefined}
              data-leaf={kids ? undefined : ''}
              title={item.title}
              onClick={() => (kids ? toggle(i) : select(leafValue, item))}
            >
              <span className="branched-menu__head-label">{item.label}</span>
              {item.meta != null ? <span className="branched-menu__meta">{item.meta}</span> : null}
              {kids ? (
                <svg className="branched-menu__chevron" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />
                </svg>
              ) : null}
            </button>
            {kids ? (
              <div className="branched-menu__body">
                <div className="branched-menu__fold">
                  <div className="branched-menu__tree" style={{ height: bodyH }}>
                    <svg className="branched-menu__lines" width={indent} height={bodyH} aria-hidden="true">
                      <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`} />
                      {kids.map((kid, k) => (
                        <path key={kid.value} className="branched-menu__base" d={branch(k)} />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__reach"
                          d={reach(k)}
                          style={{
                            strokeDasharray: length(k),
                            strokeDashoffset: kid.value === active ? 0 : length(k)
                          }}
                        />
                      ))}
                    </svg>
                    {kids.map(kid => (
                      <button
                        key={kid.value}
                        type="button"
                        className="branched-menu__item"
                        aria-current={kid.value === active ? 'true' : undefined}
                        data-active={kid.value === active ? '' : undefined}
                        tabIndex={isOpen ? 0 : -1}
                        title={kid.title}
                        onClick={() => select(kid.value, kid)}
                      >
                        {kid.icon ? (
                          <span className="branched-menu__icon" aria-hidden="true">
                            {renderIcon(kid.icon)}
                          </span>
                        ) : null}
                        <span className="branched-menu__label">{kid.label}</span>
                        {kid.meta != null ? <span className="branched-menu__item-meta">{kid.meta}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
