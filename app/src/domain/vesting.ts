import { DAY_MS, money } from '../lib/format';
import type { Economics, VestingLot } from './types';
import { monthKeyOf } from './types';

/**
 * PAFA's vesting rule, in one place — it's mirrored by the on-chain program in
 * `programs/pafa-vesting/src/lib.rs`, so keep the two in step:
 *
 *  1. Stock earned is escrowed and becomes tradable after `vestingDays`.
 *  2. Spending `monthlySpendTarget` inside a calendar month drops the hold on
 *     every lot earned *in that month* — released immediately, not at month end.
 *  3. The target resets on the 1st. Months you miss keep the full hold.
 *  4. Vesting never gates benefit unlocks: escrowed stock still counts toward
 *     held value, because the lot PDA is owned by the user.
 */

export interface VestingView {
  /** Has this month's spend target been met? */
  waived: boolean;
  /** Progress toward the target, 0-100. */
  progress: number;
  remaining: number;
  monthKey: number;
  monthName: string;
}

export function vestingView(spend: number, econ: Economics, now: number = Date.now()): VestingView {
  const waived = spend >= econ.monthlySpendTarget;
  return {
    waived,
    progress: Math.max(0, Math.min(100, (spend / econ.monthlySpendTarget) * 100)),
    remaining: Math.max(0, econ.monthlySpendTarget - spend),
    monthKey: monthKeyOf(now),
    monthName: new Date(now).toLocaleDateString('en-US', { month: 'long' }),
  };
}

/**
 * When this lot unlocks under the *current* economics.
 *
 * `lot.unlockAt` is the value written on-chain when the lot was created. The
 * countdown is derived from `earnedAt` and the current `vestingDays` instead,
 * so a shorter period cannot leave a ring showing more time remaining than
 * the period itself (which drove progress negative).
 */
export function effectiveUnlockAt(lot: VestingLot, econ: Economics): number {
  return lot.earnedAt + econ.vestingDays * DAY_MS;
}

/** Is this lot claimable right now? */
export function isReleasable(
  lot: VestingLot,
  view: VestingView,
  econ: Economics,
  now: number = Date.now(),
): boolean {
  if (lot.released) return false;
  if (now >= effectiveUnlockAt(lot, econ)) return true;
  return view.waived && lot.monthKey === view.monthKey;
}

/** Ring geometry + countdown copy for one vesting lot. */
export function lotCountdown(lot: VestingLot, econ: Economics, now: number = Date.now()) {
  const total = econ.vestingDays * DAY_MS;
  const remaining = Math.max(0, effectiveUnlockAt(lot, econ) - now);
  const progress = total > 0 ? Math.max(0, Math.min(1, 1 - remaining / total)) : 1;
  const d = Math.floor(remaining / DAY_MS);
  const h = Math.floor((remaining % DAY_MS) / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return {
    progress,
    remaining,
    label: `${d}d ${h}h ${m}m ${s}s until vested`,
  };
}

/** Copy for the "this purchase takes you to X" line on the review screen. */
export function crossingNote(spendAfter: number, econ: Economics, alreadyWaived: boolean, monthName: string): string {
  if (spendAfter >= econ.monthlySpendTarget && !alreadyWaived) {
    return `That clears the ${money(econ.monthlySpendTarget)} monthly target — vesting drops on every stock earned in ${monthName}.`;
  }
  return 'Vesting rules stay as they are.';
}
