/**
 * Palette lifted verbatim from the Claude Design prototype ("PAFA App.dc.html").
 * Solana brand ramp (green -> cyan -> purple) on near-black.
 */
export const C = {
  // Solana ramp
  green: '#00FFA3',
  mint: '#14F195',
  cyan: '#03E1FF',
  purple: '#9945FF',
  lilac: '#C4A6FF',
  lilacSoft: '#D9C7FF',

  // Surfaces
  bg: '#06060B',
  surface: '#0E0E16',
  surfaceDeep: '#0B0B12',
  hairline: 'rgba(255,255,255,.07)',
  hairlineSoft: 'rgba(255,255,255,.05)',

  // Text
  white: '#FFFFFF',
  text: '#F2F2F7',
  text2: '#E8E8F0',
  text3: '#C7C7D6',
  muted: '#A6A6BE',
  muted2: '#8D8DA6',
  gray: '#7E7E96',

  // Status
  amber: '#FFB84D',
  red: '#FF6B8A',
} as const;

/** The primary Solana-ramp CTA gradient used on every filled button. */
export const CTA_GRADIENT = `linear-gradient(120deg,${C.green},${C.cyan} 45%,${C.purple})`;

export const SORA = 'Sora, sans-serif';

/** Shared "filled pill CTA" style. */
export const ctaStyle: React.CSSProperties = {
  borderRadius: 16,
  background: CTA_GRADIENT,
  textAlign: 'center',
  fontFamily: SORA,
  fontWeight: 600,
  color: C.bg,
  cursor: 'pointer',
};

/** Shared "quiet text button" style. */
export const ghostStyle: React.CSSProperties = {
  padding: 14,
  textAlign: 'center',
  fontSize: 13.5,
  fontWeight: 600,
  color: C.gray,
  cursor: 'pointer',
};

/** Card surface used for most list containers. */
export const cardStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.hairline}`,
  borderRadius: 18,
};
