import { C, SORA } from '../theme';
import { initialOf } from '../auth/context';

/**
 * Top bar: back button or avatar on the left, screen title centred, help on the
 * right. The 58px top padding clears the iOS status bar.
 */
export function Header({
  title,
  canBack,
  showAvatar,
  displayName,
  onBack,
  onProfile,
}: {
  title: string;
  canBack: boolean;
  showAvatar: boolean;
  displayName: string;
  onBack: () => void;
  onProfile: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        padding: '58px 18px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg,rgba(6,6,11,.96) 55%,rgba(6,6,11,0))',
      }}
    >
      {canBack ? (
        <div
          onClick={onBack}
          role="button"
          aria-label="Back"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onBack();
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'rgba(255,255,255,.04)',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 1.5L2 8l6 6.5" stroke={C.text2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : null}

      {showAvatar ? (
        <div
          onClick={onProfile}
          role="button"
          aria-label="Profile"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onProfile();
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `linear-gradient(135deg,${C.green},${C.purple})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontFamily: SORA,
            fontWeight: 600,
            fontSize: 14,
            color: C.bg,
          }}
        >
          {initialOf(displayName)}
        </div>
      ) : null}

      <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, letterSpacing: '.02em', color: C.text }}>
        {title}
      </div>

      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,.04)',
        }}
      >
        <span style={{ fontFamily: SORA, fontSize: 13, color: '#A9A9BC' }}>?</span>
      </div>
    </div>
  );
}
