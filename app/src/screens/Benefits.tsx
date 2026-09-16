import { C, SORA } from '../theme';
import { Mono, ProgressBar, SectionTitle } from '../components/Bits';
import type { ScreenProps } from './types';

/** Perks hub: what's live now, and what's closest to unlocking. */
export function Benefits({ vm, actions }: ScreenProps) {
  return (
    <div>
      <div
        style={{
          borderRadius: 22,
          padding: 20,
          background: 'linear-gradient(140deg,rgba(0,255,163,.12),rgba(153,69,255,.16))',
          border: '1px solid rgba(153,69,255,.28)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Label>Active benefits</Label>
            <Stat color={C.white}>{vm.activeCount}</Stat>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Label>Saved this year</Label>
            <Stat color={C.mint}>$212</Stat>
          </div>
        </div>
      </div>

      <SectionTitle style={{ marginTop: 24 }}>Unlocked</SectionTitle>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vm.unlockedPerks.map((p, i) => (
          <div
            key={`${p.key}-${p.tier}-${i}`}
            onClick={() => actions.openBrand(p.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') actions.openBrand(p.key);
            }}
            style={{
              background: C.surface,
              border: '1px solid rgba(20,241,149,.2)',
              borderRadius: 18,
              padding: '15px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              cursor: 'pointer',
            }}
          >
            <Mono size={36} radius={11} fontSize={12.5}>
              {p.mono}
            </Mono>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>{p.title}</div>
              <div style={{ marginTop: 2, fontSize: 11.5, color: C.gray }}>
                {p.brand} · {p.tier}
              </div>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.mint, flexShrink: 0 }}>{p.state}</div>
          </div>
        ))}
      </div>

      <SectionTitle style={{ marginTop: 26 }}>Close to unlocking</SectionTitle>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vm.nearPerks.map((p, i) => (
          <div
            key={`${p.key}-${p.tier}-${i}`}
            onClick={() => actions.openBrand(p.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') actions.openBrand(p.key);
            }}
            style={{
              background: C.surfaceDeep,
              border: `1px solid ${C.hairline}`,
              borderRadius: 18,
              padding: '15px 16px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Mono size={36} radius={11} fontSize={12.5} color={C.muted2} border="rgba(255,255,255,.12)">
                {p.mono}
              </Mono>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text3 }}>{p.title}</div>
                <div style={{ marginTop: 2, fontSize: 11.5, color: C.gray }}>
                  {p.brand} · {p.tier}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: C.amber,
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.gap}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar
                width={p.pct}
                height={4}
                gradient={`linear-gradient(90deg,${C.cyan},${C.purple})`}
                track="rgba(255,255,255,.07)"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: C.muted,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        marginTop: 8,
        fontFamily: SORA,
        fontWeight: 600,
        fontSize: 32,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {children}
    </div>
  );
}
