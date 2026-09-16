import { money, pct } from '../lib/format';
import type { Holding } from './types';

/** Unlock thresholds, in USD of that brand's stock held. */
export const TIER_THRESHOLDS = [100, 500, 1000] as const;

export const TIER_NAMES = ['Tier 1 · Holder', 'Tier 2 · Partner', 'Tier 3 · Insider'] as const;

export interface Perk {
  /** Perk title. */
  t: string;
  /** Supporting note. */
  n: string;
}

export interface Tier {
  threshold: number;
  name: string;
  perks: Perk[];
}

/** Brand-specific perk catalogues, straight from the prototype. */
const PERKS: Record<string, Perk[][]> = {
  NKE: [
    [{ t: 'Shareholder pricing', n: '10% off every order, online and in store' }],
    [
      { t: 'Early access to drops', n: '24 hours before general release' },
      { t: 'Free delivery', n: 'No minimum, unlimited' },
    ],
    [
      { t: 'Members-only products', n: 'Shareholder-exclusive colourways' },
      { t: 'Flagship lounge access', n: 'Orchard and Marina Bay stores' },
    ],
  ],
  AAPL: [
    [{ t: 'Shareholder pricing', n: '5% off accessories and services' }],
    [
      { t: 'Early access to launches', n: 'Pre-order window opens first' },
      { t: 'Free delivery', n: 'Next-day, no minimum' },
    ],
    [
      { t: 'Members-only products', n: 'Limited engraving and bundles' },
      { t: 'Priority repair booking', n: 'Same-day Genius slots' },
    ],
  ],
  SBUX: [
    [{ t: 'Shareholder pricing', n: '10% off all drinks' }],
    [
      { t: 'Free drink monthly', n: 'Any size, any customisation' },
      { t: 'Free delivery', n: 'On orders above $12' },
    ],
    [
      { t: 'Members-only roasts', n: 'Reserve bar allocations' },
      { t: 'Reserve lounge access', n: 'Flagship roasteries' },
    ],
  ],
};

const GENERIC_PERKS: Perk[][] = [
  [{ t: 'Shareholder pricing', n: '8% off every purchase' }],
  [
    { t: 'Early access', n: 'New releases before general sale' },
    { t: 'Free delivery', n: 'No minimum spend' },
  ],
  [
    { t: 'Members-only products', n: 'Shareholder-exclusive range' },
    { t: 'Venue access', n: 'Brand events and lounges' },
  ],
];

export function tiersFor(h: Pick<Holding, 'key'>): Tier[] {
  const set = PERKS[h.key] ?? GENERIC_PERKS;
  return TIER_THRESHOLDS.map((threshold, i) => ({
    threshold,
    name: TIER_NAMES[i],
    perks: set[i],
  }));
}

export interface TierState {
  tiers: Tier[];
  /** Index of the highest unlocked tier, or -1. */
  idx: number;
  next: Tier | undefined;
  tierName: string;
  /** Progress toward the next tier, as a CSS width string. */
  pct: string;
  nextNote: string;
  gap: number;
}

/**
 * Unlocks are driven by *held value*, not by spend — and vesting never gates
 * them, so a locked lot still counts toward a tier.
 */
export function tierState(h: Pick<Holding, 'key' | 'value'>): TierState {
  const tiers = tiersFor(h);
  let idx = -1;
  tiers.forEach((x, i) => {
    if (h.value >= x.threshold) idx = i;
  });
  const next = tiers[idx + 1];
  const floor = idx < 0 ? 0 : tiers[idx].threshold;
  const pctVal = next ? ((h.value - floor) / (next.threshold - floor)) * 100 : 100;
  return {
    tiers,
    idx,
    next,
    tierName: idx < 0 ? 'No tier yet' : tiers[idx].name,
    pct: pct(pctVal),
    nextNote: next ? money(next.threshold - h.value) + ' to ' + next.name.split(' · ')[1] : 'Top tier',
    gap: next ? next.threshold - h.value : 0,
  };
}
