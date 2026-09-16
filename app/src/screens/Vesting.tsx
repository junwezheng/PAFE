import { C, SORA } from '../theme';
import { ProgressBar, SectionTitle } from '../components/Bits';
import type { ScreenProps } from './types';

/**
 * Vesting status. Per-lot countdown rings tick live; a lot whose cliff has
 * passed (or whose month hit the spend target) gets a Claim button that fires
 * the real `release_lot` instruction.
 */
export function Vesting({ vm, actions }: ScreenProps) {
  return (
    <div>
      <div
        style={{
          borderRadius: 22,
          padding: 20,
          background: vm.vestBannerBg,
          border: `1px solid ${vm.vestBannerBorder}`,
        }}
      >
        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 17, color: C.white }}>{vm.vestTitle}</div>
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: C.muted }}>{vm.vestLong}</div>
        <div style={{ marginTop: 16 }}>
          <ProgressBar width={vm.spendPct} height={6} />
        </div>
        <div
          style={{
            marginTop: 9,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            fontWeight: 600,
            color: C.muted2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>{vm.spendStr}</span>
          <span>{vm.thresholdStr}</span>
        </div>
      </div>

      <div style={{ marginTop: 26, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <SectionTitle>{vm.lotsTitle}</SectionTitle>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted2, fontVariantNumeric: 'tabular-nums' }}>
          {vm.pendingStr}
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vm.lots.map((l) => (
          <div
            key={l.lot.index}
            style={{
              background: C.surface,
              border: `1px solid ${C.hairline}`,
              borderRadius: 20,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ width: 62, height: 62, position: 'relative', flexShrink: 0 }}>
              <svg width="62" height="62" viewBox="0 0 62 62">
                <circle cx="31" cy="31" r="27" stroke="rgba(255,255,255,.08)" strokeWidth="4.5" fill="none" />
                <circle
                  cx="31"
                  cy="31"
                  r="27"
                  stroke={l.ringColor}
                  strokeWidth="4.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={l.dash}
                  transform="rotate(-90 31 31)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: SORA,
                  fontWeight: 700,
                  fontSize: 12,
                  color: C.text2,
                }}
              >
                {l.mono}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: SORA, fontWeight: 500, fontSize: 14.5, color: C.text }}>{l.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.white, fontVariantNumeric: 'tabular-nums' }}>
                  {l.valueStr}
                </span>
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: C.gray, fontVariantNumeric: 'tabular-nums' }}>
                {l.sharesStr} · earned {l.earned}
              </div>
              {l.releasable ? (
                <div
                  onClick={() => actions.claimLot(l.lot)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') actions.claimLot(l.lot);
                  }}
                  style={{
                    marginTop: 9,
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: 99,
                    background: `linear-gradient(120deg,${C.green},${C.purple})`,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: C.bg,
                    cursor: 'pointer',
                  }}
                >
                  Claim now
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 9,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: l.countColor,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {l.countdown}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 22,
          background: C.surfaceDeep,
          border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 20,
          padding: 18,
        }}
      >
        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 14, color: C.white }}>How vesting works</div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Rule>
            Stock you earn is held for {vm.vestDaysStr} days before it becomes tradable. Price movement during vesting
            is still yours.
          </Rule>
          <Rule>
            Spend {vm.thresholdStr} within a calendar month and vesting is dropped on every stock earned that month —
            it releases immediately.
          </Rule>
          <Rule>The target resets on the 1st. Months you miss it keep the {vm.vestDaysStr}-day hold.</Rule>
          <Rule>Vesting never affects benefit unlocks. Locked stock still counts toward held value.</Rule>
        </div>
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>{children}</div>;
}
