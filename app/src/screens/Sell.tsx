import { C, SORA } from '../theme';
import { Cta, Eyebrow, Ghost, KeyValue, Mono, PreIpoBadge } from '../components/Bits';
import type { ScreenProps } from './types';

type SellVm = ScreenProps['vm']['sell'];

/** Shortcuts that fill the amount field from the vested balance. */
const PORTIONS: { label: string; portion: number; active: (s: SellVm) => boolean }[] = [
  { label: '50%', portion: 0.5, active: (s) => s.halfActive },
  { label: 'All', portion: 1, active: (s) => s.allActive },
];

/**
 * Sell vested stock back to USDC.
 *
 * Only vested stock is offered: escrowed lots live in the program's lot PDA, so
 * a sale of them would fail on-chain. The payout always comes from a route
 * quote rather than the displayed mark, and the screen says which route filled
 * it — on thin pre-IPO pools the two prices can differ by a lot.
 */
export function Sell({ vm, actions }: ScreenProps) {
  const s = vm.sell;

  if (s.nothingToSell) {
    return (
      <div style={{ animation: 'pafaRise .3s ease both', paddingTop: 30, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mono size={52} radius={16} fontSize={18}>
            {s.mono}
          </Mono>
        </div>
        <div style={{ marginTop: 16, fontFamily: SORA, fontWeight: 600, fontSize: 18, color: C.white }}>
          Nothing vested yet
        </div>
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: C.muted }}>
          All of your {s.ticker} is still in escrow. {s.lockedStr ? `${s.lockedStr} unlocks ` : 'It unlocks '}
          once vesting completes, and you can sell it then.
        </div>
        <Ghost onClick={actions.back}>Back</Ghost>
      </div>
    );
  }

  return (
    <div style={{ animation: 'pafaRise .3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Mono size={48} radius={15} fontSize={17} border="rgba(153,69,255,.32)">
          {s.mono}
        </Mono>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: SORA, fontWeight: 600, fontSize: 18, color: C.white }}>{s.name}</span>
            {s.preIpo ? <PreIpoBadge /> : null}
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: C.gray, fontVariantNumeric: 'tabular-nums' }}>
            {s.sellableStr} vested · {s.markStr} mark
          </div>
        </div>
      </div>

      {/* amount */}
      <div
        style={{
          marginTop: 20,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 20,
          padding: 18,
        }}
      >
        <Eyebrow>Amount to sell</Eyebrow>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <input
            value={s.input}
            onChange={(e) => actions.setSellInput(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            aria-label={`Shares of ${s.ticker} to sell`}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              fontFamily: SORA,
              fontWeight: 600,
              fontSize: 26,
              color: s.error ? C.red : C.white,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.muted2, flexShrink: 0 }}>{s.ticker}</span>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {PORTIONS.map(({ label, portion, active }) => {
            const on = active(s);
            return (
              <div
                key={label}
                onClick={() => actions.setSellPortion(portion)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') actions.setSellPortion(portion);
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  textAlign: 'center',
                  borderRadius: 11,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: on ? 'rgba(20,241,149,.14)' : 'rgba(255,255,255,.05)',
                  border: `1px solid ${on ? 'rgba(20,241,149,.34)' : C.hairline}`,
                  color: on ? C.mint : C.muted2,
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {s.error ? (
          <div style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.45, color: C.red }}>{s.error}.</div>
        ) : null}

        {s.lockedStr ? (
          <div style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.45, color: C.amber }}>
            {s.lockedStr} is still vesting and can&rsquo;t be sold yet.
          </div>
        ) : null}
      </div>

      {/* what the route pays */}
      <div
        style={{
          marginTop: 14,
          borderRadius: 20,
          padding: 2,
          background: 'linear-gradient(135deg,rgba(0,255,163,.5),rgba(153,69,255,.5))',
        }}
      >
        <div style={{ borderRadius: 18, background: C.surfaceDeep, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 13, color: C.muted }}>You receive</span>
            <span
              style={{
                fontFamily: SORA,
                fontWeight: 600,
                fontSize: 22,
                color: s.quoting ? C.muted2 : C.mint,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.quoting ? 'quoting…' : `${s.proceedsStr} USDC`}
            </span>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${C.hairline}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 11,
            }}
          >
            <KeyValue label="Fill price" value={`${s.fillStr} / ${s.ticker}`} />
            <KeyValue label="Route" value={s.via} valueColor={s.routeColor} tabular={false} />
            {s.impactStr ? <KeyValue label="Price impact" value={s.impactStr} /> : null}
            <KeyValue label="Value left after" value={s.valueAfterStr} />
          </div>

          {s.markGapStr ? (
            <div style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.45, color: C.amber }}>
              The market is paying {s.markGapStr} against the {s.markStr} issuer mark. You get the routed
              price, not the mark.
            </div>
          ) : null}

          {!s.live && !s.quoting ? (
            <div style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.45, color: C.amber }}>
              No aggregator on this cluster, so this is priced at the mark. A real sale would fill at
              whatever the route quotes.
            </div>
          ) : null}
        </div>
      </div>

      {s.tierWarning ? (
        <div
          style={{
            marginTop: 14,
            background: 'rgba(255,107,138,.08)',
            border: '1px solid rgba(255,107,138,.28)',
            borderRadius: 18,
            padding: 16,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: C.text3,
          }}
        >
          <span style={{ fontWeight: 700, color: C.red }}>{s.tierWarning}.</span> Benefits are unlocked by
          the value you hold, so this sale gives up the perks at that tier until you build the position
          back up.
        </div>
      ) : null}

      <Cta
        onClick={s.canSell ? actions.confirmSell : undefined}
        style={{ marginTop: 22, opacity: s.canSell ? 1 : 0.45 }}
        fontSize={15.5}
      >
        {s.quoting ? 'Quoting…' : `Sell for ${s.proceedsStr} USDC`}
      </Cta>
      <Ghost onClick={actions.back}>Keep holding</Ghost>
    </div>
  );
}

/** Sale complete — USDC lands in the in-app balance. */
export function Sold({ vm, actions }: ScreenProps) {
  const s = vm.sell;
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

      <div style={{ marginTop: 22, fontFamily: SORA, fontWeight: 600, fontSize: 21, color: C.white }}>
        {s.proceedsStr} USDC
      </div>
      <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5, color: C.muted }}>
        Sold {s.sharesStr} at {s.fillStr} per share.
      </div>

      <div
        style={{
          marginTop: 24,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 20,
          padding: 18,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <KeyValue label="USDC balance" value={vm.usdcStr} valueColor={C.mint} />
        <KeyValue label="Route" value={s.via} tabular={false} />
        <KeyValue label={`${s.name} still held`} value={s.valueAfterStr} />
      </div>

      <Cta onClick={() => actions.go('stocks', { reset: true })} style={{ marginTop: 22 }} padding={15}>
        Back to portfolio
      </Cta>
      <Ghost onClick={() => actions.go('card', { reset: true })}>See USDC balance</Ghost>
    </div>
  );
}
