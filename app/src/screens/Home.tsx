import { C, SORA } from '../theme';
import { Chevron, Mono, ProgressBar, SectionTitle } from '../components/Bits';
import { TxRow } from '../components/TxRow';
import type { ScreenProps } from './types';

export function Home({ vm, actions }: ScreenProps) {
  return (
    <div>
      {/* portfolio value */}
      <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: C.muted2,
          }}
        >
          Portfolio value · USD
        </div>
        <div
          onClick={actions.toggleBalance}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') actions.toggleBalance();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          <div
            style={{
              fontFamily: SORA,
              fontWeight: 600,
              fontSize: 42,
              letterSpacing: '-.02em',
              color: C.white,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {vm.balanceStr}
          </div>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M1 10s3.5-5.5 9-5.5S19 10 19 10s-3.5 5.5-9 5.5S1 10 1 10Z" stroke={C.gray} strokeWidth="1.4" />
            <circle cx="10" cy="10" r="2.4" stroke={C.gray} strokeWidth="1.4" />
          </svg>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13.5,
            fontWeight: 600,
            color: C.mint,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {vm.dayChangeStr}
        </div>
      </div>

      {/* quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 26 }}>
        <QuickAction
          label="Pay"
          primary
          onClick={() => actions.go('pay', { reset: true })}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.6" stroke={C.bg} strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" rx="1.6" stroke={C.bg} strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" rx="1.6" stroke={C.bg} strokeWidth="2" />
              <path d="M14 14h3m4 0h0m-7 4v3m4-3h3" stroke={C.bg} strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
        <QuickAction
          label="Stocks"
          onClick={() => actions.go('stocks', { reset: true })}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l5-6 4 3 5-8" stroke="#9BE7C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 6h4v4" stroke="#9BE7C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <QuickAction
          label="Vesting"
          badge={vm.hasPending}
          onClick={() => actions.go('vesting')}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8.5" stroke={C.lilac} strokeWidth="2" />
              <path d="M12 7.5V12l3 2" stroke={C.lilac} strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
        <QuickAction
          label="Perks"
          onClick={() => actions.go('benefits', { reset: true })}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3l2.6 5.6 6 .7-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.3l6-.7L12 3Z"
                stroke="#FFD79A"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </div>

      {/* monthly vesting banner */}
      <div
        onClick={() => actions.go('vesting')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') actions.go('vesting');
        }}
        style={{
          marginTop: 24,
          borderRadius: 20,
          padding: '16px 18px',
          background: vm.vestBannerBg,
          border: `1px solid ${vm.vestBannerBorder}`,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 14, color: C.white }}>{vm.vestTitle}</div>
            <div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.45, color: C.muted, maxWidth: 230 }}>
              {vm.vestSub}
            </div>
          </div>
          <Chevron />
        </div>
        <div style={{ marginTop: 14 }}>
          <ProgressBar width={vm.spendPct} />
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11.5,
            fontWeight: 600,
            color: C.muted2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>
            {vm.spendStr} spent in {vm.monthName}
          </span>
          <span>{vm.thresholdStr}</span>
        </div>
      </div>

      {/* holdings */}
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <SectionTitle>Your brands</SectionTitle>
        <div
          onClick={() => actions.go('stocks', { reset: true })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') actions.go('stocks', { reset: true });
          }}
          style={{ fontSize: 12.5, fontWeight: 600, color: C.purple, cursor: 'pointer' }}
        >
          All {vm.holdingCount}
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vm.topHoldings.map((h) => (
          <div
            key={h.key}
            onClick={() => actions.openBrand(h.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') actions.openBrand(h.key);
            }}
            style={{
              background: C.surface,
              border: `1px solid ${C.hairline}`,
              borderRadius: 18,
              padding: '14px 16px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Mono>{h.mono}</Mono>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: SORA, fontWeight: 500, fontSize: 14.5, color: C.text }}>{h.name}</span>
                  <span
                    style={{ fontWeight: 600, fontSize: 14.5, color: C.white, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {h.valueStr}
                  </span>
                </div>
                <div style={{ marginTop: 3, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted2, fontVariantNumeric: 'tabular-nums' }}>
                    {h.sharesStr}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: h.chgColor,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {h.chgStr}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <ProgressBar
                  width={h.tierPct}
                  height={4}
                  gradient={`linear-gradient(90deg,${C.green},${C.cyan})`}
                  track="rgba(255,255,255,.07)"
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted2 }}>{h.tierNote}</span>
            </div>
          </div>
        ))}
      </div>

      {/* recent activity */}
      <SectionTitle style={{ marginTop: 28 }}>Recent</SectionTitle>
      <div
        style={{
          marginTop: 12,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {vm.recentTx.map((t) => (
          <TxRow key={t.id} tx={t} onClick={() => actions.openTx(t.id)} />
        ))}
        <div
          onClick={() => actions.go('activity')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') actions.go('activity');
          }}
          style={{ padding: 14, textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: C.purple, cursor: 'pointer' }}
        >
          All activity
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
  primary = false,
  badge = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  badge?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
    >
      <div
        style={{
          width: 60,
          height: 56,
          borderRadius: 18,
          background: primary ? `linear-gradient(140deg,${C.green},${C.cyan} 45%,${C.purple})` : '#101019',
          border: primary ? undefined : '1px solid rgba(255,255,255,.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {icon}
        {badge ? (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: C.amber,
            }}
          />
        ) : null}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: primary ? C.text2 : C.text3 }}>{label}</span>
    </div>
  );
}
