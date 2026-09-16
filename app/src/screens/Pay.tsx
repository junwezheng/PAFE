import { C, SORA } from '../theme';
import { Cta, Ghost, Mono } from '../components/Bits';
import { DEMO_PURCHASE } from '../domain/mockData';
import { money } from '../lib/format';
import type { ScreenProps } from './types';

/** Scan-to-pay. "Simulate a scan" stands in for the camera. */
export function Pay({ vm, actions }: ScreenProps) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 4,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 14,
        }}
      >
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            padding: 9,
            borderRadius: 11,
            background: 'rgba(255,255,255,.08)',
            fontSize: 13,
            fontWeight: 600,
            color: C.white,
          }}
        >
          Scan to pay
        </div>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            padding: 9,
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 600,
            color: C.gray,
          }}
        >
          My QR
        </div>
      </div>

      {/* viewfinder */}
      <div
        style={{
          marginTop: 22,
          position: 'relative',
          borderRadius: 26,
          overflow: 'hidden',
          background: 'linear-gradient(170deg,#0C0C14,#141420)',
          border: '1px solid rgba(255,255,255,.08)',
          height: 290,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 40%,rgba(153,69,255,.16),transparent 62%)',
          }}
        />
        <div style={{ position: 'relative', width: 196, height: 196 }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 40,
              height: 40,
              borderTop: `3px solid ${C.mint}`,
              borderLeft: `3px solid ${C.mint}`,
              borderRadius: '14px 0 0 0',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 40,
              height: 40,
              borderTop: `3px solid ${C.cyan}`,
              borderRight: `3px solid ${C.cyan}`,
              borderRadius: '0 14px 0 0',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 40,
              height: 40,
              borderBottom: `3px solid ${C.purple}`,
              borderLeft: `3px solid ${C.purple}`,
              borderRadius: '0 0 0 14px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 40,
              height: 40,
              borderBottom: `3px solid ${C.purple}`,
              borderRight: `3px solid ${C.purple}`,
              borderRadius: '0 0 14px 0',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: 8,
              right: 8,
              height: 2,
              background: `linear-gradient(90deg,transparent,${C.mint},transparent)`,
              animation: 'pafaScan 2.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13.5, lineHeight: 1.5, color: C.muted }}>
        Hold over the merchant QR. Cashback is paid in that brand&rsquo;s stock.
      </div>

      <Cta onClick={() => actions.go('review')} style={{ marginTop: 20 }} padding={15}>
        Simulate a scan
      </Cta>

      <div
        style={{
          marginTop: 24,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: C.gray,
        }}
      >
        Nearby, higher rate
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vm.nearby.map((n) => (
          <div
            key={n.name}
            style={{
              background: C.surface,
              border: `1px solid ${C.hairline}`,
              borderRadius: 16,
              padding: '13px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Mono size={32} radius={10} fontSize={12}>
              {n.mono}
            </Mono>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>{n.name}</div>
              <div style={{ marginTop: 2, fontSize: 11.5, color: C.gray }}>{n.place}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>{n.rate}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Confirm sheet: what you pay, what you earn, and what vesting it triggers. */
export function Review({ vm, actions }: ScreenProps) {
  const amount = money(DEMO_PURCHASE.amount);
  return (
    <div style={{ animation: 'pafaRise .34s ease both' }}>
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mono size={56} radius={18} fontSize={20} border="rgba(153,69,255,.32)">
            NK
          </Mono>
        </div>
        <div style={{ marginTop: 12, fontFamily: SORA, fontWeight: 600, fontSize: 18, color: C.white }}>
          {DEMO_PURCHASE.merchant}
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: C.gray }}>{DEMO_PURCHASE.place}</div>
      </div>

      <div style={{ marginTop: 26, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: C.muted2,
          }}
        >
          Amount
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: SORA,
            fontWeight: 600,
            fontSize: 44,
            color: C.white,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {amount}
        </div>
      </div>

      {/* gradient-bordered earn card */}
      <div
        style={{
          marginTop: 26,
          borderRadius: 20,
          padding: 2,
          background: 'linear-gradient(135deg,rgba(0,255,163,.5),rgba(153,69,255,.5))',
        }}
      >
        <div style={{ borderRadius: 18, background: '#0B0B12', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: C.muted }}>Cashback rate</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>{vm.rateStr}</span>
          </div>
          <div
            style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ fontSize: 13, color: C.muted }}>You earn</span>
            <span
              style={{
                fontFamily: SORA,
                fontSize: 15,
                fontWeight: 600,
                color: C.white,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {vm.earnShares} NKE
            </span>
          </div>
          <div
            style={{ marginTop: 6, textAlign: 'right', fontSize: 12, color: C.gray, fontVariantNumeric: 'tabular-nums' }}
          >
            ≈ {vm.earnValue} at {vm.nikePrice}/share
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${C.hairline}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, color: C.muted }}>Vesting</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: vm.vestPillColor }}>{vm.vestPillText}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 18,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>
          This purchase takes {vm.monthName} spend to{' '}
          <span style={{ color: C.white, fontWeight: 600 }}>{vm.spendAfterStr}</span>. {vm.crossNote}
        </div>
      </div>

      <Cta onClick={actions.confirmPay} style={{ marginTop: 22 }} fontSize={15.5}>
        Confirm and pay {amount}
      </Cta>
      <Ghost onClick={() => actions.go('pay', { reset: true })}>Cancel</Ghost>
    </div>
  );
}
