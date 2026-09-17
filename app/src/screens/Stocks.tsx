import { C, SORA } from '../theme';
import { Mono, PreIpoBadge, SectionTitle } from '../components/Bits';
import type { ScreenProps } from './types';

export function Stocks({ vm, actions }: ScreenProps) {
  return (
    <div>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: SORA,
            fontWeight: 600,
            fontSize: 34,
            color: C.white,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {vm.balanceStr}
        </div>
        <div
          style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: C.mint, fontVariantNumeric: 'tabular-nums' }}
        >
          {vm.dayChangeStr}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.hairline}`,
            borderRadius: 18,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: C.muted2,
            }}
          >
            Vested
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: SORA,
              fontWeight: 600,
              fontSize: 19,
              color: C.mint,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {vm.vestedStr}
          </div>
          <div style={{ marginTop: 3, fontSize: 11.5, color: C.gray }}>Yours to hold or sell</div>
        </div>

        <div
          onClick={() => actions.go('vesting')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') actions.go('vesting');
          }}
          style={{
            background: C.surface,
            border: '1px solid rgba(255,184,77,.22)',
            borderRadius: 18,
            padding: '14px 16px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: C.muted2,
            }}
          >
            Vesting
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: SORA,
              fontWeight: 600,
              fontSize: 19,
              color: C.amber,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {vm.pendingStr}
          </div>
          <div style={{ marginTop: 3, fontSize: 11.5, color: C.gray }}>{vm.pendingNote}</div>
        </div>
      </div>

      <SectionTitle style={{ marginTop: 24 }}>Holdings</SectionTitle>
      <div
        style={{
          marginTop: 12,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {vm.allHoldings.map((h) => (
          <div
            key={h.key}
            onClick={() => actions.openBrand(h.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') actions.openBrand(h.key);
            }}
            style={{
              padding: '13px 16px',
              borderBottom: `1px solid ${C.hairlineSoft}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <Mono size={34} radius={11} fontSize={12.5}>
              {h.mono}
            </Mono>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{h.name}</span>
                {h.prestock ? <PreIpoBadge /> : null}
              </div>
              <div style={{ marginTop: 2, fontSize: 11.5, color: C.gray, fontVariantNumeric: 'tabular-nums' }}>
                {h.sharesStr} · {h.priceStr}
                {h.xstock ? ` · ${h.xstock.symbol}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, fontVariantNumeric: 'tabular-nums' }}>
                {h.valueStr}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: h.chgColor,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {h.chgStr}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
