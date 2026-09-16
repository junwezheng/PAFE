import { C, SORA } from '../theme';
import type { Economics } from '../domain/types';

/**
 * The prototype's Tweaks panel, kept because the economics are the thing people
 * argue about in a demo. Desktop only — hidden at phone widths by CSS.
 */
export function Tweaks({
  econ,
  onChange,
  chainLabel,
  chainMode,
}: {
  econ: Economics;
  onChange: (next: Economics) => void;
  chainLabel: string;
  chainMode: 'devnet' | 'simulated';
}) {
  return (
    <div
      className="pafa-tweaks"
      style={{
        width: 248,
        flexShrink: 0,
        background: 'rgba(14,14,22,.8)',
        border: `1px solid ${C.hairline}`,
        borderRadius: 22,
        padding: 20,
      }}
    >
      <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 14, color: C.white }}>Tweaks</div>
      <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.45, color: C.gray }}>
        Economics are live — every screen recalculates.
      </div>

      <Slider
        label="Cashback rate"
        value={econ.cashbackRate}
        min={1}
        max={10}
        step={0.5}
        suffix="%"
        onChange={(cashbackRate) => onChange({ ...econ, cashbackRate })}
      />
      <Slider
        label="Monthly target"
        value={econ.monthlySpendTarget}
        min={100}
        max={5000}
        step={50}
        prefix="$"
        onChange={(monthlySpendTarget) => onChange({ ...econ, monthlySpendTarget })}
      />
      <Slider
        label="Vesting days"
        value={econ.vestingDays}
        min={1}
        max={60}
        step={1}
        suffix="d"
        onChange={(vestingDays) => onChange({ ...econ, vestingDays })}
      />

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.hairline}` }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: C.muted2,
          }}
        >
          Network
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: chainMode === 'devnet' ? C.mint : C.amber,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11.5, color: C.text3, wordBreak: 'break-word' }}>{chainLabel}</span>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  prefix = '',
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
        <span
          style={{
            fontFamily: SORA,
            fontSize: 12.5,
            fontWeight: 600,
            color: C.mint,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {prefix}
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', marginTop: 8, accentColor: C.purple }}
      />
    </div>
  );
}
