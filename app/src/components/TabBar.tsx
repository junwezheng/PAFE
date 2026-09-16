import type { ReactNode } from 'react';
import type { Screen } from '../domain/types';

const ACTIVE_BG = 'rgba(153,69,255,.20)';
const ACTIVE = '#14F195';
const IDLE = '#8D8DA6';

export function TabBar({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  const tab = (key: Screen, label: string, icon: (color: string) => ReactNode) => {
    const active = screen === key;
    const color = active ? ACTIVE : IDLE;
    return (
      <div
        onClick={() => onNavigate(key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onNavigate(key);
        }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '7px 0',
          borderRadius: 18,
          background: active ? ACTIVE_BG : 'transparent',
          cursor: 'pointer',
        }}
      >
        {icon(color)}
        <span style={{ fontSize: 10.5, fontWeight: 600, color }}>{label}</span>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 26,
        left: 16,
        right: 16,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        borderRadius: 26,
        background: 'rgba(16,16,24,.86)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,.08)',
      }}
    >
      {tab('home', 'Home', (c) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke={c}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
      {tab('stocks', 'Stocks', (c) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 17l5-6 4 3 5-8" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 6h4v4" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
      {tab('pay', 'Pay', (c) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke={c} strokeWidth="1.8" />
          <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" stroke={c} strokeWidth="1.8" />
          <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" stroke={c} strokeWidth="1.8" />
          <path d="M14 14.5h3m3.5 0h0M14 20h6.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ))}
      {tab('benefits', 'Perks', (c) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3.5l2.5 5.3 5.7.7-4.2 4 1.1 5.7-5.1-2.9-5.1 2.9 1.1-5.7-4.2-4 5.7-.7L12 3.5Z"
            stroke={c}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      ))}
      {tab('card', 'Card', (c) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2.5" y="5.5" width="19" height="13" rx="3" stroke={c} strokeWidth="1.8" />
          <path d="M2.5 10h19" stroke={c} strokeWidth="1.8" />
        </svg>
      ))}
    </div>
  );
}
