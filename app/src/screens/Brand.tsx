import { C, SORA } from '../theme';
import { Cta, Eyebrow, Ghost, KeyValue, Mono, ProgressBar, SectionTitle } from '../components/Bits';
import type { ScreenProps } from './types';

/** Brand detail: value held, tier ladder, and the perks each tier unlocks. */
export function Brand({ vm, actions }: ScreenProps) {
  const b = vm.brand;
  return (
    <div style={{ animation: 'pafaRise .3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Mono size={52} radius={16} fontSize={18} border="rgba(153,69,255,.32)">
          {b.mono}
        </Mono>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 19, color: C.white }}>{b.name}</div>
          <div style={{ marginTop: 3, fontSize: 12.5, color: C.gray, fontVariantNumeric: 'tabular-nums' }}>
            {b.ticker} · {b.priceStr} per share
            {b.xstock ? ` · ${b.xstock.symbol}` : ''}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 20,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Eyebrow>Value held</Eyebrow>
            <div
              style={{
                marginTop: 6,
                fontFamily: SORA,
                fontWeight: 600,
                fontSize: 30,
                color: C.white,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {b.valueStr}
            </div>
            <div style={{ marginTop: 3, fontSize: 12.5, color: C.muted2, fontVariantNumeric: 'tabular-nums' }}>
              {b.sharesStr}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: b.chgColor, fontVariantNumeric: 'tabular-nums' }}
            >
              {b.chgStr}
            </div>
            <div style={{ marginTop: 3, fontSize: 11.5, color: C.gray }}>today</div>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <ProgressBar
            width={vm.brandProgW}
            height={6}
            gradient={`linear-gradient(90deg,${C.green},${C.cyan} 50%,${C.purple})`}
          />
        </div>
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            fontWeight: 600,
            color: C.muted2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>{b.tierName}</span>
          <span>{b.nextNote}</span>
        </div>
      </div>

      <SectionTitle style={{ marginTop: 26 }}>Shareholder benefits</SectionTitle>
      <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.5, color: C.muted2 }}>
        Unlocks are based on the value of {b.ticker} you hold, and stay active while you hold it.
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vm.brandTiers.map((t) => (
          <div
            key={t.name}
            style={{ borderRadius: 20, padding: '16px 18px', background: t.bg, border: `1px solid ${t.border}` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.dot }} />
              <span style={{ fontFamily: SORA, fontWeight: 600, fontSize: 14.5, color: t.titleColor }}>{t.name}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 9px',
                  borderRadius: 99,
                  background: t.pillBg,
                  color: t.pillColor,
                }}
              >
                {t.pillText}
              </span>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {t.perks.map((p) => (
                <div key={p.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  >
                    <path
                      d="M2.5 8.5l3.2 3.2L13.5 4"
                      stroke={p.tick}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: p.color }}>{p.title}</div>
                    <div style={{ marginTop: 2, fontSize: 11.5, lineHeight: 1.4, color: C.gray }}>{p.note}</div>
                  </div>
                  {p.canRedeem ? (
                    <div
                      onClick={() => actions.startRedeem(vm.brandHolding, t.tier, p.perk)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') actions.startRedeem(vm.brandHolding, t.tier, p.perk);
                      }}
                      style={{
                        padding: '7px 13px',
                        borderRadius: 99,
                        background: `linear-gradient(120deg,${C.green},${C.purple})`,
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.bg,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Redeem
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {t.locked ? (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,.06)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.muted2,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t.gapNote}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div
        onClick={() => actions.go('pay', { reset: true })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') actions.go('pay', { reset: true });
        }}
        style={{
          marginTop: 22,
          padding: 15,
          borderRadius: 16,
          border: '1px solid rgba(153,69,255,.4)',
          textAlign: 'center',
          fontFamily: SORA,
          fontWeight: 600,
          fontSize: 14.5,
          color: C.lilacSoft,
          cursor: 'pointer',
        }}
      >
        Pay at {b.name} to earn more
      </div>
    </div>
  );
}

/** Redeem confirmation — note that redeeming never spends the stock. */
export function Redeem({ vm, actions }: ScreenProps) {
  const r = vm.redeem;
  return (
    <div style={{ animation: 'pafaRise .3s ease both' }}>
      <div
        style={{
          marginTop: 6,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 22,
          padding: 22,
        }}
      >
        <Eyebrow style={{ letterSpacing: '.12em' }}>
          {r.brand} · {r.tier}
        </Eyebrow>
        <div
          style={{ marginTop: 10, fontFamily: SORA, fontWeight: 600, fontSize: 22, lineHeight: 1.25, color: C.white }}
        >
          {r.title}
        </div>
        <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: C.muted }}>{r.note}</div>
        <div
          style={{
            marginTop: 20,
            paddingTop: 18,
            borderTop: `1px solid ${C.hairline}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <KeyValue label="Held value required" value={r.req} />
          <KeyValue label="You hold" value={r.held} valueColor={C.mint} />
          <KeyValue label="Shares spent" value="None — you keep the stock" tabular={false} />
        </div>
      </div>
      <Cta onClick={() => actions.go('redeemed')} style={{ marginTop: 22 }} fontSize={15.5}>
        Redeem benefit
      </Cta>
      <Ghost onClick={actions.back}>Not now</Ghost>
    </div>
  );
}

/** Redemption complete — member code shown at checkout. */
export function Redeemed({ vm, actions }: ScreenProps) {
  const r = vm.redeem;
  return (
    <div style={{ animation: 'pafaRise .34s ease both', textAlign: 'center', paddingTop: 26 }}>
      <div
        style={{
          width: 82,
          height: 82,
          margin: '0 auto',
          borderRadius: '50%',
          background: `linear-gradient(135deg,${C.green},${C.cyan} 50%,${C.purple})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pafaPop .5s cubic-bezier(.2,.9,.2,1) both',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path d="M4 12.5l5 5L20 6.5" stroke={C.bg} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ marginTop: 22, fontFamily: SORA, fontWeight: 600, fontSize: 21, color: C.white }}>{r.title}</div>
      <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5, color: C.muted }}>
        Active at {r.brand} while you hold {r.req} of stock.
      </div>
      <div
        style={{
          marginTop: 24,
          borderRadius: 20,
          padding: 20,
          background: C.surface,
          border: '1px dashed rgba(153,69,255,.45)',
        }}
      >
        <Eyebrow style={{ letterSpacing: '.12em' }}>Member code</Eyebrow>
        <div
          style={{
            marginTop: 10,
            fontFamily: SORA,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '.14em',
            color: C.mint,
          }}
        >
          {r.code}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.gray }}>Show at checkout or paste online</div>
      </div>
      <Cta onClick={() => actions.go('benefits', { reset: true })} style={{ marginTop: 22 }} padding={15}>
        All my benefits
      </Cta>
      <Ghost onClick={() => actions.go('home', { reset: true })}>Back home</Ghost>
    </div>
  );
}
