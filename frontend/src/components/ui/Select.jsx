/**
 * Select.jsx — Custom dark dropdown to replace native <select> elements.
 * Native <select> shows white background on dark themes (browser bug).
 * This component ensures consistent dark glass styling.
 */
import { useState, useRef, useEffect } from 'react';

export function Select({ options = [], value, onChange, placeholder = 'Select...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          color: selected ? 'var(--text-primary, #f0f4f1)' : 'var(--text-muted, rgba(240,244,241,0.35))',
          fontSize: '15px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: "'Poppins', sans-serif",
          opacity: disabled ? 0.5 : 1,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
            opacity: 0.6,
            flexShrink: 0,
            marginLeft: 8,
          }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: 'rgba(18, 28, 22, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          zIndex: 1000,
          maxHeight: '260px',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: opt.value === value
                  ? 'rgba(29,158,117,0.2)' : 'transparent',
                border: 'none',
                borderBottom: idx < options.length - 1
                  ? '1px solid rgba(255,255,255,0.06)' : 'none',
                color: opt.value === value ? '#1D9E75' : '#e5e5e5',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
                transition: 'background 0.15s',
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => {
                if (opt.value !== value)
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                if (opt.value !== value)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              {opt.label}
            </button>
          ))}
          {options.length === 0 && (
            <div style={{
              padding: '16px',
              color: 'var(--text-muted, rgba(240,244,241,0.35))',
              fontSize: '13px',
              textAlign: 'center',
            }}>
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Select;
