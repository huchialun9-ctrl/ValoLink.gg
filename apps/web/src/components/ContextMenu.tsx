'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const menuX = Math.min(x, window.innerWidth - 200);
  const menuY = Math.min(y, window.innerHeight - items.length * 36 - 8);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: menuY,
        left: menuX,
        zIndex: 9999,
        background: '#1a1b23',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '4px',
        minWidth: '180px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { if (!item.disabled) { item.onClick(); onClose(); } }}
          disabled={item.disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '8px 12px', border: 'none', borderRadius: '6px',
            background: 'transparent', cursor: item.disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem',
            color: item.danger ? 'var(--accent-red)' : 'var(--text-primary)',
            opacity: item.disabled ? 0.4 : 1,
          }}
          onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {item.icon && <span style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
