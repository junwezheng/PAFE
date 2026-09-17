import type { CSSProperties, ReactNode } from 'react';
import { C, CTA_GRADIENT, SORA } from '../theme';

/** Lettered brand tile — the design uses these rather than real logos. */
export function Mono({
  children,
  size = 38,
  radius = 12,
  fontSize = 14,
  color = C.lilacSoft,
  border = 'rgba(153,69,255,.3)',
  background = 'transparent',
}: {
  children: ReactNode;
  size?: number;
  radius?: number;
  fontSize?: number;
  color?: string;
  border?: string;
  background?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background,
        border: border === 'none' ? undefined : `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: SORA,
        fontWeight: 700,
        fontSize,
        color,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

/** Gradient-filled track. `width` animates from 0 on mount, as in the prototype. */
export function ProgressBar({
  width,
  height = 5,
  gradient = `linear-gradient(90deg,${C.green},${C.purple})`,
  track = 'rgba(255,255,255,.08)',
  duration = 900,
}: {
  width: string;
  height?: number;
  gradient?: string;
  track?: string;
  duration?: number;
}) {
  return (
    <div style={{ height, borderRadius: 99, background: track, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          borderRadius: 99,
          background: gradient,
          width,
          transition: `width ${duration}ms cubic-bezier(.2,.8,.2,1)`,
        }}
      />
    </div>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 17, color: C.white, ...style }}>{children}</div>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: C.muted2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Cta({
  children,
  onClick,
  style,
  fontSize = 15,
  padding = 16,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  fontSize?: number;
  padding?: number;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      style={{
        padding,
        borderRadius: 16,
        background: CTA_GRADIENT,
        textAlign: 'center',
        fontFamily: SORA,
        fontWeight: 600,
        fontSize,
        color: C.bg,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Ghost({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      style={{
        marginTop: 10,
        padding: 14,
        textAlign: 'center',
        fontSize: 13.5,
        fontWeight: 600,
        color: C.gray,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.hairline}`,
        borderRadius: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Label / value row used across the review, redeem and transaction sheets. */
export function KeyValue({
  label,
  value,
  valueColor = C.white,
  labelColor = C.muted2,
  tabular = true,
}: {
  label: string;
  value: ReactNode;
  valueColor?: string;
  labelColor?: string;
  tabular?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, color: labelColor }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: valueColor,
          fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Marks a holding as tokenised pre-IPO equity rather than a listed xStock. */
export function PreIpoBadge() {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '.08em',
        padding: '3px 7px',
        borderRadius: 99,
        background: 'rgba(153,69,255,.16)',
        border: '1px solid rgba(153,69,255,.34)',
        color: C.lilacSoft,
        flexShrink: 0,
      }}
    >
      PRE-IPO
    </span>
  );
}

export const Chevron = ({ color = '#6E6E86' }: { color?: string }) => (
  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 1l6 6-6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
