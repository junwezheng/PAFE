import { C, SORA } from '../theme';
import { Cta, Ghost, ProgressBar } from '../components/Bits';
import { ChainReceipt } from '../components/ChainReceipt';
import { DEMO_PURCHASE } from '../domain/mockData';
import { money } from '../lib/format';
import type { ScreenProps } from './types';

/** The payoff screen: stock earned, vesting outcome, tier movement. */
export function Earned({ vm, actions }: ScreenProps) {
  return (
    <div style={{ animation: 'pafaRise .34s ease both' }}>
      <div style={{ textAlign: 'center', paddingTop: 14 }}>
        <div
          style={{
            width: 112,
            height: 112,
            margin: '0 auto',
            position: 'relative',
            animation: 'pafaPop .5s cubic-bezier(.2,.9,.2,1) both',
          }}
        >
          <svg width="112" height="112" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="50" stroke="rgba(255,255,255,.08)" strokeWidth="6" fill="none" />
            <circle
              cx="56"
              cy="56"
              r="50"
              stroke="url(#pafaG)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={vm.earnedRingDash}
              transform="rotate(-90 56 56)"
            />
            <defs>
              <linearGradient id="pafaG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={C.green} />
                <stop offset="0.5" stopColor={C.cyan} />
                <stop offset="1" stopColor={C.purple} />
              </linearGradient>
            </defs>
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: C.white }}>NK</span>
            <span style={{ marginTop: 2, fontSize: 10.5, fontWeight: 600, color: C.muted2 }}>
              {vm.earnedRingLabel}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 20, fontFamily: SORA, fontWeight: 600, fontSize: 22, color: C.white }}>
          Paid {money(DEMO_PURCHASE.amount)}
        </div>
        <div style={{ marginTop: 8, fontSize: 14.5, color: C.muted }}>
          You earned <span style={{ color: C.mint, fontWeight: 600 }}>{vm.earnShares} NKE</span> ({vm.earnValue})
        </div>
      </div>

      {/* vesting outcome */}
      <div
        style={{
          marginTop: 24,
          borderRadius: 20,
          padding: 18,
          background: vm.earnedCardBg,
          border: `1px solid ${vm.earnedCardBorder}`,
        }}
      >
        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: C.white }}>{vm.earnedVestTitle}</div>
        <div style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>{vm.earnedVestBody}</div>
        {vm.justCleared ? (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            {vm.releasedLots.map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: C.text3 }}>{r.label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: C.mint }}>Released</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* tier movement */}
      <div
        style={{
          marginTop: 18,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 20,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: C.white }}>Nike unlock</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.purple }}>{vm.nikeTierName}</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <ProgressBar width={vm.nikeProgW} height={6} duration={1000} />
        </div>
        <div style={{ marginTop: 9, fontSize: 12.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
          {vm.nikeProgNote}
        </div>
      </div>

      <ChainReceipt receipt={vm.receipt} settling={vm.settling} />

      <Cta onClick={() => actions.openBrand('NKE')} style={{ marginTop: 22 }}>
        See Nike benefits
      </Cta>
      <Ghost onClick={() => actions.go('home', { reset: true })}>Done</Ghost>
    </div>
  );
}
