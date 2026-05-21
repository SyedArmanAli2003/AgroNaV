/**
 * Select.jsx — Custom dark dropdown using React Portal.
 * The dropdown renders at document.body level so it always floats above
 * all other content, regardless of parent stacking contexts (glass-card, etc.)
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Select({ options = [], value, onChange, placeholder = 'Select...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropRef = useRef(null);

  // Recalculate dropdown position when opened
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropHeight = Math.min(260, options.length * 46 + 8);
    const openUpward = spaceBelow < dropHeight + 12 && rect.top > dropHeight + 12;

    setDropPos({
      top: openUpward
        ? rect.top + window.scrollY - dropHeight - 6
        : rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width,
      openUpward,
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open) updatePosition();
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handler = () => { updatePosition(); };
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open]); // eslint-disable-line

  const selected = options.find(o => o.value === value);

  return (
    <>
      {/* Trigger button — stays in normal flow */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? 'rgba(29,158,117,0.5)' : 'rgba(255,255,255,0.12)'}`,
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
          transition: 'border-color 0.15s',
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

      {/* Dropdown panel — rendered via Portal at document.body, always on top */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'absolute',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            background: 'rgba(12, 22, 16, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(29,158,117,0.25)',
            borderRadius: '12px',
            zIndex: 99999,
            maxHeight: '260px',
            overflowY: 'auto',
            boxShadow: '0 12px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(29,158,117,0.1)',
            animation: 'selectDropIn 0.15s ease',
          }}
        >
          <style>{`
            @keyframes selectDropIn {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: opt.value === value ? 'rgba(29,158,117,0.18)' : 'transparent',
                border: 'none',
                borderBottom: idx < options.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                color: opt.value === value ? '#1D9E75' : '#e5e5e5',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
                transition: 'background 0.12s',
                boxSizing: 'border-box',
                fontWeight: opt.value === value ? 600 : 400,
              }}
              onMouseEnter={e => {
                if (opt.value !== value)
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
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
        </div>,
        document.body
      )}
    </>
  );
}

export default Select;
