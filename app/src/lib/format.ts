/** Formatting helpers ported 1:1 from the prototype's DCLogic. */

export function money(v: number): string {
  return '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function pct(v: number): string {
  return Math.max(0, Math.min(100, v)).toFixed(1) + '%';
}

export function signedPct(v: number): string {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

/** `0.079 NKE` / `18.4 GRAB` — the prototype switches precision above 10 units. */
export function shares(amount: number, ticker: string): string {
  return amount.toFixed(amount > 10 ? 1 : 3) + ' ' + ticker;
}

/** `2d 4h 17m 03s until vested` style countdown pieces. */
export function splitDuration(ms: number) {
  const day = 86_400_000;
  const clamped = Math.max(0, ms);
  return {
    d: Math.floor(clamped / day),
    h: Math.floor((clamped % day) / 3_600_000),
    m: Math.floor((clamped % 3_600_000) / 60_000),
    s: Math.floor((clamped % 60_000) / 1000),
  };
}

export function shortAddress(address: string, lead = 4, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export const DAY_MS = 86_400_000;
